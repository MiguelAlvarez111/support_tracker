import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, CheckCircle2, RefreshCw, Save, Calendar, Target, History, List, Users, BarChart3, ArrowDown } from 'lucide-react'
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
  const [showHistory, setShowHistory] = useState(false)

  // History filters
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    return thirtyDaysAgo.toISOString().split('T')[0]
  })
  const [historyEndDate, setHistoryEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [historyAgentFilter, setHistoryAgentFilter] = useState('')

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
    setLoadingTeams(true)
    setError(null)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/teams/`)
      setTeams(response.data)
      if (response.data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(response.data[0].id)
      }
    } catch (err) {
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
    setError(null)
    try {
      const url = `${API_BASE_URL}/api/agents/`
      const params = { team_id: teamId, is_active: true }
      const response = await axios.get(url, { params })
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
    } catch (err) {
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
        setError('Por favor ingresa al menos un dato')
        setLoading(false)
        return
      }

      const url = `${API_BASE_URL}/api/performances/bulk`
      const response = await axios.post(
        url,
        { performances },
        { headers: { 'Content-Type': 'application/json' } }
      )

      setProcessedData(response.data)
      setSuccess(`Datos guardados exitosamente. ${response.data.length} registros procesados.`)
      // Automatically show history when saving
      setShowHistory(true)

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
        fetchHistoricalMetrics()
      }, 500)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al guardar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Memoized function to fetch historical metrics
  const fetchHistoricalMetrics = useCallback(async () => {
    setLoadingMetrics(true)
    try {
      const url = `${API_BASE_URL}/api/metrics/`
      // Filter by selected team if available
      const params = {
        limit: 1000,
        ...(selectedTeamId && { team_id: selectedTeamId }),
        ...(historyStartDate && { start_date: historyStartDate }),
        ...(historyEndDate && { end_date: historyEndDate })
      }
      const response = await axios.get(url, { params })

      let metrics = response.data

      // Client-side filtering for agent name (fuzzy search)
      if (historyAgentFilter) {
        metrics = metrics.filter(m =>
          m.agent_name.toLowerCase().includes(historyAgentFilter.toLowerCase())
        )
      }

      setHistoricalMetrics(metrics)
    } catch (err) {
      // Don't show error to user, just log it
      console.error(err)
    } finally {
      setLoadingMetrics(false)
    }
  }, [selectedTeamId, historyStartDate, historyEndDate, historyAgentFilter])

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6">

      {/* SECTION 1: REPORT CONTEXT (Priority A) */}
      <div className="card p-0 overflow-hidden border-2 border-primary-900/30">
        {/* Context Header */}
        <div className="bg-dark-800/50 p-4 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-900/20 rounded-lg text-primary-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">Contexto del Reporte</h2>
              <p className="text-xs text-gray-400 font-medium">Define alcance y reglas globales</p>
            </div>
          </div>
          {/* Visual Indicator of Scope */}
          {selectedTeamId && (
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-400 bg-dark-900/50 px-3 py-1.5 rounded-full border border-dark-700">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                Equipo: <span className="text-white font-medium">{teams.find(t => t.id === selectedTeamId)?.name}</span>
              </span>
              <span className="w-px h-4 bg-dark-600"></span>
              <span>Fecha: <span className="text-white font-medium">{reportDate}</span></span>
            </div>
          )}
        </div>

        {/* Context Controls */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

          {/* Primary Inputs: Team & Date */}
          <div className="md:col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <Users className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Equipo Activo
                </label>
                {loadingTeams ? (
                  <div className="h-10 w-full bg-dark-700 animate-pulse rounded-lg" />
                ) : (
                  <select
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
                    className="input-field w-full font-medium"
                  >
                    {teams.length === 0 && <option value="">Sin equipos...</option>}
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="input-field w-full font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="hidden md:block md:col-span-1 flex justify-center pb-3">
            <div className="h-8 w-px bg-dark-700"></div>
          </div>

          {/* Secondary Inputs: Global Goals */}
          <div className="md:col-span-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Meta Tickets (Global)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={globalTicketsGoal}
                    onChange={(e) => setGlobalTicketsGoal(parseInt(e.target.value) || 0)}
                    className="input-field w-full pl-3 pr-10"
                    min="0"
                    placeholder="e.g. 200"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-600 font-mono">TKT</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Meta Squadlinx (Global)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={globalPointsGoal}
                    onChange={(e) => setGlobalPointsGoal(parseFloat(e.target.value) || 0)}
                    className="input-field w-full pl-3 pr-10"
                    min="0"
                    placeholder="e.g. 8.0"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-600 font-mono">PTS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DATA ENTRY (Priority B) */}
      <div className="card p-0 overflow-hidden shadow-2xl shadow-black/40">
        <div className="p-4 border-b border-dark-700 bg-dark-800/80 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <List className="w-5 h-5 text-primary-400" />
            Registro de Datos
          </h3>
          <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-dark-900 rounded border border-dark-700">
            {agents.length} Agentes Activos
          </span>
        </div>

        <div className="p-6">
          {/* Status Messages area */}
          {(error || success) && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${error ? 'bg-red-900/20 text-red-300 border border-red-900/50' : 'bg-green-900/20 text-green-300 border border-green-900/50'
              }`}>
              {error ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
            </div>
          )}

          {loadingAgents ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : agents.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {selectedTeamId ? 'Sin agentes activos.' : 'Selecciona un equipo arriba.'}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto ring-1 ring-dark-700 rounded-lg">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-dark-900/50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-dark-700">
                      <th className="px-4 py-3 min-w-[200px]">Agente</th>
                      <th className="px-4 py-3 bg-dark-800/30">Tickets (Real)</th>
                      <th className="px-4 py-3 bg-dark-800/30">Puntos (Real)</th>
                      <th className="px-4 py-3 border-l border-dark-800">Meta TKT <span className="text-[10px] normal-case opacity-60">(Opcional)</span></th>
                      <th className="px-4 py-3">Meta PTS <span className="text-[10px] normal-case opacity-60">(Opcional)</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-dark-800/40 transition-colors even:bg-dark-800/20">
                        {/* Agent Name */}
                        <td className="px-4 py-2 font-medium text-gray-200">
                          {agent.full_name}
                        </td>

                        {/* INPUTS: Actuals */}
                        <td className="px-4 py-2 bg-dark-800/10">
                          <input
                            type="number"
                            value={manualData[agent.id]?.tickets_actual || ''}
                            onChange={(e) => handleManualDataChange(agent.id, 'tickets_actual', e.target.value)}
                            className="input-field w-32 font-mono text-sm border-dark-600 focus:border-primary-500"
                            min="0"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 bg-dark-800/10">
                          <input
                            type="number"
                            step="0.1"
                            value={manualData[agent.id]?.points_actual || ''}
                            onChange={(e) => handleManualDataChange(agent.id, 'points_actual', e.target.value)}
                            className="input-field w-32 font-mono text-sm border-dark-600 focus:border-primary-500"
                            min="0"
                            placeholder="0.0"
                          />
                        </td>

                        {/* INPUTS: Custom Goals (Optional) */}
                        <td className="px-4 py-2 border-l border-dark-800">
                          <div className="space-y-1">
                            <input
                              type="number"
                              value={manualData[agent.id]?.tickets_goal ?? ''}
                              onChange={(e) => handleManualDataChange(agent.id, 'tickets_goal', e.target.value === '' ? null : e.target.value)}
                              className="input-field w-28 text-xs py-1.5 h-8 bg-dark-900/50 border-dark-700 text-gray-400 focus:text-white"
                              min="0"
                              placeholder={globalTicketsGoal.toString()}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="space-y-1">
                            <input
                              type="number"
                              step="0.1"
                              value={manualData[agent.id]?.points_goal ?? ''}
                              onChange={(e) => handleManualDataChange(agent.id, 'points_goal', e.target.value === '' ? null : e.target.value)}
                              className="input-field w-28 text-xs py-1.5 h-8 bg-dark-900/50 border-dark-700 text-gray-400 focus:text-white"
                              min="0"
                              placeholder={globalPointsGoal.toString()}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SAVE ACTION */}
              <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-dark-700 mt-2">
                <p className="text-xs text-gray-500 italic">
                  * Si las metas opcionales se dejan vacías, se usarán los valores globales del contexto.
                </p>
                <button
                  onClick={handleManualSave}
                  disabled={loading}
                  className="btn-primary px-8 py-3 text-base flex items-center justify-center gap-2 shadow-lg shadow-primary-900/20 hover:shadow-primary-900/40 transform hover:-translate-y-0.5 transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Datos del Día
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEPARATOR */}
      <div className="py-8 flex items-center justify-center gap-4 opacity-50">
        <div className="h-px bg-gradient-to-r from-transparent via-dark-600 to-transparent flex-1" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
          <ArrowDown className="w-3 h-3" />
          Analíticas y Resultados
          <ArrowDown className="w-3 h-3" />
        </span>
        <div className="h-px bg-gradient-to-r from-transparent via-dark-600 to-transparent flex-1" />
      </div>

      {/* SECTION 3: ANALYTICS (Read Only) */}
      <div className="space-y-6 opacity-90 hover:opacity-100 transition-opacity duration-500">

        {/* Sprint Stats */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-dark-700 to-dark-800 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm"></div>
          <div className="relative">
            <SprintStats metrics={historicalMetrics} agents={agents} />
          </div>
        </div>

        {/* Sprint Heatmap */}
        <div className="card p-6 border-dark-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dark-800 rounded-lg">
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Heatmap de Productividad</h2>
                <p className="text-xs text-gray-400">Visión global del sprint actual</p>
              </div>
            </div>
            <button
              onClick={fetchHistoricalMetrics}
              disabled={loadingMetrics}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-dark-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
          <SprintHeatmap metrics={historicalMetrics} agentsList={agents} />
        </div>

        {/* Full History View */}
        <div className="card p-6 border-dark-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dark-800 rounded-lg">
                <History className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Historial Completo</h2>
                <p className="text-xs text-gray-400">Auditoría y gestión de registros</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              {showHistory ? 'Ocultar Tabla' : 'Ver Todos los Registros'}
            </button>
          </div>

          {showHistory && (
            <div className="animate-fade-in space-y-4">
              {/* History Filters */}
              <div className="p-4 bg-dark-900/50 rounded-lg border border-dark-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Desde</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="input-field w-full text-sm py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Hasta</label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="input-field w-full text-sm py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Filtrar por Agente</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={historyAgentFilter}
                      onChange={(e) => setHistoryAgentFilter(e.target.value)}
                      placeholder="Buscar nombre..."
                      className="input-field w-full text-sm py-1.5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={fetchHistoricalMetrics}
                  disabled={loadingMetrics}
                  className="btn-secondary text-xs"
                >
                  <RefreshCw className={`w-3 h-3 mr-2 ${loadingMetrics ? 'animate-spin' : ''}`} />
                  Aplicar Filtros
                </button>
              </div>

              {historicalMetrics.length > 0 ? (
                <div className="mt-4">
                  <DailyTable data={historicalMetrics} onDelete={fetchHistoricalMetrics} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 border border-dashed border-dark-700 rounded-lg">
                  No hay registros históricos disponibles.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
