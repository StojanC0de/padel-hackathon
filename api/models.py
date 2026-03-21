from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import timedelta
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=15, blank=True)
    loyalty_points = models.IntegerField(default=0)

    # NOU: Ne ajută să facem diferența rapid pe Frontend între un jucător și un manager
    is_manager = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {'Manager' if self.is_manager else 'Player'}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, email=instance.email)


class Club(models.Model):
    # NOU: Legăm clubul de un User (Manager).
    # null=True, blank=True previne erorile pentru cluburile deja existente în baza ta de date.
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_clubs')

    name = models.CharField(max_length=200)
    address = models.TextField()
    description = models.TextField(blank=True)
    rating = models.FloatField(default=0.0)

    def __str__(self):
        return self.name


class Court(models.Model):
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='courts')
    name = models.CharField(max_length=100)
    price_per_hour = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.club.name} - {self.name}"


class Booking(models.Model):
    DURATION_CHOICES = [(60, '1 Oră'), (90, '1.5 Ore'), (120, '2 Ore')]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    court = models.ForeignKey(Court, on_delete=models.CASCADE)
    start_time = models.DateTimeField(default=timezone.now)
    duration_minutes = models.IntegerField(choices=DURATION_CHOICES, default=60)
    end_time = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.start_time and self.duration_minutes:
            self.end_time = self.start_time + timedelta(minutes=self.duration_minutes)
        super().save(*args, **kwargs)