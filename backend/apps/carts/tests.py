from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.products.models import Product
from apps.carts.models import Cart, CartItem

User = get_user_model()

class CartModuleTests(APITestCase):
    def setUp(self):
        # Create users
        self.seller = User.objects.create_user(
            email="seller@test.com", password="Password123!", role="seller"
        )
        self.buyer = User.objects.create_user(
            email="buyer@test.com", password="Password123!", role="buyer"
        )

        # Create products
        self.active_product = Product.objects.create(
            seller=self.seller,
            title="Active Product",
            price="10.00",
            quantity=5,
            is_active=True
        )
        self.inactive_product = Product.objects.create(
            seller=self.seller,
            title="Inactive Product",
            price="5.00",
            quantity=10,
            is_active=False
        )

        self.cart_url = reverse('cart-detail')
        self.cart_items_url = reverse('cart-item-list')
        self.cart_clear_url = reverse('cart-clear')

    def get_token(self, user):
        response = self.client.post(reverse('login'), {"email": user.email, "password": "Password123!"})
        return response.data['access']

    def test_view_cart_restricted(self):
        # Unauthenticated cannot view
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Seller cannot view (IsBuyer permission check)
        seller_token = self.get_token(self.seller)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Buyer can view
        buyer_token = self.get_token(self.buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_add_to_cart_validations(self):
        buyer_token = self.get_token(self.buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')

        # 1. Successfully add active product
        response = self.client.post(self.cart_items_url, {
            "product_id": self.active_product.id,
            "quantity": 2
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 2. Add duplicate product (should update quantity and return 200 OK)
        response = self.client.post(self.cart_items_url, {
            "product_id": self.active_product.id,
            "quantity": 2
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Total is now 4
        self.assertEqual(response.data['quantity'], 4)

        # 3. Add exceeding stock quantity -> 400 Bad Request
        response = self.client.post(self.cart_items_url, {
            "product_id": self.active_product.id,
            "quantity": 2  # Total would be 6, but only 5 in stock
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Add inactive product -> should fail with 400 Bad Request
        response = self.client.post(self.cart_items_url, {
            "product_id": self.inactive_product.id,
            "quantity": 1
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clear_cart(self):
        buyer_token = self.get_token(self.buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')

        # Add item first
        self.client.post(self.cart_items_url, {
            "product_id": self.active_product.id,
            "quantity": 1
        })

        # Clear cart
        response = self.client.post(self.cart_clear_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Retrieve cart and check it is empty
        cart_response = self.client.get(self.cart_url)
        self.assertEqual(len(cart_response.data['items']), 0)
