from rest_framework import viewsets, permissions, filters
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from .permissions import IsSellerOwnerOrReadOnly, IsSeller

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsSeller()]

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsSellerOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = Product.objects.all().select_related('seller').prefetch_related('categories')
        
        # Filtering logic
        # 1. Filter by category slug
        category_slug = self.request.query_params.get('category', None)
        if category_slug:
            queryset = queryset.filter(categories__slug=category_slug)
            
        # 2. Filter by search query
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(description__icontains=search)
            
        # 3. Filter by seller (if seller wants to see their own products)
        seller_id = self.request.query_params.get('seller_id', None)
        if seller_id:
            queryset = queryset.filter(seller_id=seller_id)
            
        # 4. Filter by price range
        min_price = self.request.query_params.get('min_price', None)
        if min_price is not None and min_price != '':
            queryset = queryset.filter(price__gte=min_price)
            
        max_price = self.request.query_params.get('max_price', None)
        if max_price is not None and max_price != '':
            queryset = queryset.filter(price__lte=max_price)
            
        # 5. If current user is a buyer or unauthenticated, show only active products.
        # If seller, show active products plus their own products (even if inactive).
        user = self.request.user
        if not user or not user.is_authenticated or user.role == 'buyer':
            queryset = queryset.filter(is_active=True)
        elif user.role == 'seller':
            from django.db.models import Q
            queryset = queryset.filter(Q(is_active=True) | Q(seller=user))
            
        return queryset.distinct()

    def perform_create(self, serializer):
        # Automatically assign the logged-in seller to the product
        serializer.save(seller=self.request.user)
