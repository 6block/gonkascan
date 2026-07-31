export interface ChartTooltipPayloadEntry {
  dataKey: string
  value: number
  name: string
  stroke?: string
  fill?: string
  color?: string
  payload: Record<string, unknown>
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipPayloadEntry[]
  label?: string | number
}

export interface CurrentEpochStats {
  inference_count: string;
  missed_requests: string;
  earned_coins: string;
  rewarded_coins: string;
  burned_coins: string;
  validated_inferences: string;
  invalidated_inferences: string;
}

export interface CollateralStatus {
  potential_weight: number;
  effective_weight: number;
  collateral_ratio: number;
  needed_ngonka: string,
}

export interface ConfirmationRateEstimate {
  value: number;
  source: string;
  state: string;
}

export interface Participant {
  index: string;
  address: string;
  weight: number;
  validator_key?: string;
  inference_url?: string;
  status?: string;
  models: string[];
  current_epoch_stats: CurrentEpochStats;
  missed_rate: number;
  invalidation_rate: number;
  is_jailed?: boolean;
  jailed_until?: string;
  ready_to_unjail?: boolean;
  node_healthy?: boolean;
  node_health_checked_at?: string;
  moniker?: string;
  identity?: string;
  keybase_username?: string;
  keybase_picture_url?: string;
  website?: string;
  validator_consensus_key?: string;
  consensus_key_mismatch?: boolean;
  weight_to_confirm?: number | null;
  confirmation_weight?: number | null;
  confirmation_poc_ratio?: number | null;
  confirmation_poc_ratio_source?: string | null;
  confirmation_poc_ratio_state?: string | null;
  confirmation_poc_ratio_estimate?: ConfirmationRateEstimate | null;
  participant_status?: string | null;
  collateral_status?: CollateralStatus;
}

export interface HardwareParticipants {
  hardware: string;
  participants: string[];
}

export interface InferenceResponse {
  epoch_id: number;
  height: number;
  participants: Participant[];
  hardware?: HardwareParticipants[];
  cached_at?: string;
  is_current: boolean;
  total_assigned_rewards_gnk?: number;
  current_block_height?: number;
  current_block_timestamp?: string;
  avg_block_time?: number;
  next_poc_start_block?: number;
  set_new_validators_block?: number;
}

export interface RewardInfo {
  epoch_id: number;
  assigned_reward_gnk: number;
  claimed: boolean;
}

export interface SeedInfo {
  participant: string;
  epoch_index: number;
  signature: string;
}

export interface WarmKeyInfo {
  grantee_address: string;
  granted_at: string;
}

export interface HardwareInfo {
  type: string;
  count: number;
}

export interface MLNodeInfo {
  local_id: string;
  status: string;
  models: string[];
  hardware: HardwareInfo[];
  host: string;
  port: string;
  poc_weight?: number;
  raw_poc_weight?: number | null;
  scaled_weight?: number | null;
  model_id?: string | null;
  weight_scale_factor?: string | null;
}

export interface ParticipantDetailsResponse {
  participant: Participant;
  rewards: RewardInfo[];
  seed: SeedInfo | null;
  warm_keys: WarmKeyInfo[];
  ml_nodes: MLNodeInfo[];
}

export interface BlockInfo {
  height: number;
  timestamp: string;
}

export interface TimelineEvent {
  block_height: number;
  description: string;
  occurred: boolean;
}

export interface TimelineResponse {
  current_block: BlockInfo;
  reference_block: BlockInfo;
  avg_block_time: number;
  events: TimelineEvent[];
  current_epoch_start: number;
  current_epoch_index: number;
  epoch_length: number;
  epoch_stages?: {
    inference_validation_cutoff: number;
    next_poc_start: number;
    set_new_validators: number;
    [key: string]: unknown;
  };
  next_epoch_stages?: {
    set_new_validators: number;
    inference_validation_cutoff: number;
    next_poc_start: number;
    poc_start: number;
    [key: string]: unknown;
  };
}

export interface ModelInfo {
  id: string;
  total_weight: number;
  participant_count: number;
  proposed_by: string;
  v_ram: string;
  throughput_per_nonce: string;
  units_of_compute_per_token: string;
  hf_repo: string;
  hf_commit: string;
  model_args: string[];
  validation_threshold: {
    value: string;
    exponent: number;
  };
}

export interface ModelStats {
  model: string;
  ai_tokens: string;
  inferences: number;
}

export interface ModelsResponse {
  epoch_id: number;
  height: number;
  models: ModelInfo[];
  stats: ModelStats[];
  cached_at: string;
  is_current: boolean;
  current_block_timestamp?: string;
  avg_block_time?: number;
}

export interface InferenceDetail {
  inference_id: string;
  status: string;
  start_block_height: string;
  start_block_timestamp: string;
  validated_by: string[];
  prompt_hash?: string;
  response_hash?: string;
  prompt_payload?: string;
  response_payload?: string;
  prompt_token_count?: string;
  completion_token_count?: string;
  model?: string;
}

export interface ParticipantInferencesResponse {
  epoch_id: number;
  participant_id: string;
  successful: InferenceDetail[];
  expired: InferenceDetail[];
  invalidated: InferenceDetail[];
  cached_at?: string;
}


export interface Transaction {
  height: number;
  tx_hash: string;
  messages: string[];
  timestamp?: string;
  status?: string;
}

export interface TransactionsResponse {
  height: number;
  epoch: number;
  transactions: Transaction[]
}

export interface AddressTransactionsResponse {
  total: number;
  address: string;
  transactions: Transaction[]
}

export interface TransferTransaction {
  height: number;
  tx_hash: string;
  msg_type: string;
  from_address: string;
  to_address: string;
  amount: BalanceInfo[];
  status: string;
  timestamp?: string;
}

export interface AddressTransfersResponse {
  total: number;
  address: string;
  transfers: TransferTransaction[];
}

export interface ParticipantMapItem{
  index: string;
  inference_url: string;
  ip: string;
  country_code?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude: number;
  longitude: number;
  last_updated: string;
}  

export interface ParticipantMapResponse {
  total_participant: number;
  participants: ParticipantMapItem[];
}

export interface BalanceInfo {
  amount: string;
  denom: string;
}

export interface EpochSchedule {
  coins: BalanceInfo[];
}

export interface TokenMetadata {
  symbol: string;
  // null when the scale is unknown — render the raw amount in that case
  decimals: number | null;
  base_denom: string | null;
  origin_chain: string | null;
  origin_chain_id: string | null;
  channel_id: string | null;
}

export interface AssetsResponse {
  address: string;
  balances: BalanceInfo[];
  total_vesting: BalanceInfo[];
  epoch_amounts: EpochSchedule[];
  total_rewarded: BalanceInfo;
  token_metadata?: Record<string, TokenMetadata>;
}

export interface EpochSeriesPoint {
  epoch_id: number
  value: number
}

export interface ModelSeries {
  total_weight: Record<string, EpochSeriesPoint[]>
  hosts: Record<string, EpochSeriesPoint[]>
  inferences: Record<string, EpochSeriesPoint[]>
  ai_tokens: Record<string, EpochSeriesPoint[]>
}

export interface ModelEpochSeriesResponse {
  models: string[]
  series: ModelSeries
}

export interface ModelEpochTokenUsageItem {
  epoch: number
  prompt_token: number
  completion_token: number
  inference_count: number
}

export interface ModelEpochTokenUsageResponse {
  model: string
  data: ModelEpochTokenUsageItem[]
}

export interface InferenceRecentBucket {
  count: number;
  finished?: number;
  tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  active_executors?: number;
  active_creators?: number;
  active_models?: number;
}

export interface InferenceGatewayRow {
  address: string;
  addresses?: string[];
  name: string;
  host?: string;
  url?: string;
  known?: boolean;
  inferences: number;
  tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  inference_share: number;
  token_share: number;
}

export interface InferenceTopModel {
  model: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost?: number;
}

export interface InferenceSeriesPoint {
  ts: string;
  /** Upstream reuses the `model` key for the gateway name when
   *  breakdown=gateway, so this is the series label either way. */
  model: string;
  requests: number;
  prompt: number;
  completion: number;
}

export interface InferenceTimeseries {
  bucket: string;
  from: string;
  to: string;
  breakdown: string;
  series: InferenceSeriesPoint[];
}

export interface InferenceEpochHistoryEntry {
  epoch: number;
  requests: number;
  validated: number;
  invalidated: number;
  missed: number;
  failed: number;
  passed_pct: number;
  failed_pct?: number;
  participants?: number;
}

export interface InferenceStatsTotals {
  requests: number;
  validated: number;
  invalidated: number;
  missed: number;
  failed: number;
  passed_pct: number;
  epochs: number;
}

export interface InferenceStatsResponse {
  recent?: { hour?: InferenceRecentBucket; day?: InferenceRecentBucket; week?: InferenceRecentBucket } | null;
  gateways?: { hours?: number; rows?: InferenceGatewayRow[] } | null;
  top_models?: InferenceTopModel[] | null;
  timeseries_model?: InferenceTimeseries | null;
  timeseries_gateway?: InferenceTimeseries | null;
  epochs_history: InferenceEpochHistoryEntry[];
  totals: InferenceStatsTotals;
  fetched_at: Record<string, string | null>;
  source: string;
  source_url: string;
}

export interface HardwareStats {
  id: string;
  amount: number;
  active_amount?: number;
  total_weight: number;
  models: string[];
}

export interface HardwaresResponse {
  epoch_id: number;
  is_current: boolean;
  total_weight: number;
  total_amount?: number;
  total_active_amount?: number;
  hardware: HardwareStats[];
}

export interface HardwareParticipateCount {
  particiapte_id: string;
  count: number;
}

export interface HardwareDetailsResponse {
  hardware: string;
  epoch_id: number;
  amount: number;
  active_amount?: number;
  total_weight: number;
  particiaptes: HardwareParticipateCount[];
  ml_nodes: MLNodeInfo[];
}

export interface HardwareSeries {
  amount: Record<string, EpochSeriesPoint[]>;
  active_amount?: Record<string, EpochSeriesPoint[]>;
  total_weight: Record<string, EpochSeriesPoint[]>;
}

export interface HardwareEpochSeriesResponse {
  hardware: string[];
  series: HardwareSeries;
}

export interface CosmosMessage {
  '@type': string
  msgs?: CosmosMessage[]
  creator?: string
  sender?: string
  voter?: string
  option?: string
  weight?: string
  [key: string]: unknown
}

export interface TallyResult {
  yes_count: string
  no_count: string
  abstain_count: string
  no_with_veto_count: string
}

export interface GovernanceProposal {
  id: number
  title: string
  summary: string
  status: string
  submit_time: string
  voting_start_time?: string
  voting_end_time?: string
  messages: CosmosMessage[]
  metadata: string
  epoch_id: number
  final_tally_result: TallyResult
  tally_params?: {
    quorum?: string
    threshold?: string
    expedited_threshold?: string
    veto_threshold?: string
  }
  expedited?: boolean
  total_weight: number
  voted_weight: number
  total_voters: number
  total_participants: number
}

export interface ProposalDetailResponse {
  proposal: GovernanceProposal
  diff_params: CosmosMessage[]
}

export interface TxResult {
  code: number
  gas_used: string
  gas_wanted: string
  log?: string
}

export interface BlockTx {
  hash: string
  body: {
    messages: CosmosMessage[]
  }
  auth_info: {
    fee?: {
      gas_limit?: string
    }
  }
}

export interface BlockDetailResponse {
  header: {
    height: string
    time: string
  }
  data: {
    txs: BlockTx[]
  }
  result: {
    txs_results: TxResult[]
  }
}

export type TxStatus = 'Success' | 'Failed' | 'Unknown'

export interface TxRowData {
  key: string
  txhash: string
  msgType: string
  creator: string
  status: TxStatus
  gasUsed: string
  gasWanted: string
  errorLog: string | null
}

export interface TransactionDetailResponse {
  height: string
  txhash: string
  code: number
  timestamp: string
  gas_wanted: string
  gas_used: string
  tx: {
    body: {
      messages: CosmosMessage[]
      memo: string
    }
    auth_info: {
      fee: {
        amount: { denom: string; amount: string }[]
        gas_limit: string
      }
    }
  }
}
