import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, Loader2, AlertCircle, CheckCircle2, UserMinus, UserPlus } from 'lucide-react'
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
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    excel_alias: '',
    is_active: true
  })

  // Fetch teams
  const fetchTeams = async () => {
    setLoadingTeams(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams`)
      setTeams(response.data)
      
      // Auto-select first team if available
      if (response.data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(response.data[0].id)
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError('Error al cargar los equipos')
    } finally {
      setLoadingTeams(false)
    }
  }

  // Fetch agents for selected team
  const fetchAgents = async (teamId) => {
    if (!teamId) return
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/agents`, {
        params: { team_id: teamId }
      })
      setAgents(response.data)
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError('Error al cargar los agentes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeamId) {
      fetchAgents(selectedTeamId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId])

  // Handle form changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Open add modal
  const handleOpenAddModal = () => {
    if (!selectedTeamId) {
      setError('Por favor selecciona un equipo primero')
      return
    }
    setFormData({ full_name: '', excel_alias: '', is_active: true })
    setError(null)
    setSuccess(null)
    setIsAddModalOpen(true)
  }

  // Open edit modal
  const handleOpenEditModal = (agent) => {
    setEditingAgent(agent)
    setFormData({
      full_name: agent.full_name,
      excel_alias: agent.excel_alias,
      is_active: agent.is_active
    })
    setError(null)
    setSuccess(null)
    setIsEditModalOpen(true)
  }

  // Close modals
  const handleCloseModals = () => {
    setIsAddModalOpen(false)
    setIsEditModalOpen(false)
    setEditingAgent(null)
    setFormData({ full_name: '', excel_alias: '', is_active: true })
    setError(null)
    setSuccess(null)
  }

  // Create agent
  const handleCreateAgent = async (e) => {
    e.preventDefault()
    
    if (!formData.full_name.trim() || !formData.excel_alias.trim()) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await axios.post(`${API_BASE_URL}/api/agents`, {
        team_id: selectedTeamId,
        full_name: formData.full_name.trim(),
        excel_alias: formData.excel_alias.trim().toUpperCase(),
        is_active: formData.is_active
      })
      
      setSuccess('Agente creado exitosamente')
      handleCloseModals()
      fetchAgents(selectedTeamId)
    } catch (err) {
      console.error('Error creating agent:', err)
      setError(err.response?.data?.detail || err.message || 'Error al crear el agente')
    } finally {
      setLoading(false)
    }
  }

  // Update agent
  const handleUpdateAgent = async (e) => {
    e.preventDefault()
    
    if (!formData.full_name.trim() || !formData.excel_alias.trim()) {
      setError('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await axios.put(`${API_BASE_URL}/api/agents/${editingAgent.id}`, {
        full_name: formData.full_name.trim(),
        excel_alias: formData.excel_alias.trim().toUpperCase(),
        is_active: formData.is_active
      })
      
      setSuccess('Agente actualizado exitosamente')
      handleCloseModals()
      fetchAgents(selectedTeamId)
    } catch (err) {
      console.error('Error updating agent:', err)
      setError(err.response?.data?.detail || err.message || 'Error al actualizar el agente')
    } finally {
      setLoading(false)
    }
  }

  // Toggle agent active status
  const handleToggleActive = async (agent) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await axios.put(`${API_BASE_URL}/api/agents/${agent.id}`, {
        is_active: !agent.is_active
      })
      
      setSuccess(`Agente ${!agent.is_active ? 'activado' : 'desactivado'} exitosamente`)
      fetchAgents(selectedTeamId)
    } catch (err) {
      console.error('Error toggling agent status:', err)
      setError(err.response?.data?.detail || err.message || 'Error al cambiar el estado del agente')
    } finally {
      setLoading(false)
    }
  }

  // Delete agent
  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este agente? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await axios.delete(`${API_BASE_URL}/api/agents/${agentId}`)
      setSuccess('Agente eliminado exitosamente')
      fetchAgents(selectedTeamId)
    } catch (err) {
      console.error('Error deleting agent:', err)
      setError(err.response?.data?.detail || err.message || 'Error al eliminar el agente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Configuración de Equipo
            </h2>
            <p className="text-gray-400 text-sm">
              Gestiona los agentes de tu equipo
            </p>
          </div>
          {selectedTeamId && (
            <button
              onClick={handleOpenAddModal}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Agregar Agente
            </button>
          )}
        </div>

        {/* Team Selector */}
        {loadingTeams ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando equipos...
          </div>
        ) : teams.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Seleccionar Equipo
            </label>
            <select
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
              className="input-field w-full md:w-64"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg text-yellow-300">
            No hay equipos disponibles. Por favor crea un equipo primero.
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Agents Table */}
      {selectedTeamId && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Agentes del Equipo
          </h3>
          
          {loading && agents.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Cargando agentes...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No hay agentes en este equipo.</p>
              <button
                onClick={handleOpenAddModal}
                className="btn-primary mt-4 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Agregar Primer Agente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Nombre Completo
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                      Alias en Excel
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">
                      Estado
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-100">
                        {agent.full_name}
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono text-sm">
                        {agent.excel_alias}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            agent.is_active
                              ? 'bg-green-900/30 text-green-300 border border-green-800'
                              : 'bg-gray-900/30 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {agent.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(agent)}
                            className="p-2 text-gray-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(agent)}
                            className={`p-2 rounded-lg transition-colors ${
                              agent.is_active
                                ? 'text-gray-400 hover:text-yellow-400 hover:bg-dark-700'
                                : 'text-gray-400 hover:text-green-400 hover:bg-dark-700'
                            }`}
                            title={agent.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {agent.is_active ? (
                              <UserMinus className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                Agregar Agente
              </h3>
              <button
                onClick={handleCloseModals}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleFormChange}
                  placeholder="Ej: Astrid Lopez"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alias en Excel *
                </label>
                <input
                  type="text"
                  name="excel_alias"
                  value={formData.excel_alias}
                  onChange={handleFormChange}
                  placeholder="Ej: A. LOPEZ"
                  className="input-field font-mono"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Este alias debe coincidir exactamente con el que aparece en los archivos Excel
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleFormChange}
                  className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">
                  Agente activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {isEditModalOpen && editingAgent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                Editar Agente
              </h3>
              <button
                onClick={handleCloseModals}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleFormChange}
                  placeholder="Ej: Astrid Lopez"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alias en Excel *
                </label>
                <input
                  type="text"
                  name="excel_alias"
                  value={formData.excel_alias}
                  onChange={handleFormChange}
                  placeholder="Ej: A. LOPEZ"
                  className="input-field font-mono"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Este alias debe coincidir exactamente con el que aparece en los archivos Excel
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={handleFormChange}
                  className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="edit_is_active" className="text-sm text-gray-300">
                  Agente activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModals}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Cancelar
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

