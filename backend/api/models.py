from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import timedelta
from django.utils import timezone # Important pentru calculele de timp

# --- 1. PROFIL UTILIZATOR (Puncte loialitate + Manager status) ---
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=15, blank=True)
    loyalty_points = models.IntegerField(default=0)
    # Status de manager pentru a vedea cine deține clubul
    is_manager = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {'Manager' if self.is_manager else 'Jucător'}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, email=instance.email)

# --- 2. CLUBUL (Design-ul tău + Logica de deținător a colegilor) ---
class Club(models.Model):
    # Legăm clubul de un manager (colegii au vrut asta)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_clubs')
    
    name = models.CharField(max_length=200)
    address = models.TextField()
    
    # Câmpurile tale pentru Frontend (NU le ștergem!)
    city = models.CharField(max_length=50, default="București") 
    description = models.TextField(blank=True)
    rating = models.FloatField(default=0.0)
    average_price = models.IntegerField(default=100)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    
    def __str__(self):
        return self.name

# --- 3. TERENUL ---
class Court(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='courts')
    name = models.CharField(max_length=100)
    price_per_hour = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.club.name} - {self.name}"

# --- 4. REZERVAREA (Calcul automat de final de sesiune) ---
class Booking(models.Model):
    DURATION_CHOICES = [(60, '1 Oră'), (90, '1.5 Ore'), (120, '2 Ore')]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    court = models.ForeignKey(Court, on_delete=models.CASCADE)
    
    # Folosim timezone.now ca default (din codul colegilor)
    start_time = models.DateTimeField(default=timezone.now)
    duration_minutes = models.IntegerField(choices=DURATION_CHOICES, default=60)
    end_time = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        # Calculează automat ora de final în funcție de durată
        if self.start_time and self.duration_minutes:
            self.end_time = self.start_time + timedelta(minutes=self.duration_minutes)
        super().save(*args, **kwargs)

    def __str__(self):
        local_time = timezone.localtime(self.start_time)
        return f"{self.user.username} la {self.court.name} ({local_time.strftime('%H:%M')})"