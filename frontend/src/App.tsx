import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Channels from './pages/Channels'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        {/* Navigation */}
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                Telegram Broadcast System
              </h1>
              <div className="flex gap-4">
                <Link
                  to="/"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Channels
                </Link>
                <Link
                  to="/batches"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Batches
                </Link>
                <Link
                  to="/campaigns"
                  className="text-sm hover:text-primary transition-colors"
                >
                  Campaigns
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Channels />} />
          <Route path="/batches" element={<div className="p-8">Batches (coming soon)</div>} />
          <Route path="/campaigns" element={<div className="p-8">Campaigns (coming soon)</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
