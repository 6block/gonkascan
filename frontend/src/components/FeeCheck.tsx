import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { FeeCheckResponse, ParticipantFeeStatus } from "@/types/fee";
import { formatGNK } from "@/utils";

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load fee check data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const issueParticipants = data.participants.filter(p => !p.has_valid_fee_payer);
  const healthyParticipants = data.participants.filter(p => p.has_valid_fee_payer);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Epoch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.epoch_index}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Block {data.current_block_height.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_participants}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current epoch validators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {data.participants_with_issues === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-500">Healthy</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-500">
                    {data.participants_with_issues}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.participants_with_issues === 0
                ? "All participants configured correctly"
                : `${data.participants_with_issues} participant(s) with issues`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Participants with Issues */}
      {issueParticipants.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Participants with Fee Payment Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {issueParticipants.map((p) => (
              <ParticipantCard key={p.participant_id} participant={p} hasIssue={true} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Healthy Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Healthy Participants ({healthyParticipants.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthyParticipants.slice(0, 5).map((p) => (
            <ParticipantCard key={p.participant_id} participant={p} hasIssue={false} />
          ))}
          {healthyParticipants.length > 5 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              ... and {healthyParticipants.length - 5} more
            </p>
          )}
        </CardContent>
      </Card>
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
    <div className={`border rounded-lg p-4 ${hasIssue ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <code className="text-sm font-mono break-all">{participant.participant_id}</code>
        </div>
        <Badge variant={hasIssue ? "destructive" : "default"} className="ml-2 shrink-0">
          {hasIssue ? "Issue" : "OK"}
        </Badge>
      </div>

      {/* Cold Account Balance */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div>
          <p className="text-muted-foreground">Spendable</p>
          <p className="font-mono">{formatGNK(participant.cold_spendable_ngonka)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-mono">{formatGNK(participant.cold_total_ngonka)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Vesting</p>
          <p className="font-mono">{formatGNK(participant.cold_vesting_ngonka)}</p>
        </div>
      </div>

      {/* Fee Payers */}
      {participant.fee_payers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fee Payers ({participant.fee_payers.length})</p>
          {participant.fee_payers.map((payer, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-muted text-sm space-y-1">
              <code className="text-xs break-all">{payer.warm_address}</code>
              <div className="flex flex-wrap gap-2 mt-1">
                {payer.has_authz_store_commit && (
                  <Badge variant="outline" className="text-xs">StoreCommit</Badge>
                )}
                {payer.has_authz_hardware_diff && (
                  <Badge variant="outline" className="text-xs">HardwareDiff</Badge>
                )}
                {payer.has_feegrant && !payer.feegrant_expired && (
                  <Badge variant="outline" className="text-xs">
                    {payer.is_unlimited ? "Unlimited" : `${formatGNK(payer.remaining_allowance_ngonka || "0")} left`}
                  </Badge>
                )}
                {payer.feegrant_expired && (
                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Warm balance: {formatGNK(payer.warm_spendable_ngonka)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {participant.warnings.length > 0 && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <ul className="list-disc pl-4 space-y-1">
              {participant.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
