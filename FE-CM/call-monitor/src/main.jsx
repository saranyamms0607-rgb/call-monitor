import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// expose monitor API token from Vite env to popup windows (development only)
if (typeof window !== 'undefined' && import.meta && import.meta.env) {
  const t = import.meta.env.VITE_MONITOR_API_TOKEN || null
  if (t) window.MONITOR_API_TOKEN = t
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
