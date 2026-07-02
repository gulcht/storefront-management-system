from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.carts.models import Cart

User = get_user_model()

class UserAuthenticationTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.profile_url = reverse('profile')

        self.valid_buyer_data = {
            "email": "buyer@test.com",
            "password": "Password123!",
            "role": "buyer",
            "first_name": "Jane",
            "last_name": "Buyer"
        }
        self.valid_seller_data = {
            "email": "seller@test.com",
            "password": "Password123!",
            "role": "seller",
            "first_name": "John",
            "last_name": "Seller"
        }

    def test_register_buyer_creates_cart(self):
        response = self.client.post(self.register_url, self.valid_buyer_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], "User registered successfully.")
        
        user = User.objects.get(email=self.valid_buyer_data['email'])
        self.assertEqual(user.role, 'buyer')
        
        # Verify cart was automatically created
        cart_exists = Cart.objects.filter(buyer=user).exists()
        self.assertTrue(cart_exists)

    def test_register_seller_does_not_create_cart(self):
        response = self.client.post(self.register_url, self.valid_seller_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        user = User.objects.get(email=self.valid_seller_data['email'])
        self.assertEqual(user.role, 'seller')
        
        # Verify no cart is created for seller
        cart_exists = Cart.objects.filter(buyer=user).exists()
        self.assertFalse(cart_exists)

    def test_register_missing_fields(self):
        invalid_data = {
            "email": "buyer_bad@test.com"
            # Missing password
        }
        response = self.client.post(self.register_url, invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        # Register user first
        self.client.post(self.register_url, self.valid_buyer_data)
        
        # Attempt login
        login_data = {
            "email": self.valid_buyer_data['email'],
            "password": self.valid_buyer_data['password']
        }
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], self.valid_buyer_data['email'])

    def test_login_invalid_credentials(self):
        self.client.post(self.register_url, self.valid_buyer_data)
        
        login_data = {
            "email": self.valid_buyer_data['email'],
            "password": "WrongPassword!"
        }
        response = self.client.post(self.login_url, login_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        self.client.post(self.register_url, self.valid_buyer_data)
        login_data = {
            "email": self.valid_buyer_data['email'],
            "password": self.valid_buyer_data['password']
        }
        login_response = self.client.post(self.login_url, login_data)
        token = login_response.data['access']
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.valid_buyer_data['email'])
