import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, Save, Calendar, Target } from 'lucide-react'
import axios from 'axios'
import DailyTable from './DailyTable'
import SprintHeatmap from './SprintHeatmap'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Dashboard() {
  // Step 1: Configuration
  const [reportDate, setReportDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [globalTicketsGoal, setGlobalTicketsGoal] = useState(200)
  const [globalPointsGoal, setGlobalPointsGoal] = useState(8.0)
  
  const [processedData, setProcessedData] = useState([])
  const [historicalMetrics, setHistoricalMetrics] = useState([])
  
  // Teams and Agents
  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [agents, setAgents] = useState([])
  
  // Manual entry data
  const [manualData, setManualData] = useState({}) // { agentId: { tickets_actual: 0, points_actual: 0 } }
  
  // Loading and error states
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch teams
  const fetchTeams = async () => {
    setLoadingTeams(true)
    setError(null) // Clear any previous errors
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams`)
      setTeams(response.data)
      if (response.data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(response.data[0].id)
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
      // Only show error if it's a real error, not just no teams
      if (err.response?.status !== 404) {
        setError('Error al cargar los equipos')
      }
    } finally {
      setLoadingTeams(false)
    }
  }

  // Fetch active agents for selected team
  const fetchAgents = async (teamId) => {
    if (!teamId) return
    
    setLoadingAgents(true)
    setError(null) // Clear any previous errors
    try {
      const response = await axios.get(`${API_BASE_URL}/api/agents`, {
        params: { team_id: teamId, is_active: true }
      })
      setAgents(response.data)
      
      // Initialize manual data
      const initialData = {}
      response.data.forEach(agent => {
        initialData[agent.id] = {
          tickets_actual: '',
          points_actual: ''
        }
      })
      setManualData(initialData)
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError('Error al cargar los agentes')
    } finally {
      setLoadingAgents(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeamId) {
      fetchAgents(selectedTeamId)
    }
  }, [selectedTeamId])

  // Handle manual data changes
  const handleManualDataChange = (agentId, field, value) => {
    setManualData(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [field]: value
      }
    }))
  }

  // Handle manual save
  const handleManualSave = async () => {
    if (!selectedTeamId) {
      setError('Por favor selecciona un equipo')
      return
    }

    if (!reportDate) {
      setError('Por favor selecciona una fecha')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Build performances array
      const performances = agents
        .filter(agent => {
          const data = manualData[agent.id]
          return data && (data.tickets_actual !== '' || data.points_actual !== '')
        })
        .map(agent => {
          const data = manualData[agent.id]
          return {
            agent_id: agent.id,
            date: reportDate,
            tickets_actual: parseInt(data?.tickets_actual) || 0,
            tickets_goal: globalTicketsGoal,
            points_actual: parseFloat(data?.points_actual) || 0.0,
            points_goal: globalPointsGoal
          }
        })

      if (performances.length === 0) {
        setError('Por favor ingresa al menos un dato')
        setLoading(false)
        return
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/performances/bulk`,
        { performances },
        { headers: { 'Content-Type': 'application/json' } }
      )

      setProcessedData(response.data)
      setSuccess(`Datos guardados exitosamente. ${response.data.length} registros procesados.`)
      
      // Clear manual data
      const clearedData = {}
      agents.forEach(agent => {
        clearedData[agent.id] = { tickets_actual: '', points_actual: '' }
      })
      setManualData(clearedData)
      
      // Refresh metrics
      setTimeout(() => {
        fetchHistoricalMetrics()
      }, 500)
    } catch (err) {
      console.error('Error saving manual data:', err)
      setError(err.response?.data?.detail || err.message || 'Error al guardar los datos')
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoricalMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/metrics`,
        {
          params: {
            limit: 1000 // Get enough data for the heatmap
          }
        }
      )
      setHistoricalMetrics(response.data)
    } catch (err) {
      console.error('Error fetching historical metrics:', err)
      // Don't show error to user, just log it
    } finally {
      setLoadingMetrics(false)
    }
  }

  // Load historical metrics on component mount
  useEffect(() => {
    fetchHistoricalMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh historical metrics after successful data upload
  useEffect(() => {
    if (success && processedData.length > 0) {
      // Small delay to ensure backend has processed the data
      setTimeout(() => {
        fetchHistoricalMetrics()
      }, 500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, processedData.length])

  return (
    <div className="space-y-6">
      {/* Step 1: Configuration */}
      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Configuración del Día
          </h2>
          <p className="text-gray-400 text-sm">
            Define la fecha y metas globales para el reporte
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha del Reporte *
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Meta de Tickets Global
            </label>
            <input
              type="number"
              value={globalTicketsGoal}
              onChange={(e) => setGlobalTicketsGoal(parseInt(e.target.value) || 0)}
              className="input-field"
              min="0"
              placeholder="200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Meta Squadlinx Global
            </label>
            <input
              type="number"
              step="0.1"
              value={globalPointsGoal}
              onChange={(e) => setGlobalPointsGoal(parseFloat(e.target.value) || 0)}
              className="input-field"
              min="0"
              placeholder="8.0"
            />
          </div>
        </div>

        {/* Team Selector */}
        {loadingTeams ? (
          <div className="mt-4 flex items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando equipos...
          </div>
        ) : teams.length > 0 ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Equipo
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
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg text-yellow-300">
            No hay equipos disponibles. Por favor crea un equipo primero en Configuración de Equipo.
          </div>
        )}
      </div>

      {/* Step 2: Data Entry */}
      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Datos de los Agentes
          </h2>
          <p className="text-gray-400 text-sm">
            Ingresa los datos de los agentes manualmente
          </p>
        </div>

        {/* Manual Entry */}
        <div className="space-y-4">
          {loadingAgents ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Cargando agentes...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {selectedTeamId ? (
                <p>No hay agentes activos en este equipo.</p>
              ) : (
                <p>Por favor selecciona un equipo primero.</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Agente
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Tickets Real
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Puntos Real
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
                          <span className="ml-2 text-xs text-gray-500 font-mono">
                            ({agent.excel_alias})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={manualData[agent.id]?.tickets_actual || ''}
                            onChange={(e) => handleManualDataChange(agent.id, 'tickets_actual', e.target.value)}
                            className="input-field w-32"
                            min="0"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step="0.1"
                            value={manualData[agent.id]?.points_actual || ''}
                            onChange={(e) => handleManualDataChange(agent.id, 'points_actual', e.target.value)}
                            className="input-field w-32"
                            min="0"
                            placeholder="0.0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleManualSave}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Todo
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
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

      {/* Results Table */}
      {processedData.length > 0 && (
        <DailyTable data={processedData} />
      )}

      {/* Sprint Heatmap */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Visualización de Sprint
            </h2>
            <p className="text-gray-400 text-sm">
              Heatmap de productividad y carga de trabajo
            </p>
          </div>
          <button
            onClick={fetchHistoricalMetrics}
            disabled={loadingMetrics}
            className="btn-secondary flex items-center gap-2"
          >
            {loadingMetrics ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Actualizar
              </>
            )}
          </button>
        </div>
        <SprintHeatmap metrics={historicalMetrics} />
      </div>
    </div>
  )
}

export default Dashboard
