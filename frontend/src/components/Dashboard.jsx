import { useState, useEffect } from 'react'
import { Upload, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import axios from 'axios'
import DailyTable from './DailyTable'
import SprintHeatmap from './SprintHeatmap'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Dashboard() {
  const [rawData, setRawData] = useState('')
  const [processedData, setProcessedData] = useState([])
  const [historicalMetrics, setHistoricalMetrics] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [baseYear, setBaseYear] = useState(new Date().getFullYear())

  const handleProcessData = async () => {
    if (!rawData.trim()) {
      setError('Por favor, ingresa datos para procesar')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload-raw-data`,
        {
          raw_data: rawData,
          base_year: baseYear
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      setProcessedData(response.data)
      setSuccess(true)
      setRawData('') // Clear textarea after successful processing
    } catch (err) {
      console.error('Error processing data:', err)
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Error al procesar los datos. Por favor, verifica el formato.'
      )
      setProcessedData([])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setRawData('')
    setProcessedData([])
    setError(null)
    setSuccess(false)
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
      {/* Upload Section */}
      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Cargar Datos
          </h2>
          <p className="text-gray-400 text-sm">
            Pega aquí los datos copiados desde Excel
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Año base
            </label>
            <input
              type="number"
              value={baseYear}
              onChange={(e) => setBaseYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="input-field w-32"
              min="2020"
              max="2100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Datos crudos (Excel)
            </label>
            <textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder="Pega aquí los datos copiados desde Excel..."
              className="input-field min-h-[200px] font-mono text-sm"
              disabled={loading}
            />
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
              <span>Datos procesados exitosamente. {processedData.length} registros cargados.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleProcessData}
              disabled={loading || !rawData.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Procesar Data
                </>
              )}
            </button>
            {(rawData || processedData.length > 0) && (
              <button
                onClick={handleClear}
                disabled={loading}
                className="btn-secondary"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

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

