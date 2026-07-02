from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.products.models import Product, Category

User = get_user_model()

class ProductModuleTests(APITestCase):
    def setUp(self):
        # Create users
        self.seller = User.objects.create_user(
            email="seller1@test.com", password="Password123!", role="seller", first_name="S1", last_name="S1"
        )
        self.seller2 = User.objects.create_user(
            email="seller2@test.com", password="Password123!", role="seller", first_name="S2", last_name="S2"
        )
        self.buyer = User.objects.create_user(
            email="buyer1@test.com", password="Password123!", role="buyer", first_name="B1", last_name="B1"
        )

        # Retrieve seeded category (Electronics) and create a new one
        self.category_electronics = Category.objects.get(slug="electronics")
        self.category_books = Category.objects.get(slug="books")

        # Create active and inactive products
        self.product1 = Product.objects.create(
            seller=self.seller,
            title="Smartphone Alpha",
            description="Premium smartphone",
            price="799.99",
            quantity=10,
            is_active=True
        )
        self.product1.categories.add(self.category_electronics)

        self.product2 = Product.objects.create(
            seller=self.seller,
            title="Old Book",
            description="Vintage novel",
            price="15.50",
            quantity=5,
            is_active=False
        )
        self.product2.categories.add(self.category_books)

        # URLs
        self.product_list_url = reverse('product-list')
        self.product_detail_url = lambda pk: reverse('product-detail', args=[pk])
        self.category_list_url = reverse('category-list')

    def get_token(self, user):
        response = self.client.post(reverse('login'), {"email": user.email, "password": "Password123!"})
        return response.data['access']

    def test_category_list_accessible_to_all(self):
        # Anonymous user
        response = self.client.get(self.category_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 4) # Seeds are present

    def test_category_creation_restricted(self):
        category_data = {"name": "Toys", "slug": "toys", "description": "Kids toys"}
        
        # Buyer cannot create
        buyer_token = self.get_token(self.buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.post(self.category_list_url, category_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Seller can create
        seller_token = self.get_token(self.seller)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.post(self.category_list_url, category_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_product_browsing_visibility(self):
        # Anonymous users see only active products
        response = self.client.get(self.product_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only active Smartphone Alpha is shown
        titles = [p['title'] for p in response.data]
        self.assertIn("Smartphone Alpha", titles)
        self.assertNotIn("Old Book", titles)

        # Buyers see only active products
        buyer_token = self.get_token(self.buyer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {buyer_token}')
        response = self.client.get(self.product_list_url)
        titles = [p['title'] for p in response.data]
        self.assertIn("Smartphone Alpha", titles)
        self.assertNotIn("Old Book", titles)

        # Seller sees all their own products, including inactive
        seller_token = self.get_token(self.seller)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')
        response = self.client.get(self.product_list_url)
        titles = [p['title'] for p in response.data]
        self.assertIn("Smartphone Alpha", titles)
        self.assertIn("Old Book", titles)

        # Seller 2 should NOT see Seller 1's inactive product ("Old Book")
        seller2_token = self.get_token(self.seller2)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller2_token}')
        response = self.client.get(self.product_list_url)
        titles = [p['title'] for p in response.data]
        self.assertIn("Smartphone Alpha", titles)
        self.assertNotIn("Old Book", titles)

    def test_product_creation_validation(self):
        seller_token = self.get_token(self.seller)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller_token}')

        # Negative price is invalid
        bad_product_data = {
            "title": "Invalid price product",
            "price": "-10.00",
            "quantity": 10
        }
        response = self.client.post(self.product_list_url, bad_product_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative quantity is invalid
        bad_product_data2 = {
            "title": "Invalid qty product",
            "price": "10.00",
            "quantity": -5
        }
        response = self.client.post(self.product_list_url, bad_product_data2)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_product_modification_ownership(self):
        # Seller 2 attempts to edit Seller 1's product
        seller2_token = self.get_token(self.seller2)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller2_token}')
        
        response = self.client.patch(
            self.product_detail_url(self.product1.id),
            {"title": "Hacked Title"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Seller 1 edits their own product
        seller1_token = self.get_token(self.seller)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {seller1_token}')
        
        response = self.client.patch(
            self.product_detail_url(self.product1.id),
            {"title": "Updated Smartphone Alpha"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Updated Smartphone Alpha")
