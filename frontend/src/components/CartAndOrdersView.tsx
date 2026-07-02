import { useEffect } from 'react'
import { useCartStore } from '../stores/cartStore'
import { useOrderStore } from '../stores/orderStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { getProductImageUrl } from '@/lib/utils'

interface CartAndOrdersViewProps {
  onNavigateToMarketplace: () => void
}

export function CartAndOrdersView({ onNavigateToMarketplace }: CartAndOrdersViewProps) {
  const { cart, fetchCart, updateQuantity, removeFromCart, clearCart, loading: cartLoading } = useCartStore()
  const { orders, fetchOrders, placeOrder, loading: orderLoading } = useOrderStore()

  useEffect(() => {
    fetchCart()
    fetchOrders()
  }, [fetchCart, fetchOrders])

  const handleQtyChange = async (itemId: number, quantity: number, maxStock: number) => {
    if (quantity < 1) return
    if (quantity > maxStock) {
      toast.warning(`Only ${maxStock} items available in stock.`)
      return
    }
    await updateQuantity(itemId, quantity)
  }

  const handleCheckout = async () => {
    if (!cart?.items.length) return
    const success = await placeOrder()
    if (success) {
      toast.success('Order placed successfully!')
      fetchCart()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart details */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Shopping Cart</h2>
          <p className="text-muted-foreground">Manage products added to your cart</p>
        </div>

        <div className="border rounded-lg bg-card/90 shadow-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!cart?.items || cart.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Your cart is empty.{' '}
                    <button onClick={onNavigateToMarketplace} className="underline hover:text-foreground font-semibold">
                      Go shopping
                    </button>
                  </TableCell>
                </TableRow>
              ) : (
                cart.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.product.image ? (
                          <img
                            src={getProductImageUrl(item.product.image)}
                            alt={item.product.title}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs">
                            No image
                          </div>
                        )}
                        <div>
                          <span className="font-semibold block">{item.product.title}</span>
                          <span className="text-xs text-muted-foreground">Seller: {item.product.seller.username}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${parseFloat(item.product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max={item.product.quantity}
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1, item.product.quantity)}
                        className="w-16 h-8 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {cart?.items && cart.items.length > 0 && (
          <div className="flex justify-between items-center bg-card p-4 border rounded-lg shadow-sm">
            <Button variant="outline" onClick={clearCart} disabled={cartLoading}>
              Clear Cart
            </Button>
            <div className="flex gap-4 items-center">
              <span className="font-medium text-muted-foreground text-sm">Total:</span>
              <span className="text-2xl font-bold">${parseFloat(String(cart.total_price)).toFixed(2)}</span>
              <Button onClick={handleCheckout} disabled={orderLoading || cartLoading} className="gap-2">
                <CreditCard className="h-4 w-4" /> Place Order
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order history */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order History</h2>
          <p className="text-muted-foreground">Track your previous purchases</p>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {orders.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              No orders found.
            </div>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="border border-border/40 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-sm">Order #{order.id}</CardTitle>
                    <CardDescription className="text-[10px]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <span className="text-sm font-bold">${parseFloat(String(order.total_price)).toFixed(2)}</span>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="line-clamp-1 flex-1 font-medium">{item.product.title}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {item.quantity} x ${parseFloat(item.price_at_purchase).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
