// frontend/src/components/layout/MainLayout.tsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'

export function MainLayout() {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const navItems = [
    { path: '/', label: 'Channels' },
    { path: '/batches', label: 'Batches' },
    { path: '/templates', label: 'Templates' },
    { path: '/campaigns', label: 'Campaigns' },
    { path: '/test', label: 'Test' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">
                Telegram Broadcast
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors hover:text-foreground/80 ${
                    isActive(item.path)
                      ? 'text-foreground'
                      : 'text-foreground/60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {/* Placeholder for future user menu */}
            <Link to="/settings">
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex h-14 items-center justify-between text-sm text-muted-foreground">
          <p>&copy; 2025 Telegram Broadcast Management System</p>
          <div className="flex space-x-4">
            <Link to="/docs" className="hover:text-foreground">
              Documentation
            </Link>
            <Link to="/about" className="hover:text-foreground">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
