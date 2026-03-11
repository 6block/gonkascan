import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ModelInfo, ModelStats, ModelEpochTokenUsageResponse } from '../types/inference'
import { ModelTokenUsageChart } from './ModelChart'

interface ModelModalProps {
  model: ModelInfo | null
  stats: ModelStats | null
  onClose: () => void
}

export function ModelModal({ model, stats, onClose }: ModelModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const modelId = model?.id ?? ''

  const fetchTokenUsage = async () => {
    const endpoint = `${apiUrl}/v1/models/token-usage?model=${encodeURIComponent(modelId)}`
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return response.json()
  }

  const { data: tokenUsage } = useQuery<ModelEpochTokenUsageResponse>({
    queryKey: ['model-token-usage', modelId],
    queryFn: fetchTokenUsage,
    enabled: !!model,
  })

  if (!model) return null

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
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight min-w-0">Model Details</h2>
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
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Model ID
            </h3>
            <p className="text-sm sm:text-base font-mono text-gray-900 break-all">{model.id}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Total Weight
              </h3>
              <p className="text-base text-gray-900">{model.total_weight.toLocaleString()}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Participant Count
              </h3>
              <p className="text-base text-gray-900">{model.participant_count}</p>
            </div>
          </div>

          {stats && (
            <div className="border-t border-gray-200 pt-5 sm:pt-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Usage Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Total Inferences
                  </h3>
                  <p className="text-base text-gray-900">{stats.inferences.toLocaleString()}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    AI Tokens
                  </h3>
                  <p className="text-base text-gray-900">{parseInt(stats.ai_tokens).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {tokenUsage && tokenUsage.data.length > 0 && (
            <ModelTokenUsageChart data={tokenUsage.data} />
          )}

          <div className="border-t border-gray-200 pt-5 sm:pt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Technical Details</h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Proposed By
                </h3>
                <p className="text-sm sm:text-base font-mono text-gray-900 break-all">{model.proposed_by}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    VRAM
                  </h3>
                  <p className="text-base text-gray-900">{model.v_ram} GB</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Throughput
                  </h3>
                  <p className="text-base text-gray-900">{model.throughput_per_nonce}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Compute Units
                  </h3>
                  <p className="text-base text-gray-900">{model.units_of_compute_per_token}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  HuggingFace Repository
                </h3>
                <a
                  href={`https://huggingface.co/${model.hf_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  {model.hf_repo}
                </a>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  HuggingFace Commit
                </h3>
                <p className="text-sm sm:text-base font-mono text-gray-900 break-all">{model.hf_commit}</p>
              </div>

              {model.model_args.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Model Arguments
                  </h3>
                  <div className="bg-gray-50 rounded-md p-2.5 sm:p-3 font-mono text-xs sm:text-sm text-gray-900 break-all overflow-x-auto">
                    {model.model_args.join(' ')}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Validation Threshold
                </h3>
                <p className="text-sm sm:text-base font-mono text-gray-900 break-words">
                  {model.validation_threshold.value} × 10^{model.validation_threshold.exponent}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

