import { useListIncidents, useListTeams } from "@argus/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Incidents() {
  const [teamId, setTeamId] = useState<number | undefined>();
  const [status, setStatus] = useState<"open" | "resolved" | undefined>();
  const { data: incidents, isLoading } = useListIncidents({ teamId, status });
  const { data: teams } = useListTeams();

  const getTeamName = (id?: number | null) => id ? (teams?.find(t => t.id === id)?.name || id) : "-";

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
        <div className="flex gap-4">
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
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
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Recovery Time</TableHead>
              <TableHead className="text-right">Opened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : incidents?.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell>
                  <Badge variant="outline" className={
                    incident.severity === 'p1' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    incident.severity === 'p2' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  }>
                    {incident.severity.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={incident.status === "open" ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}>
                    {incident.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{incident.title}</TableCell>
                <TableCell>{getTeamName(incident.teamId)}</TableCell>
                <TableCell>{incident.recoveryTimeSeconds ? `${Math.round(incident.recoveryTimeSeconds / 3600)}h` : '-'}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(incident.openedAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && incidents?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No incidents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
