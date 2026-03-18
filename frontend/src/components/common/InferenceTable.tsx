import type { InferenceDetail } from '../../types/inference'

interface InferenceTableProps {
  title: string
  data: InferenceDetail[]
  emptyText: string
  onSelect: (inference: InferenceDetail) => void
}

export function InferenceTable({ title, data, emptyText, onSelect }: InferenceTableProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{title}</h3>
      {data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Inference ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Block Height</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Validated By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((inf) => (
                <tr
                  key={inf.inference_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelect(inf)}
                >
                  <td className="px-4 py-2 text-sm font-mono text-gray-700 truncate max-w-xs">{inf.inference_id}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inf.start_block_height}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inf.validated_by.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded">{emptyText}</div>
      )}
    </div>
  )
}
