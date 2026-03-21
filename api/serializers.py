from rest_framework import serializers
from .models import Club, Court, Booking
from datetime import timedelta
from django.utils import timezone

class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = '__all__'

class CourtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Court
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'
        # Spunem DRF-ului să le calculeze singur, nu le cerem de la React
        read_only_fields = ['user', 'end_time', 'created_at']

    # Aici intervine Bodyguard-ul (funcția automată validate)
    def validate(self, data):
        court = data.get('court')
        start_time = data.get('start_time')
        duration_minutes = data.get('duration_minutes', 60)

        now = timezone.now()

        # REGULA 1: Rămâne - Nu poți rezerva în trecut
        if start_time < now:
            raise serializers.ValidationError(
                {"error": "Nu poți face o rezervare în trecut!"}
            )


        if court and start_time:
            proposed_end_time = start_time + timedelta(minutes=duration_minutes)

            # REGULA 2: Rămâne - Nu se pot suprapune rezervările
            overlapping_bookings = Booking.objects.filter(
                court=court,
                start_time__lt=proposed_end_time,
                end_time__gt=start_time
            )

            if overlapping_bookings.exists():
                raise serializers.ValidationError(
                    {"error": "Acest teren este deja rezervat în intervalul selectat."}
                )

        return data