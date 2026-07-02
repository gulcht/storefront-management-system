import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { AuthView } from './components/AuthView'
import { SellerDashboard } from './components/SellerDashboard'
import { BuyerMarketplace } from './components/BuyerMarketplace'
import { CartAndOrdersView } from './components/CartAndOrdersView'
import { ThemeModal } from './components/ThemeModal'
import { Button } from '@/components/ui/button'
import { Store, ShoppingCart, LogOut, Package2 } from 'lucide-react'

export function App() {
  const { user, clearAuth, fetchProfile } = useAuthStore()
  const [currentTab, setCurrentTab] = useState<'marketplace' | 'cart'>('marketplace')

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Handle case where user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">StoreFront</h1>
          </div>
          <ThemeModal />
        </header>
        <main className="container mx-auto py-8">
          <AuthView />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">StoreFront</h1>
          <span className="text-xs ml-2 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20 rounded-full capitalize">
            {user.role} Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium hidden sm:inline">
            Logged in as <span className="font-semibold text-primary">{user.email}</span>
          </span>

          {/* Role specific navigation tabs */}
          {user.role === 'buyer' && (
            <div className="flex items-center gap-2">
              <Button
                variant={currentTab === 'marketplace' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTab('marketplace')}
                className="gap-2"
              >
                <Package2 className="h-4 w-4" /> Marketplace
              </Button>
              <Button
                variant={currentTab === 'cart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTab('cart')}
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" /> Cart & Orders
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={clearAuth} className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>

          <ThemeModal />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {user.role === 'seller' ? (
          <SellerDashboard />
        ) : currentTab === 'marketplace' ? (
          <BuyerMarketplace />
        ) : (
          <CartAndOrdersView onNavigateToMarketplace={() => setCurrentTab('marketplace')} />
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground bg-card/20">
        <p>© 2026 StoreFront Management System. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
