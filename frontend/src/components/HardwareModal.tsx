import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HardwareDetailsResponse, HardwareStats } from '../types/inference'

interface HardwareModalProps {
  hardware: HardwareStats | null
  epochId: number
  currentEpochId: number | null
  onClose: () => void
}

export function HardwareModal({ hardware, epochId, currentEpochId, onClose }: HardwareModalProps) {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const hardwareId = hardware?.id ?? ''

  const { data, isLoading, error } = useQuery<HardwareDetailsResponse>({
    queryKey: ['hardware-details', hardwareId, epochId],
    queryFn: async () => {
      const endpoint = `${apiUrl}/v1/hardware/${encodeURIComponent(hardwareId)}?epoch_id=${epochId}`
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        return response.json()
    },
    enabled: !!hardware && !!currentEpochId && epochId >= currentEpochId - 1,
    staleTime: 60000,
  })


  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!hardware) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Hardware Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>


        <div className="px-6 py-6">
        {isLoading ? (
          <div className="text-gray-400">Loading hardware details...</div>
        ) : error || !data ? (
          <div className="text-red-600">Failed to load hardware details</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-12 mb-8">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Hardware</div>
                <div className="text-sm font-mono text-gray-900 break-all">{data.hardware}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount</div>
                <div className="text-l font-semibold text-gray-900">{data.amount.toLocaleString()}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Weight</div>
                <div className="text-l font-semibold text-gray-900">{data.total_weight.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">MLNodes</h3>
              {data.ml_nodes.length === 0 ? (
                <div className="text-gray-400 text-sm">No MLNodes reported for this hardware</div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.ml_nodes.map((node, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-gray-900">{node.local_id}</div>
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                        node.status === 'FAILED'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-blue-100 text-blue-700 border border-blue-300'
                      }`}>{node.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {node.poc_weight !== null && node.poc_weight !== undefined && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</div>
                          <div className="mt-1 text-sm text-gray-900">{node.poc_weight.toLocaleString()}</div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Models</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {node.models.length > 0 ? (node.models.map((model, modelIdx) => (
                            <span key={modelIdx} className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">{model}</span>
                            ))) : (
                            <span className="text-xs text-gray-400">No models</span>
                           )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hardware</div>
                        <div className="mt-1 space-y-1">
                          {node.hardware.length > 0 ? (node.hardware.map((hw, hwIdx) => (
                            <div key={hwIdx} className="text-xs text-gray-700">{hw.count}x {hw.type}</div>
                            ))) : (
                            <span className="text-xs text-gray-400 italic">Hardware not reported</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Network</div>
                        <div className="mt-1 text-xs font-mono text-gray-700">{node.host}:{node.port}</div>
                      </div>
                    </div>
                    </div>
                ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
