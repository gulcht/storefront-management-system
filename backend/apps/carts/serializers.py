from rest_framework import serializers
from .models import Cart, CartItem
from apps.products.serializers import ProductSerializer
from apps.products.models import Product

class CartItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        write_only=True,
        source='product'
    )
    product = ProductSerializer(read_only=True)
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product_id', 'product', 'quantity', 'item_total']

    def get_item_total(self, obj):
        return obj.quantity * obj.product.price

    def validate(self, data):
        product = data.get('product') or (self.instance.product if self.instance else None)
        quantity = data.get('quantity')
        
        if product:
            if not product.is_active:
                raise serializers.ValidationError(
                    "Cannot add or update inactive product in cart."
                )
            
            # Check stock availability
            if quantity is not None and product.quantity < quantity:
                raise serializers.ValidationError(
                    f"Only {product.quantity} units of {product.title} are available in stock."
                )
        return data

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'buyer', 'items', 'total_price', 'created_at', 'updated_at']
        read_only_fields = ['id', 'buyer', 'created_at', 'updated_at']

    def get_total_price(self, obj):
        return sum(item.quantity * item.product.price for item in obj.items.all())
