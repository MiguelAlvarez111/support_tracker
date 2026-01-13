import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, Save, Calendar, Target } from 'lucide-react'
import axios from 'axios'
import DailyTable from './DailyTable'
import SprintHeatmap from './SprintHeatmap'
import SprintStats from './SprintStats'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Dashboard() {
  // Step 1: Configuration
  const [reportDate, setReportDate] = useState(() => {
    const today = new Date()
    // Manual formatting to get local YYYY-MM-DD
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
  const [manualData, setManualData] = useState({}) // { agentId: { tickets_actual: 0, points_actual: 0, tickets_goal: null, points_goal: null } }

  // Loading and error states
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch teams
  const fetchTeams = async () => {
    console.log('[Dashboard] fetchTeams: Starting to fetch teams')
    setLoadingTeams(true)
    setError(null) // Clear any previous errors
    try {
      console.log(`[Dashboard] fetchTeams: API URL: ${API_BASE_URL}/api/teams/`)
      const response = await axios.get(`${API_BASE_URL}/api/teams/`)
      console.log(`[Dashboard] fetchTeams: Success - received ${response.data.length} teams`, response.data)
      setTeams(response.data)
      if (response.data.length > 0 && !selectedTeamId) {
        console.log(`[Dashboard] fetchTeams: Setting default team: ${response.data[0].id}`)
        setSelectedTeamId(response.data[0].id)
      }
    } catch (err) {
      console.error('[Dashboard] fetchTeams: Error fetching teams', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: `${API_BASE_URL}/api/teams`
      })
      // Only show error if it's a real error, not just no teams
      if (err.response?.status !== 404) {
        setError('Error al cargar los equipos')
      }
    } finally {
      setLoadingTeams(false)
      console.log('[Dashboard] fetchTeams: Finished')
    }
  }

  // Fetch active agents for selected team
  const fetchAgents = async (teamId) => {
    if (!teamId) {
      console.log('[Dashboard] fetchAgents: No teamId provided, skipping')
      return
    }

    console.log(`[Dashboard] fetchAgents: Starting to fetch agents for teamId: ${teamId}`)
    setLoadingAgents(true)
    setError(null) // Clear any previous errors
    try {
      const url = `${API_BASE_URL}/api/agents/`
      const params = { team_id: teamId, is_active: true }
      console.log(`[Dashboard] fetchAgents: API call - URL: ${url}`, params)
      const response = await axios.get(url, { params })
      console.log(`[Dashboard] fetchAgents: Success - received ${response.data.length} agents`, response.data)
      setAgents(response.data)

      // Initialize manual data
      const initialData = {}
      response.data.forEach(agent => {
        initialData[agent.id] = {
          tickets_actual: '',
          points_actual: '',
          tickets_goal: null, // null means use global value
          points_goal: null // null means use global value
        }
      })
      setManualData(initialData)
      console.log(`[Dashboard] fetchAgents: Initialized manual data for ${Object.keys(initialData).length} agents`)
    } catch (err) {
      console.error('[Dashboard] fetchAgents: Error fetching agents', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        teamId
      })
      setError('Error al cargar los agentes')
    } finally {
      setLoadingAgents(false)
      console.log('[Dashboard] fetchAgents: Finished')
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
    console.log('[Dashboard] handleManualSave: Starting save operation')
    if (!selectedTeamId) {
      console.warn('[Dashboard] handleManualSave: No team selected')
      setError('Por favor selecciona un equipo')
      return
    }

    if (!reportDate) {
      console.warn('[Dashboard] handleManualSave: No report date selected')
      setError('Por favor selecciona una fecha')
      return
    }

    console.log(`[Dashboard] handleManualSave: Saving for teamId=${selectedTeamId}, date=${reportDate}`)
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
          // Use custom goal if set, otherwise use global goal
          const tickets_goal = (data?.tickets_goal !== null && data?.tickets_goal !== undefined && data.tickets_goal !== '')
            ? parseInt(data.tickets_goal)
            : globalTicketsGoal
          const points_goal = (data?.points_goal !== null && data?.points_goal !== undefined && data.points_goal !== '')
            ? parseFloat(data.points_goal)
            : globalPointsGoal
          return {
            agent_id: agent.id,
            date: reportDate,
            tickets_actual: parseInt(data?.tickets_actual) || 0,
            tickets_goal: tickets_goal,
            points_actual: parseFloat(data?.points_actual) || 0.0,
            points_goal: points_goal
          }
        })

      if (performances.length === 0) {
        console.warn('[Dashboard] handleManualSave: No performances to save')
        setError('Por favor ingresa al menos un dato')
        setLoading(false)
        return
      }

      console.log(`[Dashboard] handleManualSave: Sending ${performances.length} performances to API`, performances)
      const url = `${API_BASE_URL}/api/performances/bulk`
      const response = await axios.post(
        url,
        { performances },
        { headers: { 'Content-Type': 'application/json' } }
      )
      console.log(`[Dashboard] handleManualSave: Success - ${response.data.length} records processed`, response.data)

      setProcessedData(response.data)
      setSuccess(`Datos guardados exitosamente. ${response.data.length} registros procesados.`)

      // Clear manual data
      const clearedData = {}
      agents.forEach(agent => {
        clearedData[agent.id] = {
          tickets_actual: '',
          points_actual: '',
          tickets_goal: null,
          points_goal: null
        }
      })
      setManualData(clearedData)

      // Refresh metrics
      setTimeout(() => {
        console.log('[Dashboard] handleManualSave: Refreshing metrics')
        fetchHistoricalMetrics()
      }, 500)
    } catch (err) {
      console.error('[Dashboard] handleManualSave: Error saving data', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        performances
      })
      setError(err.response?.data?.detail || err.message || 'Error al guardar los datos')
    } finally {
      setLoading(false)
      console.log('[Dashboard] handleManualSave: Finished')
    }
  }

  // Memoized function to fetch historical metrics
  const fetchHistoricalMetrics = useCallback(async () => {
    console.log('[Dashboard] fetchHistoricalMetrics: Starting to fetch metrics')
    setLoadingMetrics(true)
    try {
      const url = `${API_BASE_URL}/api/metrics/`
      // Filter by selected team if available
      const params = {
        limit: 1000,
        ...(selectedTeamId && { team_id: selectedTeamId })
      }
      console.log(`[Dashboard] fetchHistoricalMetrics: API call - URL: ${url}`, params)
      const response = await axios.get(url, { params })
      console.log(`[Dashboard] fetchHistoricalMetrics: Success - received ${response.data.length} metrics`)
      setHistoricalMetrics(response.data)
    } catch (err) {
      console.error('[Dashboard] fetchHistoricalMetrics: Error fetching metrics', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      // Don't show error to user, just log it
    } finally {
      setLoadingMetrics(false)
      console.log('[Dashboard] fetchHistoricalMetrics: Finished')
    }
  }, [selectedTeamId])

  // Load historical metrics when team changes or on component mount
  useEffect(() => {
    fetchHistoricalMetrics()
  }, [fetchHistoricalMetrics])

  // Refresh historical metrics after successful data upload
  useEffect(() => {
    if (success && processedData.length > 0) {
      // Small delay to ensure backend has processed the data
      const timer = setTimeout(() => {
        fetchHistoricalMetrics()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [success, processedData.length, fetchHistoricalMetrics])

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
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Meta Tickets
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Meta Puntos
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
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={manualData[agent.id]?.tickets_goal !== null && manualData[agent.id]?.tickets_goal !== undefined && manualData[agent.id].tickets_goal !== ''
                              ? manualData[agent.id].tickets_goal
                              : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : e.target.value
                              handleManualDataChange(agent.id, 'tickets_goal', value)
                            }}
                            className="input-field w-32"
                            min="0"
                            placeholder={globalTicketsGoal.toString()}
                          />
                          {manualData[agent.id]?.tickets_goal === null || manualData[agent.id]?.tickets_goal === undefined || manualData[agent.id].tickets_goal === '' ? (
                            <span className="ml-2 text-xs text-gray-500">(Global: {globalTicketsGoal})</span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step="0.1"
                            value={manualData[agent.id]?.points_goal !== null && manualData[agent.id]?.points_goal !== undefined && manualData[agent.id].points_goal !== ''
                              ? manualData[agent.id].points_goal
                              : ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : e.target.value
                              handleManualDataChange(agent.id, 'points_goal', value)
                            }}
                            className="input-field w-32"
                            min="0"
                            placeholder={globalPointsGoal.toString()}
                          />
                          {manualData[agent.id]?.points_goal === null || manualData[agent.id]?.points_goal === undefined || manualData[agent.id].points_goal === '' ? (
                            <span className="ml-2 text-xs text-gray-500">(Global: {globalPointsGoal})</span>
                          ) : null}
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

      {/* Sprint Stats */}
      <SprintStats metrics={historicalMetrics} agents={agents} />

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
        <SprintHeatmap metrics={historicalMetrics} agentsList={agents} />
      </div>
    </div>
  )
}

export default Dashboard
