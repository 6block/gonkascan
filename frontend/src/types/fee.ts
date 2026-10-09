export interface FeePayerInfo {
  warm_address: string;
  has_authz_store_commit: boolean;
  has_authz_hardware_diff: boolean;
  has_feegrant: boolean;
  feegrant_expired: boolean;
  is_unlimited: boolean;
  remaining_allowance_ngonka: string | null;
  warm_spendable_ngonka: string;
}

export interface ParticipantFeeStatus {
  participant_id: string;
  cold_spendable_ngonka: string;
  cold_total_ngonka: string;
  cold_vesting_ngonka: string;
  fee_payers: FeePayerInfo[];
  has_valid_fee_payer: boolean;
  warnings: string[];
}

export interface FeeCheckResponse {
  epoch_index: number;
  current_block_height: number;
  current_block_time: string;
  total_participants: number;
  participants_with_issues: number;
  participants: ParticipantFeeStatus[];
}
