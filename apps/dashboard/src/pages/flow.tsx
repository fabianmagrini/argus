import { useGetFlowMetrics, useListTeams } from "@argus/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Flow() {
  const [teamId, setTeamId] = useState<number | undefined>();
  const { data: teams } = useListTeams();
  const { data: flow, isLoading } = useGetFlowMetrics({ teamId });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Flow Metrics</h1>
        <Select value={teamId?.toString() || "all"} onValueChange={(v) => setTeamId(v === "all" ? undefined : parseInt(v))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams?.map(t => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Avg Cycle Time" value={flow?.avgCycleTimeDays ? `${flow.avgCycleTimeDays} days` : undefined} loading={isLoading} />
        <MetricCard title="Median Cycle Time" value={flow?.medianCycleTimeDays ? `${flow.medianCycleTimeDays} days` : undefined} loading={isLoading} />
        <MetricCard title="Throughput (Weekly)" value={flow?.throughputPerWeek} loading={isLoading} />
        <MetricCard title="WIP Count" value={flow?.wipCount} loading={isLoading} />
        <MetricCard title="PR Merge Rate" value={flow?.prMergeRate ? `${flow.prMergeRate}%` : undefined} loading={isLoading} />
        <MetricCard title="Review Turnaround" value={flow?.reviewTurnaroundHours ? `${flow.reviewTurnaroundHours} hrs` : undefined} loading={isLoading} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, loading }: { title: string; value?: string | number; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold">{value !== undefined ? value : "-"}</div>
        )}
      </CardContent>
    </Card>
  );
}
