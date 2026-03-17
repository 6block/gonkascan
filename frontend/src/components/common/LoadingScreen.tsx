interface LoadingScreenProps {
  label?: string
  className?: string
}

export default function LoadingScreen({
  label = 'Loading...',
  className = 'min-h-screen',
}: LoadingScreenProps) {
  return (
    <div className={`${className} bg-gray-50 flex items-center justify-center`}>
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">{label}</p>
      </div>
    </div>
  )
}
