import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import TeamSettings from './components/TeamSettings'
import { LayoutDashboard, Users } from 'lucide-react'
import './App.css'

function Navigation() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="mb-8">
      <div className="flex gap-2 bg-dark-900/40 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-glass">
        <Link
          to="/"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${isActive('/')
              ? 'bg-primary-600 text-white shadow-neon'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
        <Link
          to="/team-settings"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${isActive('/team-settings')
              ? 'bg-primary-600 text-white shadow-neon'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
          <Users className="w-4 h-4" />
          Configuración de Equipo
        </Link>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-950 bg-gradient-radial from-dark-900 via-dark-950 to-dark-950">
        <div className="container mx-auto px-4 py-8 animate-fadeIn">
          <header className="mb-10 text-center md:text-left">
            <h1 className="text-5xl font-bold mb-3 tracking-tight">
              <span className="text-gradient">Support Tracker</span>
            </h1>
            <p className="text-gray-400 text-lg font-light">
              Panel de control para seguimiento de métricas de soporte
            </p>
          </header>
          <Navigation />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/team-settings" element={<TeamSettings />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
