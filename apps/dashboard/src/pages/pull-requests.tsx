import { useListPullRequests, useListTeams, useListRepositories } from "@argus/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function PRs() {
  const [teamId, setTeamId] = useState<number | undefined>();
  const [state, setState] = useState<"open" | "merged" | "closed" | undefined>();
  const { data: prs, isLoading } = useListPullRequests({ teamId, state });
  const { data: teams } = useListTeams();
  const { data: repos } = useListRepositories();

  const getRepoName = (id: number) => repos?.find(r => r.id === id)?.name || id;
  const getTeamName = (id?: number | null) => id ? (teams?.find(t => t.id === id)?.name || id) : "-";

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pull Requests</h1>
        <div className="flex gap-4">
          <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? undefined : v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Cycle Time</TableHead>
              <TableHead className="text-right">Opened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : prs?.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell>
                  <Badge variant="outline" className={
                    pr.state === 'merged' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                    pr.state === 'closed' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    "bg-green-500/10 text-green-500 border-green-500/20"
                  }>
                    {pr.state}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium max-w-[300px] truncate">{pr.title}</TableCell>
                <TableCell className="font-mono text-sm">{getRepoName(pr.repositoryId)}</TableCell>
                <TableCell>{pr.authorLogin || "-"}</TableCell>
                <TableCell>{pr.cycleTimeSeconds ? `${Math.round(pr.cycleTimeSeconds / 3600)}h` : '-'}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(pr.openedAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && prs?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No pull requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
