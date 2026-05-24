import { useGetMetricsSummary, useGetActivityFeed, useGetDoraTimeseries } from "@argus/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { DoraRatingBadge } from "@/components/dora-rating";

export default function Overview() {
  const { data: summary, isLoading: loadingSummary } = useGetMetricsSummary();
  const { data: activity, isLoading: loadingActivity } = useGetActivityFeed();
  const { data: timeseries, isLoading: loadingTimeseries } = useGetDoraTimeseries({ metric: "deployment_frequency", period: "30d" });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        {summary && <DoraRatingBadge rating={summary.doraRating} size="lg" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Deployments" value={summary?.totalDeployments} loading={loadingSummary} />
        <MetricCard title="Success Rate" value={summary?.successRate ? `${summary.successRate}%` : undefined} loading={loadingSummary} />
        <MetricCard title="Avg Lead Time" value={summary?.avgLeadTimeDays ? `${summary.avgLeadTimeDays}d` : undefined} loading={loadingSummary} />
        <MetricCard title="Open Incidents" value={summary?.openIncidents} loading={loadingSummary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Deployment Frequency (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTimeseries ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseries || []}>
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {activity?.map((item) => (
                  <div key={item.id} className="flex flex-col space-y-1 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.type}</span>
                      <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                    <div className="flex gap-2 mt-1">
                      {item.teamName && <Badge variant="outline" className="text-xs">{item.teamName}</Badge>}
                      {item.status && <Badge variant="secondary" className="text-xs">{item.status}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
