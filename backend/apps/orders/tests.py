from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.products.models import Product, Category
from apps.carts.models import Cart, CartItem
from apps.orders.models import Order, OrderItem

User = get_user_model()

class StoreFrontWorkflowTests(APITestCase):

    def setUp(self):
        # 1. Create a seller and a buyer
        self.seller_data = {
            "email": "seller@test.com",
            "password": "Password123!",
            "role": "seller",
            "first_name": "John",
            "last_name": "Seller"
        }
        self.buyer_data = {
            "email": "buyer@test.com",
            "password": "Password123!",
            "role": "buyer",
            "first_name": "Jane",
            "last_name": "Buyer"
        }
        
        # Register seller
        response = self.client.post(reverse('register'), self.seller_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.seller_user = User.objects.get(email=self.seller_data['email'])

        # Register buyer
        response = self.client.post(reverse('register'), self.buyer_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.buyer_user = User.objects.get(email=self.buyer_data['email'])
        
        # Create a category
        self.category, _ = Category.objects.get_or_create(name="Electronics", slug="electronics")

    def get_tokens(self, email, password):
        response = self.client.post(reverse('login'), {"email": email, "password": password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access'], response.data['refresh']

    def test_full_workflow(self):
        # Obtain tokens
        seller_token, _ = self.get_tokens(self.seller_data['email'], self.seller_data['password'])
        buyer_token, _ = self.get_tokens(self.buyer_data['email'], self.buyer_data['password'])

        # -------------------------------------------------------------
        # 1. Seller Product Creation (Role-based access check)
        # -------------------------------------------------------------
        product_data = {
            "title": "Smartphone X",
            "description": "High-end smartphone",
            "price": "999.99",
            "quantity": 10,
            "category_ids": [str(self.category.id)],
            "is_active": True
        }

        # Buyer attempts to create product -> should fail (403 Forbidden)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.post(reverse('product-list'), product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Seller creates product -> should succeed
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.post(reverse('product-list'), product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product_id = response.data['id']

        # -------------------------------------------------------------
        # 2. Buyer Browsing
        # -------------------------------------------------------------
        # Buyer requests product list -> should succeed
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.get(reverse('product-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Smartphone X")

        # -------------------------------------------------------------
        # 3. Cart Management & Quantity Validation
        # -------------------------------------------------------------
        # Seller attempts to add to cart -> should fail (403 Forbidden since seller is not buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.post(reverse('cart-item-list'), {"product_id": product_id, "quantity": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Buyer adds to cart -> should succeed
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.post(reverse('cart-item-list'), {"product_id": product_id, "quantity": 3}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Buyer attempts to add quantity exceeding stock -> should fail (400 Bad Request)
        response = self.client.post(reverse('cart-item-list'), {"product_id": product_id, "quantity": 10}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # -------------------------------------------------------------
        # 4. Checkout and Stock Decrement (Atomic transaction check)
        # -------------------------------------------------------------
        # Checkout the cart -> should succeed
        response = self.client.post(reverse('order-list'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'completed')
        self.assertAlmostEqual(float(response.data['total_price']), 3 * 999.99, places=2)

        # Verify stock decremented (10 - 3 = 7)
        product = Product.objects.get(id=product_id)
        self.assertEqual(product.quantity, 7)

        # Verify cart is empty
        response = self.client.get(reverse('cart-detail'))
        self.assertEqual(len(response.data['items']), 0)

        # -------------------------------------------------------------
        # 5. Added tests for bug fixes
        # -------------------------------------------------------------
        # Create a second product
        product_data_2 = {
            "title": "Tablet Y",
            "description": "High-end tablet",
            "price": "499.99",
            "quantity": 5,
            "category_ids": [str(self.category.id)],
            "is_active": True
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.post(reverse('product-list'), product_data_2, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product_id_2 = response.data['id']

        # A. CartItemViewSet.create() status code logic (201 for new, 200 for update/duplicate)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        
        # 201 Created on first addition
        response = self.client.post(reverse('cart-item-list'), {"product_id": product_id_2, "quantity": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 200 OK on second addition of the same product
        response = self.client.post(reverse('cart-item-list'), {"product_id": product_id_2, "quantity": 2}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # B. Inactive products blocked on cart-add
        # Set product_2 to inactive
        Product.objects.filter(id=product_id_2).update(is_active=False)
        product_2 = Product.objects.get(id=product_id_2)
        self.assertFalse(product_2.is_active)
        
        # Attempt to add inactive product to cart -> should fail with 400 Bad Request
        # Create another inactive product to test adding a brand new inactive item
        product_data_inactive = {
            "title": "Inactive Laptop",
            "description": "Broken laptop",
            "price": "100.00",
            "quantity": 5,
            "category_ids": [str(self.category.id)],
            "is_active": False
        }
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.post(reverse('product-list'), product_data_inactive, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        inactive_product_id = response.data['id']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.post(reverse('cart-item-list'), {"product_id": inactive_product_id, "quantity": 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # C. Price-range filtering
        # Create a product with price 150
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        self.client.post(reverse('product-list'), {
            "title": "Budget phone",
            "description": "Cheap phone",
            "price": "150.00",
            "quantity": 10,
            "category_ids": [str(self.category.id)],
            "is_active": True
        }, format='json')

        # Buyer filters by price range
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        
        # Query with min_price=100 and max_price=500 -> should return only the Budget phone (150.00) (Smartphone X is 999.99, Tablet Y is inactive)
        response = self.client.get(reverse('product-list') + "?min_price=100&max_price=500")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Budget phone")

        # Query with min_price=600 -> should return Smartphone X (999.99)
        response = self.client.get(reverse('product-list') + "?min_price=600")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Smartphone X")
