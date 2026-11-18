from rest_framework.routers import DefaultRouter

from .views import ContenuMediaViewSet

router = DefaultRouter()
router.register("contenus", ContenuMediaViewSet, basename="contenu-media")

urlpatterns = router.urls
