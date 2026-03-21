from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClubViewSet, CourtViewSet, BookingViewSet
from .views import ClubViewSet, CourtViewSet, BookingViewSet, ProfileViewSet # <-- Adaugă-l aici la final

# Routerul construiește automat link-urile pentru noi
router = DefaultRouter()
router.register(r'clubs', ClubViewSet)
router.register(r'courts', CourtViewSet)
router.register(r'bookings', BookingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

router.register(r'profiles', ProfileViewSet, basename='profile')