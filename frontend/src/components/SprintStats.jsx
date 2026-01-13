import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, Users, CreditCard } from 'lucide-react'

function SprintStats({ metrics = [], agents = [] }) {
  // Process metrics for last 10 days
  const sprintData = useMemo(() => {
    console.log(`[SprintStats] Processing metrics: count=${metrics?.length || 0}`)
    if (!metrics || metrics.length === 0) {
      console.log('[SprintStats] No metrics provided, returning empty data')
      return {
        agentStats: [],
        totalTickets: 0,
        teamDebt: 0,
        atRiskAgents: 0
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 10)

    // Filter metrics for last 10 days
    const filteredMetrics = metrics.filter(metric => {
      const metricDate = new Date(metric.date)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate >= startDate && metricDate <= today
    })

    // Group by agent and calculate aggregates
    const agentMap = {}

    filteredMetrics.forEach(metric => {
      const agentName = metric.agent_name || metric.agent?.full_name || 'Unknown'

      if (!agentMap[agentName]) {
        agentMap[agentName] = {
          agentName,
          ticketsActual: 0,
          ticketsGoal: 0,
          pointsActual: 0,
          balance: 0
        }
      }

      // Accumulate values (handle both possible field names)
      const ticketsActual = metric.tickets_processed || metric.tickets_actual || 0
      const ticketsGoal = metric.ticket_goal || metric.tickets_goal || 0
      const pointsActual = metric.squadlinx_points || metric.points_actual || 0

      agentMap[agentName].ticketsActual += ticketsActual
      agentMap[agentName].ticketsGoal += ticketsGoal
      agentMap[agentName].pointsActual += pointsActual
    })

    // Calculate balance and prepare data
    const agentStats = Object.values(agentMap).map(agent => {
      const balance = agent.ticketsActual - agent.ticketsGoal
      return {
        ...agent,
        balance,
        hoursAccumulated: agent.pointsActual // Assuming points represent hours
      }
    }).sort((a, b) => a.agentName.localeCompare(b.agentName))

    // Calculate summary statistics
    const teamDebt = agentStats.reduce((sum, agent) => {
      // Only include non-leaders in team debt calculation
      const isLeader = agents && agents.find(a => a.full_name === agent.agentName)?.role === 'Leader'
      if (isLeader) return sum

      const deficit = agent.balance < 0 ? Math.abs(agent.balance) : 0
      return sum + deficit
    }, 0)

    // Only count ticket totals for non-leaders
    const totalTickets = agentStats.reduce((sum, agent) => {
      const isLeader = agents && agents.find(a => a.full_name === agent.agentName)?.role === 'Leader'
      return isLeader ? sum : sum + agent.ticketsActual
    }, 0)

    const atRiskAgents = agentStats.filter(agent => agent.hoursAccumulated > 88).length

    console.log(`[SprintStats] Calculated stats: agents=${agentStats.length}, totalTickets=${totalTickets}, teamDebt=${teamDebt}, atRisk=${atRiskAgents}`)
    return {
      agentStats,
      totalTickets,
      teamDebt,
      atRiskAgents
    }
  }, [metrics, agents])

  const { agentStats, totalTickets, teamDebt, atRiskAgents } = sprintData

  if (metrics.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center py-12">
          <p className="text-gray-400">No hay métricas disponibles para el sprint</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-1">
          Estadísticas del Sprint (Últimos 10 días)
        </h2>
        <p className="text-gray-400 text-sm">
          Estado acumulado del sprint actual
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Tickets Procesados</p>
              <p className="text-2xl font-bold text-white">{totalTickets.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary-400" />
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Deuda Neta del Equipo</p>
              <p className="text-2xl font-bold text-red-400">{teamDebt.toLocaleString()}</p>
            </div>
            <CreditCard className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Agentes en Riesgo de Burnout</p>
              <p className="text-2xl font-bold text-orange-400">{atRiskAgents}</p>
            </div>
            <Users className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Chart */}
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Balance de Tickets</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, agentStats.length * 40)}>
            <BarChart
              data={agentStats.filter(stat => {
                const agent = agents?.find(a => a.full_name === stat.agentName)
                return agent?.role !== 'Leader'
              })}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis
                dataKey="agentName"
                type="category"
                width={90}
                stroke="#9CA3AF"
                tick={{ fill: '#D1D5DB', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                formatter={(value, name) => {
                  if (name === 'balance') {
                    return [value > 0 ? `+${value}` : value, 'Balance']
                  }
                  return [value, name]
                }}
              />
              <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                {agentStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.balance >= 0 ? '#10B981' : '#EF4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hours Control Table */}
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Control de Horas (88h Cap)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-300">
                    Agente
                  </th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-gray-300">
                    Horas / 88
                  </th>
                </tr>
              </thead>
              <tbody>
                {agentStats.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-gray-400">
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  agentStats.map((agent) => {
                    const isOverLimit = agent.hoursAccumulated > 88
                    const rowClass = isOverLimit
                      ? 'bg-red-900/50 border-red-600 hover:bg-red-900/60'
                      : 'border-dark-700 hover:bg-dark-700/30'

                    return (
                      <tr
                        key={agent.agentName}
                        className={`border-b ${rowClass} transition-colors`}
                      >
                        <td className="py-2 px-3 text-sm flex items-center gap-2">
                          {isOverLimit && (
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          )}
                          <span className={isOverLimit ? 'text-red-200 font-medium' : 'text-gray-200'}>
                            {agent.agentName}
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-sm text-right font-semibold ${isOverLimit ? 'text-red-300' : 'text-gray-300'
                          }`}>
                          {agent.hoursAccumulated.toFixed(1)} / 88
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SprintStats

