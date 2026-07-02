from rest_framework import permissions

class IsSeller(permissions.BasePermission):
    """
    Allows access only to users with the 'seller' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'seller')

class IsSellerOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow sellers of an object to edit or delete it.
    Buyers can only read/retrieve.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.role == 'seller')

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the seller of the product.
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'seller' and 
            obj.seller == request.user
        )


class IsBuyer(permissions.BasePermission):
    """
    Allows access only to users with the 'buyer' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'buyer')
