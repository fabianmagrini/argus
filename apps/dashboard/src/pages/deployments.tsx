import { useListDeployments, useListTeams, useListRepositories } from "@argus/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Deployments() {
  const [teamId, setTeamId] = useState<number | undefined>();
  const { data: deployments, isLoading } = useListDeployments({ teamId });
  const { data: teams } = useListTeams();
  const { data: repos } = useListRepositories();

  const getRepoName = (id: number) => repos?.find(r => r.id === id)?.name || id;
  const getTeamName = (id?: number | null) => id ? (teams?.find(t => t.id === id)?.name || id) : "-";

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Deployments</h1>
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

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Commit</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead className="text-right">Deployed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : deployments?.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell className="font-medium font-mono text-sm">{getRepoName(d.repositoryId)}</TableCell>
                <TableCell>{d.environment}</TableCell>
                <TableCell>{getTeamName(d.teamId)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.commitSha?.substring(0,7) || '-'}</TableCell>
                <TableCell>{d.leadTimeSeconds ? `${Math.round(d.leadTimeSeconds / 60)}m` : '-'}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(d.deployedAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && deployments?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No deployments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string }> = {
    success: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    failed: { color: "bg-red-500/10 text-red-500 border-red-500/20" },
    running: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    pending: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    rolled_back: { color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  };
  
  const c = config[status] || { color: "bg-gray-500/10 text-gray-500" };
  
  return (
    <Badge variant="outline" className={c.color}>
      {status}
    </Badge>
  );
}
