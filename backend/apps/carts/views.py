from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from apps.products.permissions import IsBuyer
from apps.products.models import Product

from rest_framework import serializers

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(buyer=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        # Only return items belonging to the current user's cart
        cart, _ = Cart.objects.get_or_create(buyer=self.request.user)
        return CartItem.objects.filter(cart=cart).select_related('product')

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(buyer=self.request.user)
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']
        
        # Check if item is already in the cart
        existing_item = CartItem.objects.filter(cart=cart, product=product).first()
        if existing_item:
            # Check combined stock
            new_quantity = existing_item.quantity + quantity
            if product.quantity < new_quantity:
                raise serializers.ValidationError(
                    {"detail": f"Only {product.quantity} units of {product.title} are in stock."}
                )
            existing_item.quantity = new_quantity
            existing_item.save()
            existing_item._created = False
            return existing_item
        else:
            item = serializer.save(cart=cart)
            item._created = True
            return item

    def create(self, request, *args, **kwargs):
        # Override create to handle returns when item already exists
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        res = self.perform_create(serializer)
        
        # If it was an existing item, we updated it, return 200 OK
        # If it's a newly created item, return 201 Created
        is_created = getattr(res, '_created', False)
        status_code = status.HTTP_201_CREATED if is_created else status.HTTP_200_OK
        return Response(CartItemSerializer(res).data, status=status_code)


class CartClearView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def post(self, request):
        cart, _ = Cart.objects.get_or_create(buyer=request.user)
        cart.items.all().delete()
        return Response({"message": "Cart cleared successfully."}, status=status.HTTP_200_OK)
