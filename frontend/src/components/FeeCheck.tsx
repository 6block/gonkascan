import { useEffect, useState } from "react";
import { FeeCheckResponse, ParticipantFeeStatus, FeePayerInfo } from "../types/fee";
import { formatGNK } from "../utils";

export default function FeeCheck() {
  const [data, setData] = useState<FeeCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeeCheck = async () => {
      try {
        const response = await fetch("/api/v1/participants/fee-check");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchFeeCheck();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Failed to load fee check data: {error}
        </p>
      </div>
    );
  }

  const issueParticipants = data.participants.filter(p => !p.has_valid_fee_payer);
  const healthyParticipants = data.participants.filter(p => p.has_valid_fee_payer);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-1 dark:bg-surface-1-dark border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Epoch
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {data.epoch_index}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Block {data.current_block_height.toLocaleString()}
          </p>
        </div>

        <div className="bg-surface-1 dark:bg-surface-1-dark border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Total Participants
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {data.total_participants}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Current epoch validators
          </p>
        </div>

        <div className="bg-surface-1 dark:bg-surface-1-dark border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Fee Payment Status
          </div>
          <div className="flex items-center gap-2">
            {data.participants_with_issues === 0 ? (
              <>
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-2xl font-bold text-green-500">Healthy</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-2xl font-bold text-red-500">
                  {data.participants_with_issues}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            {data.participants_with_issues === 0
              ? "All participants configured correctly"
              : `${data.participants_with_issues} participant(s) with issues`}
          </p>
        </div>
      </div>

      {/* Participants with Issues */}
      {issueParticipants.length > 0 && (
        <div className="bg-surface-1 dark:bg-surface-1-dark border-2 border-red-200 dark:border-red-900 rounded-lg">
          <div className="p-6 border-b border-red-200 dark:border-red-900">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Participants with Fee Payment Issues
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {issueParticipants.map((p: ParticipantFeeStatus) => (
              <ParticipantCard key={p.participant_id} participant={p} hasIssue={true} />
            ))}
          </div>
        </div>
      )}

      {/* Healthy Participants */}
      <div className="bg-surface-1 dark:bg-surface-1-dark border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Healthy Participants ({healthyParticipants.length})
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {healthyParticipants.slice(0, 5).map((p: ParticipantFeeStatus) => (
            <ParticipantCard key={p.participant_id} participant={p} hasIssue={false} />
          ))}
          {healthyParticipants.length > 5 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500 text-center pt-2">
              ... and {healthyParticipants.length - 5} more
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantCard({
  participant,
  hasIssue
}: {
  participant: ParticipantFeeStatus;
  hasIssue: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 ${hasIssue ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20' : 'border-neutral-200 dark:border-neutral-700'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <code className="text-sm font-mono break-all text-neutral-900 dark:text-neutral-100">{participant.participant_id}</code>
        </div>
        <span className={`ml-2 shrink-0 px-2 py-1 text-xs font-medium rounded ${hasIssue ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'}`}>
          {hasIssue ? "Issue" : "OK"}
        </span>
      </div>

      {/* Cold Account Balance */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div>
          <p className="text-neutral-600 dark:text-neutral-400">Spendable</p>
          <p className="font-mono text-neutral-900 dark:text-neutral-100">{formatGNK(Number(participant.cold_spendable_ngonka) / 1e9)}</p>
        </div>
        <div>
          <p className="text-neutral-600 dark:text-neutral-400">Total</p>
          <p className="font-mono text-neutral-900 dark:text-neutral-100">{formatGNK(Number(participant.cold_total_ngonka) / 1e9)}</p>
        </div>
        <div>
          <p className="text-neutral-600 dark:text-neutral-400">Vesting</p>
          <p className="font-mono text-neutral-900 dark:text-neutral-100">{formatGNK(Number(participant.cold_vesting_ngonka) / 1e9)}</p>
        </div>
      </div>

      {/* Fee Payers */}
      {participant.fee_payers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Fee Payers ({participant.fee_payers.length})</p>
          {participant.fee_payers.map((payer: FeePayerInfo, idx: number) => (
            <div key={idx} className="pl-4 border-l-2 border-neutral-300 dark:border-neutral-600 text-sm space-y-1">
              <code className="text-xs break-all text-neutral-800 dark:text-neutral-200">{payer.warm_address}</code>
              <div className="flex flex-wrap gap-2 mt-1">
                {payer.has_authz_store_commit && (
                  <span className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    StoreCommit
                  </span>
                )}
                {payer.has_authz_hardware_diff && (
                  <span className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    HardwareDiff
                  </span>
                )}
                {payer.has_feegrant && !payer.feegrant_expired && (
                  <span className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {payer.is_unlimited ? "Unlimited" : `${formatGNK(Number(payer.remaining_allowance_ngonka || "0") / 1e9)} left`}
                  </span>
                )}
                {payer.feegrant_expired && (
                  <span className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                Warm balance: {formatGNK(Number(payer.warm_spendable_ngonka) / 1e9)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {participant.warnings.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <div className="flex gap-2">
            <svg className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm">
              <ul className="list-disc pl-4 space-y-1 text-red-800 dark:text-red-200">
                {participant.warnings.map((warning: string, idx: number) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
