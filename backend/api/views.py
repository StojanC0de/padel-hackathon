from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Club, Court, Booking, Profile # <-- VERIFICĂ SĂ FIE PROFILE AICI
from .serializers import ClubSerializer, CourtSerializer, BookingSerializer, ProfileSerializer # <-- ȘI AICI
import stripe
from django.conf import settings

# Aici pui cheia ta secretă de test (copiată din dashboard-ul Stripe)
stripe.api_key = "sk_test_51TDRnaBKsuqpqWPJpSe8bS5PxUuvblL4zvgRXLbuXxejuM4UeJKhBKsQp0xeqJGZpN6PHCi2wUCjx40VJTT9kJv5005gYONd1o"

class ClubViewSet(viewsets.ModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    permission_classes = [AllowAny]

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request, pk=None):
        club = self.get_object()
        if club.manager != request.user:
            return Response({"error": "Acces refuzat!"}, status=403)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        today_bookings = Booking.objects.filter(court__club=club, start_time__range=(today_start, today_end)).order_by('start_time')
        count_today = today_bookings.count()
        revenue_today = today_bookings.aggregate(Sum('court__price_per_hour'))['court__price_per_hour__sum'] or 0
        bookings_data = BookingSerializer(today_bookings, many=True).data
        return Response({"stats": {"count_today": count_today, "revenue_today": revenue_today}, "today_bookings": bookings_data})

class CourtViewSet(viewsets.ModelViewSet):
    queryset = Court.objects.all()
    serializer_class = CourtSerializer
    permission_classes = [AllowAny]

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def create_checkout_session(self, request, pk=None):
        booking = self.get_object()

        # Stripe lucrează cu banii în "bani/cenți" (ex: 100 RON = 10000)
        pret_in_bani = int(booking.court.price_per_hour * 100)

        try:
            # Creăm sesiunea de plată pe serverele Stripe
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': 'ron',
                            'product_data': {
                                'name': f'Rezervare teren Padel - {booking.court.name}',
                            },
                            'unit_amount': pret_in_bani,
                        },
                        'quantity': 1,
                    },
                ],
                mode='payment',
                # URL-urile unde se întoarce userul după ce plătește
                # (Trebuie să fie link-urile de la React-ul lui Erik/Mihai)
                success_url='http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url='http://localhost:3000/cancel',
            )

            # Trimitem link-ul către frontend
            return Response({'checkout_url': checkout_session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        profile = self.request.user.profile
        if not profile.is_manager:
            profile.loyalty_points += 10
            profile.save()

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        user = request.user
        profile = user.profile
        is_owner = (booking.user == user)
        is_manager_of_this_club = (hasattr(user, 'profile') and user.profile.is_manager and booking.court.club.manager == user)
        if is_owner or is_manager_of_this_club:
            if is_owner and not profile.is_manager:
                timp_pana_la_meci = booking.start_time - timezone.now()
                if timp_pana_la_meci < timedelta(hours=48):
                    profile.loyalty_points = max(0, profile.loyalty_points - 15)
                else:
                    profile.loyalty_points = max(0, profile.loyalty_points - 10)
                profile.save()
            self.perform_destroy(booking)
            return Response({"message": "Anulat."}, status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Acces interzis."}, status=status.HTTP_403_FORBIDDEN)

# ACEASTA ESTE CLASA CARE ÎȚI LIPSEA DIN VIEWS:
class ProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user.profile)
        return Response(serializer.data)