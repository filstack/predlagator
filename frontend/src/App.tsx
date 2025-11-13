import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/ui/toaster'
import { useAuthStore } from './stores/auth-store'
import Login from './pages/Login'
import Register from './pages/Register'
import Channels from './pages/Channels'
import Batches from './pages/Batches'
import Templates from './pages/Templates'
import Campaigns from './pages/Campaigns'
import Settings from './pages/Settings'

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ErrorBoundary>
      <BrowserRouter basename="/pred">
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Защищенные маршруты */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Channels />} />
            <Route path="batches" element={<Batches />} />
            <Route path="templates" element={<Templates />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Редирект на главную для неизвестных маршрутов */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
