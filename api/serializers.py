from rest_framework import serializers
from .models import Club, Court, Booking
from datetime import timedelta

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
        # Dacă cumva nu primim durata, presupunem 60 de minute
        duration_minutes = data.get('duration_minutes', 60)

        if court and start_time:
            # 1. Calculăm când se va termina meciul cerut de user
            proposed_end_time = start_time + timedelta(minutes=duration_minutes)

            # 2. Căutăm în baza de date dacă există vreo rezervare care se "bate" cu asta
            overlapping_bookings = Booking.objects.filter(
                court=court,
                start_time__lt=proposed_end_time,
                end_time__gt=start_time
            )

            # 3. Dacă am găsit MĂCAR UNA, dăm eroare direct către Frontend!
            if overlapping_bookings.exists():
                raise serializers.ValidationError(
                    {"error": "Acest teren este deja rezervat în intervalul selectat. Te rugăm să alegi altă oră."}
                )

        return data