from django.contrib import admin
from .models import Club, Court, Booking, Profile

# Înregistrăm modelele simplu, fără coloane specifice momentan
admin.site.register(Club)
admin.site.register(Court)
admin.site.register(Booking)
admin.site.register(Profile)