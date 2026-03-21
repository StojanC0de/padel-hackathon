from rest_framework import serializers
from .models import Club, Court, Booking, Profile
from datetime import timedelta
from django.utils import timezone

# --- 1. Serializer pentru Profil (Adăugat de tine) ---
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'

# --- 2. Serializer pentru Club ---
class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = '__all__'

# --- 3. Serializer pentru Teren ---
class CourtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Court
        fields = '__all__'

# --- 4. Serializer pentru Rezervare (Combinat) ---
class BookingSerializer(serializers.ModelSerializer):
    # Câmpurile tale magice pentru Frontend (Nu le ștergem!)
    court_name = serializers.ReadOnlyField(source='court.name')
    club_name = serializers.ReadOnlyField(source='court.club.name')

    class Meta:
        model = Booking
        # 1. ȘTERGE 'created_at' DE AICI:
        fields = [
            'id', 'user', 'court', 'court_name', 
            'club_name', 'start_time', 'duration_minutes', 'end_time' 
        ]
        # 2. ȘTERGE 'created_at' DE AICI:
        read_only_fields = ['user', 'end_time']

    def validate(self, data):
        court = data.get('court')
        start_time = data.get('start_time')
        # Luăm default 60 (cum au pus colegii), dar folosim valoarea trimisă dacă există
        duration_minutes = data.get('duration_minutes', 60)

        if not start_time or not duration_minutes:
            return data

        now = timezone.now()

        # REGULA 1 (De la colegi): Nu poți face o rezervare în trecut
        if start_time < now:
            raise serializers.ValidationError(
                {"error": "Nu poți face o rezervare în trecut!"}
            )

        # Calculăm când se termină rezervarea nouă
        proposed_end_time = start_time + timedelta(minutes=duration_minutes)

        # REGULA 2 (Combinată): Nu se pot suprapune rezervările pe același teren
        overlapping_bookings = Booking.objects.filter(
            court=court,
            start_time__lt=proposed_end_time,
            end_time__gt=start_time
        )

        # Logica ta de "Update": Dacă edităm o rezervare existentă, o excludem pe ea însăși
        if self.instance:
            overlapping_bookings = overlapping_bookings.exclude(pk=self.instance.pk)

        if overlapping_bookings.exists():
            raise serializers.ValidationError(
                {"error": "Acest interval orar este deja ocupat parțial sau total!"}
            )
        
        return data