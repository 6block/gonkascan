interface LoadMoreBarProps {
  loaded: number
  total: number
  loading?: boolean
  label?: string
  onLoadMore: () => void
}

export function LoadMoreBar({ loaded, total, loading, label = 'Transactions', onLoadMore }: LoadMoreBarProps) {
  const hasMore = loaded < total

  if (!hasMore) {
    return (
      <div className="mt-3 py-3 text-center text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">
        All {total.toLocaleString()} {label.toLowerCase()} loaded
      </div>
    )
  }

  return (
    <button
      onClick={onLoadMore}
      disabled={loading}
      className="w-full mt-3 py-3 text-center text-sm font-medium text-blue-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-60 cursor-pointer"
    >
      {loading ? (
        'Loading...'
      ) : (
        <>Load More {label} ({loaded.toLocaleString()} loaded, more available)</>
      )}
    </button>
  )
}
