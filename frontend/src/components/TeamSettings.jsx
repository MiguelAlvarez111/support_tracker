import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, X, Save, Loader2, AlertCircle, CheckCircle2, UserMinus, UserPlus, MoreVertical, Shield, User } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function TeamSettings() {
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // UI State
  const [activeMenuId, setActiveMenuId] = useState(null)
  const menuRef = useRef(null)

  // Modal states
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)

  // Form states
  const [teamFormData, setTeamFormData] = useState({ name: '' })
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'Agent',
    is_active: true
  })

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch teams
  const fetchTeams = async () => {
    if (teams.length === 0) setLoadingTeams(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams/`)
      setTeams(response.data)
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError('Error al cargar los equipos')
    } finally {
      setLoadingTeams(false)
    }
  }

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id)
    }
  }, [teams, selectedTeamId])

  // Fetch agents
  const fetchAgents = async (teamId) => {
    if (!teamId) return
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/agents/?team_id=${teamId}`)
      setAgents(response.data)
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError('Error al cargar los agentes')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchTeams()
  }, [])

  // Load agents when team changes
  useEffect(() => {
    if (selectedTeamId) {
      fetchAgents(selectedTeamId)
    } else {
      setAgents([])
    }
  }, [selectedTeamId])

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleTeamFormChange = (e) => {
    const { name, value } = e.target
    setTeamFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Create team
  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (!teamFormData.name.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await axios.post(`${API_BASE_URL}/api/teams/`, {
        name: teamFormData.name.trim()
      })
      setSuccess('Equipo creado exitosamente')
      setTeamFormData({ name: '' })
      setIsAddTeamModalOpen(false)
      await fetchTeams()
      if (response.data && response.data.id) {
        setSelectedTeamId(response.data.id)
        fetchAgents(response.data.id)
      }
    } catch (err) {
      console.error('Error creating team:', err)
      setError(err.response?.data?.detail || 'Error al crear el equipo')
    } finally {
      setLoading(false)
    }
  }

  // Modal Handlers
  const handleOpenAddTeamModal = () => {
    setTeamFormData({ name: '' })
    setError(null)
    setSuccess(null)
    setIsAddTeamModalOpen(true)
  }

  const handleCloseTeamModal = () => setIsAddTeamModalOpen(false)

  const handleOpenAddModal = () => {
    if (!selectedTeamId) {
      setError('Por favor selecciona un equipo primero')
      return
    }
    setFormData({ full_name: '', role: 'Agent', is_active: true })
    setError(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (agent) => {
    setEditingAgent(agent)
    setFormData({
      full_name: agent.full_name,
      role: agent.role || 'Agent',
      is_active: agent.is_active
    })
    setError(null)
    setIsEditModalOpen(true)
    setActiveMenuId(null)
  }

  const handleCloseModals = () => {
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setEditingAgent(null)
    setFormData({ full_name: '', role: 'Agent', is_active: true })
    setError(null)
    setSuccess(null)
  }

  // Create agent
  const handleCreateAgent = async (e) => {
    e.preventDefault()
    if (!formData.full_name.trim()) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await axios.post(`${API_BASE_URL}/api/agents/`, {
        team_id: selectedTeamId,
        full_name: formData.full_name.trim(),
        role: formData.role,
        is_active: formData.is_active
      })
      setSuccess('Agente creado exitosamente')
      handleCloseModals()
      fetchAgents(selectedTeamId)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al crear el agente')
    } finally {
      setLoading(false)
    }
  }

  // Update agent
  const handleUpdateAgent = async (e) => {
    e.preventDefault()
    if (!formData.full_name.trim()) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await axios.put(`${API_BASE_URL}/api/agents/${editingAgent.id}`, {
        full_name: formData.full_name.trim(),
        role: formData.role,
        is_active: formData.is_active
      })
      setSuccess('Agente actualizado exitosamente')
      handleCloseModals()
      fetchAgents(selectedTeamId)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al actualizar el agente')
    } finally {
      setLoading(false)
    }
  }

  // Safe Actions
  const handleToggleActive = async (agent) => {
    setActiveMenuId(null)
    const action = agent.is_active ? 'desactivar' : 'activar'
    const warning = agent.is_active
      ? 'El agente ya no podrá registrar métricas y no aparecerá en los reportes activos.'
      : 'El agente volverá a estar disponible para reportes.'

    if (!window.confirm(`¿Confirmas que deseas ${action} a ${agent.full_name}?\n\n${warning}`)) {
      return
    }

    setLoading(true)
    try {
      await axios.put(`${API_BASE_URL}/api/agents/${agent.id}`, {
        is_active: !agent.is_active
      })
      setSuccess(`Agente ${!agent.is_active ? 'activado' : 'desactivado'} exitosamente`)
      fetchAgents(selectedTeamId)
    } catch (err) {
      setError('Error al cambiar estado')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (agentId) => {
    setActiveMenuId(null)
    if (!window.confirm('¡ATENCIÓN! Estás a punto de eliminar un agente permanentemente.\n\nEsta acción es irreversible y eliminará todo su historial de métricas.\n\n¿Estás realmente seguro?')) {
      return
    }

    setLoading(true)
    try {
      await axios.delete(`${API_BASE_URL}/api/agents/${agentId}`)
      setSuccess('Agente eliminado permanentemente')
      fetchAgents(selectedTeamId)
    } catch (err) {
      setError('Error al eliminar agente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Configuración de Equipo
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Gestión operativa de agentes y roles
          </p>
        </div>
        <button
          onClick={handleOpenAddTeamModal}
          className="btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Equipo
        </button>
      </div>

      {/* Operational Context & Messages */}
      {(error || success) && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${error ? 'bg-red-900/10 border-red-900/50 text-red-200' : 'bg-green-900/10 border-green-900/50 text-green-200'
          }`}>
          {error ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 mt-0.5" />}
          <p className="text-sm font-medium">{error || success}</p>
        </div>
      )}

      {/* Main Control Panel */}
      <div className="card border-dark-700 bg-dark-900/50 backdrop-blur-sm overflow-hidden">
        {/* Team Context Selector */}
        <div className="p-6 border-b border-dark-700 bg-dark-800/30">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Equipo Activo
              </label>
              {loadingTeams ? (
                <div className="h-10 w-full bg-dark-700 animate-pulse rounded-lg" />
              ) : teams.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(e.target.value ? parseInt(e.target.value) : null)}
                    className="input-field w-full text-lg py-2.5 font-medium bg-dark-900 border-dark-600 focus:border-primary-500"
                  >
                    <option value="">Seleccionar Equipo...</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-yellow-500 text-sm py-2">
                  ⚠ No hay equipos creados.
                </div>
              )}
            </div>

            {/* Context Summary */}
            {selectedTeamId && (
              <div className="flex gap-8 px-6 py-2 border border-dark-700 rounded-lg bg-dark-900/50">
                <div>
                  <span className="block text-xs text-gray-500 uppercase">Total Agentes</span>
                  <span className="text-xl font-bold text-white">{agents.length}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 uppercase">Activos</span>
                  <span className="text-xl font-bold text-green-400">
                    {agents.filter(a => a.is_active).length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agents Area */}
        {selectedTeamId && (
          <div>
            {/* Table Header Action */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-dark-700/50">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <User className="w-4 h-4 text-primary-400" />
                Agentes del Equipo
              </h3>
              <button
                onClick={handleOpenAddModal}
                className="btn-primary flex items-center gap-2 text-sm py-1.5 px-4"
              >
                <Plus className="w-4 h-4" />
                Agregar Agente
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : agents.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-dark-600" />
                </div>
                <h4 className="text-gray-300 font-medium">Sin agentes registrados</h4>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                  Agrega agentes a este equipo para comenzar a registrar métricas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-dark-800/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-dark-700">
                      <th className="px-6 py-3 w-1/3">Agente</th>
                      <th className="px-6 py-3">Rol</th>
                      <th className="px-6 py-3 text-center">Estado</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {agents.map((agent) => (
                      <tr
                        key={agent.id}
                        className="group hover:bg-dark-800/60 transition-colors even:bg-dark-800/20"
                      >
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-200 group-hover:text-white transition-colors">
                            {agent.full_name}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {agent.role === 'Leader' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <Shield className="w-3 h-3" />
                              Líder
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-dark-700 text-gray-400 border border-dark-600">
                              Agente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {agent.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-600/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(agent)}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === agent.id ? null : agent.id)}
                                className={`p-1.5 rounded transition-colors ${activeMenuId === agent.id
                                    ? 'bg-dark-700 text-white'
                                    : 'text-gray-500 hover:text-white hover:bg-dark-700'
                                  }`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuId === agent.id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-20 py-1"
                                >
                                  <button
                                    onClick={() => handleToggleActive(agent)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                                  >
                                    {agent.is_active ? (
                                      <>
                                        <UserMinus className="w-4 h-4 text-yellow-500" />
                                        Desactivar
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="w-4 h-4 text-emerald-500" />
                                        Activar
                                      </>
                                    )}
                                  </button>
                                  <div className="h-px bg-dark-700 my-1" />
                                  <button
                                    onClick={() => handleDeleteAgent(agent.id)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar Agente
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      {isAddTeamModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md bg-dark-900 border-dark-700 shadow-2xl">
            <div className="p-6 border-b border-dark-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Nuevo Equipo</h3>
              <button onClick={handleCloseTeamModal} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Nombre del Equipo
                </label>
                <input
                  type="text"
                  name="name"
                  value={teamFormData.name}
                  onChange={handleTeamFormChange}
                  placeholder="Ej: Soporte Turno Mañana"
                  className="input-field w-full"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseTeamModal}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Crear Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Agent Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md bg-dark-900 border-dark-700 shadow-2xl">
            <div className="p-6 border-b border-dark-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {isEditModalOpen ? 'Editar Agente' : 'Nuevo Agente'}
              </h3>
              <button onClick={handleCloseModals} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateAgent : handleCreateAgent} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleFormChange}
                  placeholder="Ej: Juan Pérez"
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                  Rol Operativo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all ${formData.role === 'Agent'
                      ? 'bg-primary-900/20 border-primary-500 text-white'
                      : 'bg-dark-800 border-dark-600 text-gray-400 hover:border-gray-500'
                    }`}>
                    <input
                      type="radio"
                      name="role"
                      value="Agent"
                      checked={formData.role === 'Agent'}
                      onChange={handleFormChange}
                      className="hidden"
                    />
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium">Agente</span>
                  </label>

                  <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-2 transition-all ${formData.role === 'Leader'
                      ? 'bg-indigo-900/20 border-indigo-500 text-white'
                      : 'bg-dark-800 border-dark-600 text-gray-400 hover:border-gray-500'
                    }`}>
                    <input
                      type="radio"
                      name="role"
                      value="Leader"
                      checked={formData.role === 'Leader'}
                      onChange={handleFormChange}
                      className="hidden"
                    />
                    <Shield className="w-5 h-5" />
                    <span className="text-sm font-medium">Líder</span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {formData.role === 'Leader'
                    ? 'ℹ Los líderes gestionan el equipo y no tienen meta de tickets.'
                    : 'ℹ Los agentes deben cumplir metas diarias de tickets y calidad.'}
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg border border-dark-700">
                <input
                  type="checkbox"
                  name="is_active"
                  id="modal_is_active"
                  checked={formData.is_active}
                  onChange={handleFormChange}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-900"
                />
                <label htmlFor="modal_is_active" className="text-sm text-gray-200 font-medium cursor-pointer">
                  Agente Activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditModalOpen ? 'Guardar Cambios' : 'Crear Agente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamSettings

