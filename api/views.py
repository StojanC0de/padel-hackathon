from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny # <-- Importăm permisiunile
from .models import Club, Court, Booking
from .serializers import ClubSerializer, CourtSerializer, BookingSerializer


class ClubViewSet(viewsets.ModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    permission_classes = [AllowAny] # Oricine poate vedea cluburile

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

        # --- LOGICA PENTRU ECRANUL PLAYTOMIC ---
        # Verificăm dacă Frontend-ul ne cere rezervările pentru un anumit club într-o anumită zi
        club_id = self.request.query_params.get('club_id')
        date = self.request.query_params.get('date')

        if club_id and date:
            # Îi dăm lui Mihai doar rezervările de la clubul X din ziua Y
            # Așa el știe ce butoane să facă roșii/indisponibile
            return queryset.filter(court__club_id=club_id, start_time__date=date)

        # --- LOGICA PENTRU ISTORIC (Manager vs Jucător) ---
        # Dacă userul e Manager, vede toate rezervările făcute de clienți la clubul lui
        if hasattr(user, 'profile') and user.profile.is_manager:
            return queryset.filter(court__club__manager=user).order_by('-start_time')

        # Dacă e Jucător normal, vede doar pe unde s-a dus el să joace
        return queryset.filter(user=user).order_by('-start_time')

    # Când cineva dă click pe "Rezervă", salvăm automat cine a dat click
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)