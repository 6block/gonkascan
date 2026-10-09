import { apiFetch } from '../utils'
import { H100BaselineResponse } from '../types/inference'

export async function fetchH100Baseline(epochIndex: number): Promise<H100BaselineResponse> {
  return apiFetch<H100BaselineResponse>(`/v1/inference/h100-baseline/${epochIndex}`)
}
