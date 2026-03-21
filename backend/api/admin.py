from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Profile, Club, Court, Booking

admin.site.register(Profile)
admin.site.register(Club)
admin.site.register(Court)
admin.site.register(Booking)