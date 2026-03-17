interface ErrorScreenProps {
  error: string | Error | null
  title?: string
  onRetry?: () => void
  className?: string
}

export default function ErrorScreen({
  error,
  title = 'Error',
  onRetry,
  className = 'min-h-screen',
}: ErrorScreenProps) {
  const message = error instanceof Error ? error.message : (error || 'An unknown error occurred')

  return (
    <div className={`${className} bg-gray-50 flex items-center justify-center`}>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 max-w-md w-full">
        <h2 className="text-red-800 text-lg font-semibold mb-2">{title}</h2>
        <p className="text-red-600">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
