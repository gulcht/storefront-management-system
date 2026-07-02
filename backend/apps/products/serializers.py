from rest_framework import serializers
from .models import Product, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProductSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        write_only=True,
        source='categories',
        required=False
    )
    categories = CategorySerializer(many=True, read_only=True)
    seller_email = serializers.EmailField(source='seller.email', read_only=True)
    seller_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'seller', 'seller_email', 'seller_name', 'title', 'description',
            'price', 'quantity', 'image', 'is_active', 'categories',
            'category_ids', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'seller', 'created_at', 'updated_at']

    def get_seller_name(self, obj):
        return f"{obj.seller.first_name} {obj.seller.last_name}".strip() or obj.seller.email
