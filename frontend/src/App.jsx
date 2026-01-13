import { useState } from 'react'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  return (
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
        <Dashboard />
      </div>
    </div>
  )
}

export default App

