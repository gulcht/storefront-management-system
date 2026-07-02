from django.db import migrations

def seed_categories(apps, schema_editor):
    Category = apps.get_model('products', 'Category')
    categories = [
        {'name': 'Electronics', 'slug': 'electronics', 'description': 'Electronic devices and gadgets'},
        {'name': 'Clothing', 'slug': 'clothing', 'description': 'Clothes and fashion items'},
        {'name': 'Books', 'slug': 'books', 'description': 'Physical and digital books'},
        {'name': 'Home & Garden', 'slug': 'home-garden', 'description': 'Home decor and garden supplies'}
    ]
    for cat in categories:
        Category.objects.get_or_create(name=cat['name'], defaults=cat)

def remove_categories(apps, schema_editor):
    Category = apps.get_model('products', 'Category')
    slugs = ['electronics', 'clothing', 'books', 'home-garden']
    Category.objects.filter(slug__in=slugs).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_code=remove_categories),
    ]
