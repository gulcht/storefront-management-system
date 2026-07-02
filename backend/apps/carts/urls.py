from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartView, CartItemViewSet, CartClearView

router = DefaultRouter()
router.register(r'items', CartItemViewSet, basename='cart-item')

urlpatterns = [
    path('', CartView.as_view(), name='cart-detail'),
    path('clear/', CartClearView.as_view(), name='cart-clear'),
    path('', include(router.urls)),
]
