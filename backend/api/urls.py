from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClubViewSet, CourtViewSet, BookingViewSet, register_user, register_manager, CustomAuthToken

router = DefaultRouter()
router.register(r'clubs', ClubViewSet)
router.register(r'courts', CourtViewSet)
router.register(r'bookings', BookingViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', register_user),
    path('register-manager/', register_manager),
    path('login/', CustomAuthToken.as_view()), # <--- REPARAT
]