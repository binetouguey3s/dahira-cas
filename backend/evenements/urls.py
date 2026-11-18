from rest_framework.routers import DefaultRouter

from .views import EvenementViewSet, ReservationBusViewSet

router = DefaultRouter()
router.register("evenements", EvenementViewSet, basename="evenement")
router.register("reservations-bus", ReservationBusViewSet, basename="reservation-bus")

urlpatterns = router.urls
