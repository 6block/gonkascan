import { useQuery } from '@tanstack/react-query'
import { fetchH100Baseline } from '../api/h100Baseline'

export function useH100Baseline(epochIndex: number | undefined) {
  return useQuery({
    queryKey: ['h100-baseline', epochIndex],
    queryFn: () => fetchH100Baseline(epochIndex!),
    enabled: epochIndex !== undefined && epochIndex >= 0,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
    gcTime: 30 * 60 * 1000,   // 30 分钟保留
  })
}
