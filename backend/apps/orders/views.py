from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db import transaction
from .models import Order, OrderItem
from .serializers import OrderSerializer
from apps.carts.models import Cart, CartItem
from apps.products.models import Product
from apps.products.permissions import IsBuyer

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        # Buyers can only view their own orders
        return Order.objects.filter(buyer=self.request.user).prefetch_related('items__product')

    def create(self, request, *args, **kwargs):
        # Checkout logic: convert cart items into an order
        buyer = request.user
        cart, _ = Cart.objects.get_or_create(buyer=buyer)
        cart_items = cart.items.select_related('product').all()

        if not cart_items.exists():
            return Response(
                {"detail": "Your cart is empty. Add items to cart before checking out."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # 1. Lock the cart to prevent concurrent checkouts/updates for this buyer
                cart = Cart.objects.select_for_update().get(id=cart.id)
                cart_items = cart.items.select_related('product').all()

                if not cart_items.exists():
                    raise ValueError("Your cart is empty. Add items to cart before checking out.")

                # 2. Create order instance
                order = Order.objects.create(
                    buyer=buyer,
                    status='completed',
                    total_price=0.0
                )
                
                total_price = 0
                
                # 3. Process each cart item
                for item in cart_items:
                    # Retrieve product with select_for_update to lock the row and prevent race conditions
                    product = Product.objects.select_for_update().get(id=item.product_id)
                    
                    # Double-check product active status
                    if not product.is_active:
                        raise ValueError(f"Product '{product.title}' is no longer active and cannot be purchased.")
                    
                    # Double-check stock availability
                    if product.quantity < item.quantity:
                        raise ValueError(
                            f"Insufficient stock for '{product.title}'. "
                            f"Requested: {item.quantity}, Available: {product.quantity}."
                        )
                    
                    # Deduct product inventory
                    product.quantity -= item.quantity
                    product.save()
                    
                    # Create order item
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item.quantity,
                        price_at_purchase=product.price
                    )
                    
                    total_price += product.price * item.quantity

                # 4. Update total order price
                order.total_price = total_price
                order.save()
                
                # 5. Clear the buyer's cart
                cart_items.delete()
                
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": "An error occurred during checkout. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
