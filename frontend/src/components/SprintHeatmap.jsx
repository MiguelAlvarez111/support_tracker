import { useState, useMemo, Fragment, useRef } from 'react'
import { Calendar, TrendingUp, AlertTriangle, Copy, Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

function SprintHeatmap({ metrics = [], agentsList = [] }) {
  const [daysRange, setDaysRange] = useState(10)
  const heatmapRef = useRef(null)
  const [copying, setCopying] = useState(false)

  const handleCopyAsImage = async () => {
    if (!heatmapRef.current) return

    setCopying(true)
    try {
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#020617', // dark-950
        scale: 2,
        logging: false,
        useCORS: true,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            alert('Imagen copiada al portapapeles')
          }).catch((err) => {
            console.error('Error copying to clipboard:', err)
            // Fallback: download image
            const url = canvas.toDataURL()
            const link = document.createElement('a')
            link.download = `heatmap-${new Date().toISOString().split('T')[0]}.png`
            link.href = url
            link.click()
            alert('Imagen descargada (el navegador no soporta copiar al portapapeles)')
          })
        }
      })
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error al generar la imagen')
    } finally {
      setCopying(false)
    }
  }

  const handleDownloadImage = async () => {
    if (!heatmapRef.current) return

    setCopying(true)
    try {
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const url = canvas.toDataURL()
      const link = document.createElement('a')
      link.download = `heatmap-${new Date().toISOString().split('T')[0]}.png`
      link.href = url
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error al generar la imagen')
    } finally {
      setCopying(false)
    }
  }

  // Helper function to group metrics by agent and date
  const groupedData = useMemo(() => {
    if (!metrics || metrics.length === 0) return { agents: [], dates: [], data: {} }

    // Filter metrics by date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - daysRange + 1)

    const filteredMetrics = metrics.filter(metric => {
      // Use T12:00:00 for consistency in comparison
      const metricDate = new Date(`${metric.date}T12:00:00`)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate >= startDate && metricDate <= today
    })

    // Get unique agents and dates
    const agentsSet = new Set()
    const datesSet = new Set()

    filteredMetrics.forEach(metric => {
      agentsSet.add(metric.agent_name)
      datesSet.add(metric.date)
    })

    const agents = Array.from(agentsSet).sort()
    const dates = Array.from(datesSet).sort()

    // Create a map: agent_name -> date -> metric
    const dataMap = {}
    agents.forEach(agent => {
      dataMap[agent] = {}
    })

    filteredMetrics.forEach(metric => {
      if (!dataMap[metric.agent_name]) {
        dataMap[metric.agent_name] = {}
      }
      dataMap[metric.agent_name][metric.date] = metric
    })

    return { agents, dates, data: dataMap }
  }, [metrics, daysRange])

  const formatDate = (dateString) => {
    // Append T12:00:00 to prevent timezone shift (UTC midnight -> previous day)
    const date = new Date(`${dateString}T12:00:00`)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    })
  }

  const formatDateFull = (dateString) => {
    const date = new Date(`${dateString}T12:00:00`)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getProductivityCellClass = (metric) => {
    if (!metric) return 'bg-dark-800 border-dark-700'
    const meetsGoal = metric.tickets_processed >= metric.ticket_goal
    return meetsGoal
      ? 'bg-green-900/30 border-green-700 hover:bg-green-900/40'
      : 'bg-red-900/30 border-red-700 hover:bg-red-900/40'
  }

  const getWorkloadCellClass = (metric) => {
    if (!metric) return 'bg-dark-800 border-dark-700'
    return metric.is_burnout
      ? 'bg-red-900/40 border-red-700 hover:bg-red-900/50'
      : 'bg-dark-700 border-dark-600 hover:bg-dark-600'
  }

  const { agents, dates, data } = groupedData

  if (metrics.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center py-12">
          <p className="text-gray-400">No hay métricas disponibles para mostrar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6" ref={heatmapRef}>
      {/* Header with date range selector and export buttons */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">
              Sprint Heatmap
            </h2>
            <p className="text-gray-400 text-sm">
              Visualización de rendimiento por agente y día
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-300">
                Rango:
              </label>
              <select
                value={daysRange}
                onChange={(e) => setDaysRange(parseInt(e.target.value))}
                className="input-field w-32"
              >
                <option value={7}>Últimos 7 días</option>
                <option value={10}>Últimos 10 días</option>
                <option value={14}>Últimos 14 días</option>
                <option value={21}>Últimos 21 días</option>
                <option value={30}>Últimos 30 días</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyAsImage}
                disabled={copying}
                className="btn-primary w-10 h-10 p-0 flex items-center justify-center rounded-lg"
                title="Copiar Heatmap"
              >
                {copying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={copying}
                className="btn-secondary w-10 h-10 p-0 flex items-center justify-center rounded-lg"
                title="Descargar Heatmap"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Productivity Grid */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">
            Productividad (Tickets)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <div
            className="inline-block min-w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `150px repeat(${dates.length}, minmax(120px, 1fr))`,
              gap: '2px'
            }}
          >
            {/* Header row */}
            <div className="bg-dark-800 p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border border-dark-700">
              Agente
            </div>
            {dates.map(date => (
              <div
                key={date}
                className="bg-dark-800 p-3 text-xs font-semibold text-gray-400 text-center border border-dark-700"
              >
                {formatDate(date)}
              </div>
            ))}

            {/* Data rows - Excluding Leaders */}
            {agents
              .filter(agentName => {
                const agent = agentsList?.find(a => a.full_name === agentName)
                return agent?.role !== 'Leader'
              })
              .map(agent => (
                <Fragment key={agent}>
                  <div
                    className="bg-dark-800 p-3 text-sm font-medium text-gray-200 border border-dark-700 flex items-center"
                  >
                    {agent}
                  </div>
                  {dates.map(date => {
                    const metric = data[agent]?.[date]
                    return (
                      <div
                        key={`${agent}-${date}`}
                        className={`${getProductivityCellClass(metric)} p-3 text-center border transition-colors duration-150`}
                      >
                        {metric ? (
                          <div className="space-y-1">
                            <div className={`text-sm font-semibold ${metric.tickets_processed >= metric.ticket_goal
                              ? 'text-green-300'
                              : 'text-red-300'
                              }`}>
                              {metric.tickets_processed}
                            </div>
                            <div className="text-xs text-gray-400">
                              / {metric.ticket_goal}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">-</div>
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
          </div>
        </div>
      </div>

      {/* Workload Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">
            Carga de Trabajo (Squadlinx)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <div
            className="inline-block min-w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `150px repeat(${dates.length}, minmax(120px, 1fr))`,
              gap: '2px'
            }}
          >
            {/* Header row */}
            <div className="bg-dark-800 p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border border-dark-700">
              Agente
            </div>
            {dates.map(date => (
              <div
                key={date}
                className="bg-dark-800 p-3 text-xs font-semibold text-gray-400 text-center border border-dark-700"
              >
                {formatDate(date)}
              </div>
            ))}

            {/* Data rows */}
            {agents.map(agent => (
              <Fragment key={`${agent}-workload`}>
                <div
                  className="bg-dark-800 p-3 text-sm font-medium text-gray-200 border border-dark-700 flex items-center"
                >
                  {agent}
                </div>
                {dates.map(date => {
                  const metric = data[agent]?.[date]
                  return (
                    <div
                      key={`${agent}-${date}-workload`}
                      className={`${getWorkloadCellClass(metric)} p-3 text-center border transition-colors duration-150`}
                    >
                      {metric ? (
                        <div className="space-y-1">
                          <div className={`text-sm font-semibold ${metric.is_burnout ? 'text-red-400' : 'text-gray-300'
                            }`}>
                            {metric.squadlinx_points.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400">
                            / {metric.squadlinx_goal.toFixed(1)}
                          </div>
                          {metric.is_burnout && (
                            <div className="text-xs text-red-400 font-bold mt-1">
                              ⚠ Burnout
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">-</div>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-dark-800">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Productividad</h4>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-900/30 border border-green-700 rounded"></div>
                <span className="text-gray-400">Meta alcanzada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-900/30 border border-red-700 rounded"></div>
                <span className="text-gray-400">Meta no alcanzada</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Carga de Trabajo</h4>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-900/40 border border-red-700 rounded"></div>
                <span className="text-gray-400">Burnout</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-dark-700 border border-dark-600 rounded"></div>
                <span className="text-gray-400">Normal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SprintHeatmap
