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
    <nav className="mb-6">
      <div className="flex gap-2 bg-dark-900 border border-dark-800 rounded-lg p-1">
        <Link
          to="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isActive('/')
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
        <Link
          to="/team-settings"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isActive('/team-settings')
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-800'
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
      <div className="min-h-screen bg-dark-950">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Support Tracker
            </h1>
            <p className="text-gray-400">
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
