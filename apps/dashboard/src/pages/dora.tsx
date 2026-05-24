import { useGetDoraMetrics, useGetDoraTimeseries, useListTeams } from "@argus/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DoraRatingBadge } from "@/components/dora-rating";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Dora() {
  const [teamId, setTeamId] = useState<number | undefined>();
  const { data: teams } = useListTeams();
  const { data: dora, isLoading } = useGetDoraMetrics({ teamId });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">DORA Metrics</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DoraMetricCard 
          title="Deployment Frequency" 
          metric={dora?.deploymentFrequency} 
          loading={isLoading}
          timeseriesMetric="deployment_frequency"
          teamId={teamId}
        />
        <DoraMetricCard 
          title="Lead Time for Changes" 
          metric={dora?.leadTimeForChanges} 
          loading={isLoading}
          timeseriesMetric="lead_time"
          teamId={teamId}
        />
        <DoraMetricCard 
          title="Change Failure Rate" 
          metric={dora?.changeFailureRate} 
          loading={isLoading}
          timeseriesMetric="change_failure_rate"
          teamId={teamId}
        />
        <DoraMetricCard 
          title="Mean Time to Recovery" 
          metric={dora?.meanTimeToRecovery} 
          loading={isLoading}
          timeseriesMetric="recovery_time"
          teamId={teamId}
        />
      </div>
    </div>
  );
}

function DoraMetricCard({ 
  title, 
  metric, 
  loading, 
  timeseriesMetric, 
  teamId 
}: { 
  title: string; 
  metric?: any; 
  loading: boolean;
  timeseriesMetric: "deployment_frequency" | "lead_time" | "change_failure_rate" | "recovery_time";
  teamId?: number;
}) {
  const { data: tsData, isLoading: tsLoading } = useGetDoraTimeseries({ metric: timeseriesMetric, teamId, period: "30d" });

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {metric && <DoraRatingBadge rating={metric.rating} size="sm" />}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {loading ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {metric?.value ?? "-"}
            </span>
            <span className="text-sm text-muted-foreground">{metric?.unit}</span>
          </div>
        )}
        
        <div className="h-[100px] w-full mt-auto pt-4 border-t border-border/50">
          {tsLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tsData || []}>
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 12 }} 
                  labelStyle={{ display: "none" }}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
