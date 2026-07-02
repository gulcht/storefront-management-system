from django.contrib import admin
from .models import Category, Product

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'seller', 'price', 'quantity', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'categories')
    search_fields = ('title', 'description', 'seller__email')
    filter_horizontal = ('categories',)
