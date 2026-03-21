from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Club, Court, Booking, Profile
from .serializers import ClubSerializer, CourtSerializer, BookingSerializer

# --- LOGIN PERSONALIZAT (Al tău - Trimite is_manager la Frontend) ---
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        is_manager = False
        if hasattr(user, 'profile'):
            is_manager = user.profile.is_manager

        return Response({
            'token': token.key,
            'is_manager': is_manager,
            'username': user.username
        })

# --- 1. VIEWSET CLUBURI (Combinat) ---
class ClubViewSet(viewsets.ModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    
    def get_permissions(self):
        # Oricine vede cluburile, dar doar cei logați interacționează
        if self.action in ['list', 'retrieve', 'dashboard']:
            # Lăsăm dashboard să fie accesat de useri autentificați (verificăm intern dacă e manager)
            if self.action == 'dashboard':
                return [IsAuthenticated()]
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Doar managerii pot crea cluburi (Logica ta)
        if hasattr(self.request.user, 'profile') and self.request.user.profile.is_manager:
            serializer.save(manager=self.request.user)
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Doar managerii pot crea cluburi!")

    # Funcția de Dashboard (A colegilor)
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request, pk=None):
        club = self.get_object()

        # Securitate: Doar managerul acestui club are voie aici
        if club.manager != request.user:
            return Response({"error": "Acces refuzat!"}, status=status.HTTP_403_FORBIDDEN)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        today_bookings = Booking.objects.filter(
            court__club=club,
            start_time__range=(today_start, today_end)
        ).order_by('start_time')
        
        count_today = today_bookings.count()
        revenue_today = today_bookings.aggregate(Sum('court__price_per_hour'))['court__price_per_hour__sum'] or 0

        bookings_data = BookingSerializer(today_bookings, many=True).data

        return Response({
            "stats": {
                "count_today": count_today,
                "revenue_today": revenue_today,
            },
            "today_bookings": bookings_data
        })

# --- 2. VIEWSET TERENURI (Al tău) ---
class CourtViewSet(viewsets.ModelViewSet):
    queryset = Court.objects.all()
    serializer_class = CourtSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

# --- 3. VIEWSET REZERVĂRI (Combinat) ---
class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Logica ta de filtrare
        user = self.request.user
        if user.is_anonymous:
            return Booking.objects.none()

        club_id = self.request.query_params.get('club_id')
        date = self.request.query_params.get('date')
        
        if club_id and date:
            return Booking.objects.filter(court__club_id=club_id, start_time__date=date)

        if hasattr(user, 'profile') and user.profile.is_manager:
            return Booking.objects.filter(court__club__manager=user).order_by('-start_time')

        return Booking.objects.filter(user=user).order_by('-start_time')

    # Creare cu Logica de Puncte (De la colegi)
    def perform_create(self, serializer):
        # 1. Salvează rezervarea în baza de date (Asta mergea și înainte)
        serializer.save(user=self.request.user)
        
        # 2. Logica de puncte pusă într-un bloc try-except sau cu hasattr
        user = self.request.user
        
        # Verificăm dacă userul are măcar profil înainte să-i dăm puncte
        if hasattr(user, 'profile'):
            profile = user.profile
            # Dacă nu e manager, îi dăm punctele de loialitate
            if not profile.is_manager:
                profile.loyalty_points += 10
                profile.save()
        else:
            # Dacă nu are profil, ignorăm și mergem mai departe
            # (Nu va mai da crash și nu va mai trimite eroare 500 către React)
            pass

    # Anulare cu Logica de Puncte și Permisiuni (De la colegi)
    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        user = request.user
        profile = user.profile

        is_owner = (booking.user == user)
        is_manager_of_this_club = (
            hasattr(user, 'profile') and
            user.profile.is_manager and
            booking.court.club.manager == user
        )

        if is_owner or is_manager_of_this_club:
            if is_owner and not profile.is_manager:
                timp_pana_la_meci = booking.start_time - timezone.now()

                if timp_pana_la_meci < timedelta(hours=48):
                    profile.loyalty_points = max(0, profile.loyalty_points - 15)
                else:
                    profile.loyalty_points = max(0, profile.loyalty_points - 10)
                profile.save()

            self.perform_destroy(booking)
            return Response({"message": "Anulat cu succes!"}, status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": "Nu ai permisiunea să anulezi această rezervare."},
            status=status.HTTP_403_FORBIDDEN
        )

# --- 4. FUNCȚII DE ÎNREGISTRARE (Ale tale - Frontend dependent) ---
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'Date incomplete'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Utilizatorul există deja'}, status=400)
    
    user = User.objects.create_user(username=username, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'is_manager': False}, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_manager(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Utilizatorul există deja'}, status=400)
    
    user = User.objects.create_user(username=username, password=password)
    
    profile = user.profile 
    profile.is_manager = True
    profile.save()
    
    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key, 
        'is_manager': True,
        'username': user.username
    }, status=201)