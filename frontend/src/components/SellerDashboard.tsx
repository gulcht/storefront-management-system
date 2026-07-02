import { useState, useEffect } from 'react'
import { useProductStore } from '../stores/productStore'
import type { Product } from '../stores/productStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { getProductImageUrl } from '@/lib/utils'

export function SellerDashboard() {
  const { user } = useAuthStore()
  const { products, categories, fetchProducts, fetchCategories, createProduct, updateProduct, deleteProduct, loading } = useProductStore()

  // Form states
  const [isOpen, setIsOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchProducts({ seller_id: String(user.id) })
    }
    fetchCategories()
  }, [user, fetchProducts, fetchCategories])

  const openCreateDialog = () => {
    setEditingProduct(null)
    setTitle('')
    setDescription('')
    setPrice('')
    setQuantity('')
    setSelectedCategories([])
    setImageFile(null)
    setIsOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setTitle(product.title)
    setDescription(product.description)
    setPrice(product.price)
    setQuantity(String(product.quantity))
    setSelectedCategories(product.categories.map((c) => String(c.id)))
    setImageFile(null)
    setIsOpen(true)
  }

  const handleCategoryToggle = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId))
    } else {
      setSelectedCategories([...selectedCategories, catId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('price', price)
    formData.append('quantity', quantity)
    formData.append('is_active', 'true')
    selectedCategories.forEach((catId) => {
      formData.append('category_ids', catId)
    })
    if (imageFile) {
      formData.append('image', imageFile)
    }

    const success = editingProduct
      ? await updateProduct(editingProduct.id, formData)
      : await createProduct(formData)

    if (success) {
      setIsOpen(false)
      if (user?.id) {
        fetchProducts({ seller_id: String(user.id) })
      }
    }
  }

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const openDeleteDialog = (id: number) => {
    setDeleteId(id)
    setIsDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const success = await deleteProduct(deleteId)
    if (success) {
      setIsDeleteOpen(false)
      setDeleteId(null)
      if (user?.id) {
        fetchProducts({ seller_id: String(user.id) })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Listings</h2>
          <p className="text-muted-foreground">Manage, update, and track your active product listings</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button onClick={openCreateDialog} />}>Add Product</DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product Listing' : 'Add New Product'}</DialogTitle>
              <DialogDescription>
                Provide the details of the product. Click save to publish.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Unit Price ($)</Label>
                  <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Available</Label>
                  <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border p-2 rounded-md bg-muted/20">
                  {categories.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={selectedCategories.includes(String(cat.id)) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle(String(cat.id))}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                {/* Image Previews */}
                {imageFile ? (
                  <div className="mt-1 relative w-20 h-20 rounded-md overflow-hidden border">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview new" className="object-cover w-full h-full" />
                  </div>
                ) : editingProduct?.image ? (
                  <div className="mt-1 relative w-20 h-20 rounded-md overflow-hidden border bg-muted flex flex-col justify-end">
                    <img src={getProductImageUrl(editingProduct.image)} alt="Current product" className="object-cover w-full h-full" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white py-0.5 text-center font-medium">Current</span>
                  </div>
                ) : null}
                
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="image"
                    className="inline-flex items-center justify-center rounded-3xl border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition-colors"
                  >
                    {imageFile || editingProduct?.image ? 'Change Image' : 'Upload Image'}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {imageFile ? imageFile.name : editingProduct?.image ? 'Using saved image' : 'No file selected'}
                  </span>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Product'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card/90 shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No listings found. Click "Add Product" to create one.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image ? (
                      <img
                        src={getProductImageUrl(product.image)}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{product.title}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {product.categories.map((c) => (
                        <Badge key={c.id} variant="secondary">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>${parseFloat(product.price).toFixed(2)}</TableCell>
                  <TableCell>
                    {product.quantity > 0 ? (
                      <span className="font-medium text-foreground">{product.quantity} units</span>
                    ) : (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(product)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(product.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Delete Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
