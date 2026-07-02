import { useState, useEffect } from 'react'
import { useProductStore } from '../stores/productStore'
import { useCartStore } from '../stores/cartStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, ShoppingCart, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { getProductImageUrl } from '@/lib/utils'

export function BuyerMarketplace() {
  const { products, categories, fetchProducts, fetchCategories } = useProductStore()
  const { addToCart } = useCartStore()

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // Add quantity limits per product
  const [quantities, setQuantities] = useState<Record<number, number>>({})

  const applyFilters = () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (category !== 'all') params.category = category
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    fetchProducts(params)
  }

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    applyFilters()

  }, [category, minPrice, maxPrice])


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const handleQuantityChange = (productId: number, val: number, stock: number) => {
    const q = Math.max(1, Math.min(stock, val))
    setQuantities({ ...quantities, [productId]: q })
  }

  const handleAddToCart = async (productId: number) => {
    const qty = quantities[productId] || 1
    const success = await addToCart(productId, qty)
    if (success) {
      toast.success('Product added to cart successfully!')
      setQuantities({ ...quantities, [productId]: 1 })
    }
  }

  const handleSelectCategory = (val: string | null) => {
    if (val) setCategory(val)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketplace</h2>
          <p className="text-muted-foreground">Browse high-quality products uploaded by our verified sellers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by title or description..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={handleSelectCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Categories">
                {category === 'all'
                  ? 'All Categories'
                  : categories.find((c) => c.slug === category)?.name || category}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <Button type="submit" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Product List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No products found matching your search.
          </div>
        ) : (
          products.map((product) => {
            const stock = product.quantity
            const cartQty = quantities[product.id] || 1
            return (
              <Card key={product.id} className="flex flex-col h-full hover:shadow-lg transition-shadow border border-border/40 overflow-hidden bg-card/95">
                <div className="aspect-video relative overflow-hidden bg-muted flex items-center justify-center border-b">
                  {product.image ? (
                    <img
                      src={getProductImageUrl(product.image)}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm font-medium">No Image Available</div>
                  )}
                </div>
                <CardHeader className="p-4 flex-1">
                  <div className="flex gap-1 flex-wrap mb-2">
                    {product.categories.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                  <CardTitle className="text-lg line-clamp-1">{product.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs mt-1">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-2 pt-0 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-muted-foreground block">Seller: {product.seller.username}</span>
                    <span className="text-xl font-bold text-foreground">
                      ${parseFloat(product.price).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    {stock > 0 ? (
                      <Badge variant="outline" className="border-green-600/30 text-green-700 bg-green-50/50 dark:bg-green-950/20 dark:text-green-400">
                        {stock} in stock
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-2 border-t bg-muted/10 flex gap-2 items-center">
                  {stock > 0 ? (
                    <>
                      <Input
                        type="number"
                        min="1"
                        max={stock}
                        value={cartQty}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1, stock)}
                        className="w-16 h-9 text-center p-1"
                      />
                      <Button
                        onClick={() => handleAddToCart(product.id)}
                        className="flex-1 h-9 gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" /> Add to Cart
                      </Button>
                    </>
                  ) : (
                    <Button disabled className="w-full h-9">
                      Out of Stock
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
