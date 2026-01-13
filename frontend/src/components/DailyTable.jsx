import { useRef, useState } from 'react'
import { Copy, Download, Loader2, Trash2, FileSpreadsheet } from 'lucide-react'
import html2canvas from 'html2canvas'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function DailyTable({ data, onDelete }) {
  const tableRef = useRef(null)
  const [copying, setCopying] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const formatDate = (dateString) => {
    // dateString is "YYYY-MM-DD"
    // Appending T12:00:00 ensures we are in the middle of the day, avoiding midnight timezone shifts
    const date = new Date(`${dateString}T12:00:00`)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return

    setDeletingId(id)
    try {
      await axios.delete(`${API_BASE_URL}/api/performances/${id}`)
      if (onDelete) onDelete()
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Error al eliminar el registro')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportCSV = () => {
    if (!data || data.length === 0) return

    // Define headers
    const headers = ['Fecha', 'Agente', 'Tickets Procesados', 'Meta Tickets', 'Squadlinx', 'Meta Squadlinx', 'Estado']

    // Format data rows
    const rows = data.map(item => {
      const ticketsActual = item.tickets_processed ?? item.tickets_actual ?? 0
      const ticketsGoal = item.ticket_goal ?? item.tickets_goal ?? 0
      const pointsActual = item.squadlinx_points ?? item.points_actual ?? 0
      const pointsGoal = item.squadlinx_goal ?? item.points_goal ?? 0
      const agentName = item.agent_name ?? `Agente ${item.agent_id}`
      const meetsGoal = ticketsActual >= ticketsGoal ? 'Cumplido' : 'No Cumplido'

      return [
        item.date,
        agentName,
        ticketsActual,
        ticketsGoal,
        pointsActual,
        pointsGoal,
        meetsGoal
      ]
    })

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_soporte_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyAsImage = async () => {
    if (!tableRef.current) return

    setCopying(true)
    try {
      const canvas = await html2canvas(tableRef.current, {
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
            link.download = `support-tracker-${new Date().toISOString().split('T')[0]}.png`
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
    if (!tableRef.current) return

    setCopying(true)
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const url = canvas.toDataURL()
      const link = document.createElement('a')
      link.download = `support-tracker-${new Date().toISOString().split('T')[0]}.png`
      link.href = url
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error al generar la imagen')
    } finally {
      setCopying(false)
    }
  }

  // Group data by date for better organization
  const groupedByDate = data.reduce((acc, item) => {
    const dateKey = item.date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(item)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    new Date(b) - new Date(a)
  )

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            Métricas Diarias
          </h2>
          <p className="text-gray-400 text-sm">
            {data.length} registro{data.length !== 1 ? 's' : ''} procesado{data.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Excel (CSV)
          </button>
          <button
            onClick={handleCopyAsImage}
            disabled={copying}
            className="btn-primary flex items-center gap-2"
          >
            {copying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copiar Imagen
              </>
            )}
          </button>
          <button
            onClick={handleDownloadImage}
            disabled={copying}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Descargar Imagen
          </button>
        </div>
      </div>

      <div ref={tableRef} className="overflow-x-auto">
        {sortedDates.map((dateKey) => {
          const dateItems = groupedByDate[dateKey]
          return (
            <div key={dateKey} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-300 mb-3 px-2">
                {formatDate(dateKey)}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-dark-800">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-dark-800 border-b border-dark-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Agente
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Tickets Procesados
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Meta Tickets
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Squadlinx
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Meta Squadlinx
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      {onDelete && (
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {dateItems.map((item) => {
                      // Handle both data formats (from bulk endpoint and from metrics endpoint)
                      const ticketsActual = item.tickets_processed ?? item.tickets_actual ?? 0
                      const ticketsGoal = item.ticket_goal ?? item.tickets_goal ?? 0
                      const pointsActual = item.squadlinx_points ?? item.points_actual ?? 0
                      const pointsGoal = item.squadlinx_goal ?? item.points_goal ?? 0
                      const agentName = item.agent_name ?? `Agente ${item.agent_id}`
                      const isBurnout = item.is_burnout ?? (pointsActual > 8.0)

                      const meetsGoal = ticketsActual >= ticketsGoal
                      const rowBgColor = meetsGoal
                        ? 'bg-green-900/10 hover:bg-green-900/20'
                        : 'bg-red-900/10 hover:bg-red-900/20'

                      return (
                        <tr
                          key={item.id}
                          className={`${rowBgColor} transition-colors duration-150`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-200">
                            {agentName}
                          </td>
                          <td className={`px-4 py-3 text-sm text-center font-medium ${meetsGoal ? 'text-green-300' : 'text-red-300'
                            }`}>
                            {ticketsActual}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-300">
                            {ticketsGoal}
                          </td>
                          <td className={`px-4 py-3 text-sm text-center font-semibold ${isBurnout ? 'text-red-500' : 'text-gray-300'
                            }`}>
                            {typeof pointsActual === 'number' ? pointsActual.toFixed(1) : '0.0'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-300">
                            {typeof pointsGoal === 'number' ? pointsGoal.toFixed(1) : '0.0'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meetsGoal
                              ? 'bg-green-900/30 text-green-300 border border-green-800'
                              : 'bg-red-900/30 text-red-300 border border-red-800'
                              }`}>
                              {meetsGoal ? '✓ Meta alcanzada' : '✗ Meta no alcanzada'}
                            </span>
                          </td>
                          {onDelete && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                title="Eliminar registro"
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DailyTable

