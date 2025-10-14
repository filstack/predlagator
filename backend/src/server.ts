// backend/src/server.ts
import app from './app'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📖 API documentation: http://localhost:${PORT}/api`)
  console.log(`💚 Health check: http://localhost:${PORT}/health`)
})
