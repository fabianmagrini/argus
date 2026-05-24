import {
  useGetTeam,
  useGetDoraMetrics,
  useGetFlowMetrics,
  getGetTeamQueryKey,
  getGetDoraMetricsQueryKey,
  getGetFlowMetricsQueryKey,
  getListTeamsQueryKey,
} from "@argus/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoraRatingBadge } from "@/components/dora-rating";

export default function TeamDetail() {
  const params = useParams();
  const teamId = parseInt(params.id || "0");
  
  const { data: team, isLoading: loadingTeam } = useGetTeam(teamId, { query: { enabled: !!teamId, queryKey: getGetTeamQueryKey(teamId) } });
  const { data: dora, isLoading: loadingDora } = useGetDoraMetrics({ teamId }, { query: { enabled: !!teamId, queryKey: getGetDoraMetricsQueryKey({ teamId }) } });
  const { data: flow, isLoading: loadingFlow } = useGetFlowMetrics({ teamId }, { query: { enabled: !!teamId, queryKey: getGetFlowMetricsQueryKey({ teamId }) } });

  if (!teamId) return <div>Invalid team ID</div>;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        {loadingTeam ? <Skeleton className="h-10 w-64 mb-2" /> : <h1 className="text-3xl font-bold tracking-tight">{team?.name}</h1>}
        {loadingTeam ? <Skeleton className="h-4 w-96" /> : <p className="text-muted-foreground">{team?.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>DORA Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingDora ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <>
                <DoraRow label="Deployment Frequency" metric={dora?.deploymentFrequency} />
                <DoraRow label="Lead Time for Changes" metric={dora?.leadTimeForChanges} />
                <DoraRow label="Change Failure Rate" metric={dora?.changeFailureRate} />
                <DoraRow label="Mean Time to Recovery" metric={dora?.meanTimeToRecovery} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flow Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             {loadingFlow ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <>
                <FlowRow label="Avg Cycle Time" value={flow?.avgCycleTimeDays ? `${flow.avgCycleTimeDays} days` : "-"} />
                <FlowRow label="Median Cycle Time" value={flow?.medianCycleTimeDays ? `${flow.medianCycleTimeDays} days` : "-"} />
                <FlowRow label="Throughput" value={flow?.throughputPerWeek ? `${flow.throughputPerWeek}/wk` : "-"} />
                <FlowRow label="PR Merge Rate" value={flow?.prMergeRate ? `${flow.prMergeRate}%` : "-"} />
                <FlowRow label="WIP Count" value={flow?.wipCount ?? "-"} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DoraRow({ label, metric }: { label: string; metric?: any }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold font-mono">{metric?.value ?? "-"}</span>
        <div className="w-24 flex justify-end">
          <DoraRatingBadge rating={metric?.rating} size="sm" />
        </div>
      </div>
    </div>
  );
}

function FlowRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="font-medium">{label}</span>
      <span className="text-xl font-bold font-mono">{value}</span>
    </div>
  );
}
