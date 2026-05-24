import { useGetTeamLeaderboard } from "@argus/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DoraRatingBadge } from "@/components/dora-rating";
import { Trophy } from "lucide-react";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetTeamLeaderboard({ period: "30d" });

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Performance Leaderboard
        </h1>
      </div>

      <div className="border border-border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-center">DORA Rating</TableHead>
              <TableHead className="text-right">Deploy Freq</TableHead>
              <TableHead className="text-right">Lead Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : leaderboard?.map((entry) => (
              <TableRow key={entry.teamId}>
                <TableCell className="text-center font-bold text-lg">
                  {entry.rank === 1 ? <span className="text-yellow-500">1</span> :
                   entry.rank === 2 ? <span className="text-slate-400">2</span> :
                   entry.rank === 3 ? <span className="text-amber-700">3</span> :
                   <span className="text-muted-foreground">{entry.rank}</span>}
                </TableCell>
                <TableCell className="font-medium text-lg">{entry.teamName}</TableCell>
                <TableCell className="text-right font-mono text-xl text-primary">{entry.score}</TableCell>
                <TableCell className="text-center">
                  <DoraRatingBadge rating={entry.doraRating} />
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{entry.deploymentFrequency.toFixed(1)}/d</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{entry.leadTimeDays.toFixed(1)}d</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
