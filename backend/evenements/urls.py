from rest_framework.routers import DefaultRouter

from .views import (
    EvenementViewSet,
    PaiementBusViewSet,
    PassagerBusViewSet,
    ReservationBusViewSet,
    ResponsableBusViewSet,
)

router = DefaultRouter()
router.register("evenements", EvenementViewSet, basename="evenement")
router.register("reservations-bus", ReservationBusViewSet, basename="reservation-bus")
router.register("paiements-bus", PaiementBusViewSet, basename="paiement-bus")
router.register("passagers-bus", PassagerBusViewSet, basename="passager-bus")
router.register("responsables-bus", ResponsableBusViewSet, basename="responsable-bus")

urlpatterns = router.urls
