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
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-h-[100dvh] sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg shadow-xl overflow-y-auto pb-6 sm:pb-0">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight min-w-0">Hardware Details</h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 -mr-1 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>


        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading hardware details...</div>
        ) : error || !data ? (
          <div className="text-sm text-red-600">Failed to load hardware details</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-12 mb-6 sm:mb-8">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Hardware</div>
                <div className="text-sm font-mono text-gray-900 break-all leading-relaxed">{data.hardware}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount</div>
                <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">{data.amount.toLocaleString()}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Weight</div>
                <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">{data.total_weight.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5 sm:pt-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 sm:mb-4">MLNodes</h3>
              {data.ml_nodes.length === 0 ? (
                <div className="text-sm text-gray-400">No MLNodes reported for this hardware</div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {data.ml_nodes.map((node, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 font-semibold text-gray-900 break-all">{node.local_id}</div>
                      <span className={`inline-block shrink-0 px-2 py-0.5 text-xs font-semibold rounded ${
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
                            <span key={modelIdx} className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-md break-all">{model}</span>
                            ))) : (
                            <span className="text-xs text-gray-400">No models</span>
                           )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hardware</div>
                        <div className="mt-1 space-y-1">
                          {node.hardware.length > 0 ? (node.hardware.map((hw, hwIdx) => (
                            <div key={hwIdx} className="text-xs text-gray-700 break-words">{hw.count}x {hw.type}</div>
                            ))) : (
                            <span className="text-xs text-gray-400 italic">Hardware not reported</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Network</div>
                        <div className="mt-1 text-xs font-mono text-gray-700 break-all">{node.host}:{node.port}</div>
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
