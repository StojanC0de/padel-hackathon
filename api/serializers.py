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

        # --- NOILE REGULI DE TIMP ---
        now = timezone.now()
        one_month_later = now + timedelta(days=30)

        # 1. Verificăm să nu fie în trecut
        if start_time < now:
            raise serializers.ValidationError(
                {"error": "Nu poți face o rezervare în trecut!"}
            )

        # 2. Verificăm să nu fie peste mai mult de o lună
        if start_time > one_month_later:
            raise serializers.ValidationError(
                {"error": "Rezervările se pot face cu maxim 30 de zile în avans."}
            )
        # -----------------------------

        if court and start_time:
            # 3. Calculăm când se va termina meciul cerut de user
            proposed_end_time = start_time + timedelta(minutes=duration_minutes)

            # 4. Verificăm suprapunerea (Overlap) - Codul tău de până acum
            overlapping_bookings = Booking.objects.filter(
                court=court,
                start_time__lt=proposed_end_time,
                end_time__gt=start_time
            )

            if overlapping_bookings.exists():
                raise serializers.ValidationError(
                    {"error": "Acest teren este deja rezervat în intervalul selectat. Te rugăm să alegi altă oră."}
                )

        return data