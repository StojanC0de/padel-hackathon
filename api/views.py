from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny # <-- Importăm permisiunile
from .models import Club, Court, Booking
from .serializers import ClubSerializer, CourtSerializer, BookingSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from django.utils import timezone
from datetime import datetime
from datetime import timedelta

class ClubViewSet(viewsets.ModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    permission_classes = [AllowAny] # Oricine poate vedea cluburile

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request, pk=None):
        club = self.get_object()

        # Securitate: Doar managerul acestui club are voie aici
        if club.manager != request.user:
            return Response({"error": "Acces refuzat!"}, status=403)

        # 1. Luăm data de azi (începutul și sfârșitul zilei)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        # 2. Toate rezervările de AZI (ca să vadă cine vine la club)
        today_bookings = Booking.objects.filter(
            court__club=club,
            start_time__range=(today_start, today_end)
        ).order_by('start_time')
        # 3. Statistici rapide
        # Număr rezervări azi
        count_today = today_bookings.count()

        # Banii încasați azi (Suma prețurilor de la terenurile rezervate azi)
        revenue_today = today_bookings.aggregate(Sum('court__price_per_hour'))['court__price_per_hour__sum'] or 0

        # Pregătim datele pentru Mihai (Serializăm rezervările manual aici)
        bookings_data = BookingSerializer(today_bookings, many=True).data

        return Response({
            "stats": {
                "count_today": count_today,
                "revenue_today": revenue_today,
            },
            "today_bookings": bookings_data
        })

class CourtViewSet(viewsets.ModelViewSet):
    queryset = Court.objects.all()
    serializer_class = CourtSerializer
    permission_classes = [AllowAny] # Oricine poate vedea terenurile


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.all()
        club_id = self.request.query_params.get('club_id')
        date = self.request.query_params.get('date')

        if club_id and date:
            return queryset.filter(court__club_id=club_id, start_time__date=date)

        if hasattr(user, 'profile') and user.profile.is_manager:
            return queryset.filter(court__club__manager=user).order_by('-start_time')

        return queryset.filter(user=user).order_by('-start_time')

    # 1. Funcția de creare + Logică puncte
    def perform_create(self, serializer):
        booking = serializer.save(user=self.request.user)
        profile = self.request.user.profile

        if not profile.is_manager:
            puncte_primite = 10  # Standard

            # BONUS: Early Booking (peste 7 zile în viitor)
            if booking.start_time > timezone.now() + timedelta(days=7):
                puncte_primite += 5

            profile.loyalty_points += puncte_primite
            profile.save()

    # 2. Funcția de anulare (Corectată și aliniată)
    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        user = request.user
        profile = user.profile

        # Definim cine are voie să anuleze
        is_owner = (booking.user == user)
        is_manager_of_this_club = (
                hasattr(user, 'profile') and
                user.profile.is_manager and
                booking.court.club.manager == user
        )

        # Verificăm permisiunea
        if is_owner or is_manager_of_this_club:
            # LOGICA DE PUNCTE (doar dacă jucătorul anulează, nu managerul)
            if is_owner and not profile.is_manager:
                timp_pana_la_meci = booking.start_time - timezone.now()

                if timp_pana_la_meci < timedelta(hours=48):
                    # Penalizare pentru anulare târzie (< 48h)
                    profile.loyalty_points = max(0, profile.loyalty_points - 15)
                else:
                    # Anulare din timp (îi luăm doar cele 10 puncte primite inițial)
                    profile.loyalty_points = max(0, profile.loyalty_points - 10)

                profile.save()

            self.perform_destroy(booking)
            return Response({"message": "Anulat conform politicii de loyalty."}, status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": "Nu ai permisiunea să anulezi această rezervare."},
            status=status.HTTP_403_FORBIDDEN
        )