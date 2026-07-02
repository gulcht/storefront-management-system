from rest_framework import serializers
from .models import Order, OrderItem
from apps.products.serializers import ProductSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'price_at_purchase', 'item_total']

    def get_item_total(self, obj):
        return obj.quantity * obj.price_at_purchase

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'buyer', 'status', 'total_price', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'buyer', 'status', 'total_price', 'created_at', 'updated_at']
