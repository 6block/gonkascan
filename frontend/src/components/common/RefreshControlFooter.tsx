import { EpochSelector } from '../EpochSelector'

interface RefreshControlFooterProps {
  refreshInterval: string
  dataUpdatedAt: number
  isLoading: boolean
  onRefresh: () => void
  selectedEpochId?: number | null
  currentEpochId?: number
  onSelectEpoch?: (epochId: number | null) => void
}

export function RefreshControlFooter({
  refreshInterval,
  dataUpdatedAt,
  isLoading,
  onRefresh,
  selectedEpochId,
  currentEpochId,
  onSelectEpoch,
}: RefreshControlFooterProps) {
  const showEpochSelector = currentEpochId !== undefined && onSelectEpoch !== undefined

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
      <div className="flex-1 flex items-center justify-center sm:justify-start">
        {(selectedEpochId === null || selectedEpochId === undefined) && (
          <span className="text-xs text-gray-500 text-center sm:text-left">
            Auto-refreshing every {refreshInterval}
            {dataUpdatedAt && ` (${Math.floor((Date.now() - dataUpdatedAt) / 1000)}s ago)`}
          </span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        {showEpochSelector && (
          <div className="w-full sm:w-auto">
            <EpochSelector
              currentEpochId={currentEpochId}
              selectedEpochId={selectedEpochId ?? null}
              onSelectEpoch={onSelectEpoch}
              disabled={isLoading}
            />
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
