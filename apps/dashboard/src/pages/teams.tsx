import { useListTeams, useGetTeamHealthMetrics, useCreateTeam, getListTeamsQueryKey, getGetTeamHealthMetricsQueryKey } from "@argus/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DoraRatingBadge } from "@/components/dora-rating";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Teams() {
  const { data: teams, isLoading: loadingTeams } = useListTeams();
  const { data: health, isLoading: loadingHealth } = useGetTeamHealthMetrics();
  
  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <CreateTeamDialog />
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Health Score</TableHead>
              <TableHead>DORA Rating</TableHead>
              <TableHead>Deployments</TableHead>
              <TableHead>Incidents</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingTeams || loadingHealth ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : teams?.map((team) => {
              const h = health?.find(x => x.teamId === team.id);
              return (
                <TableRow key={team.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-xs text-muted-foreground">{team.description || "No description"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{h?.healthScore ?? "-"}</span>
                  </TableCell>
                  <TableCell>
                    <DoraRatingBadge rating={h?.doraRating} />
                  </TableCell>
                  <TableCell>{h?.deploymentCount ?? "-"}</TableCell>
                  <TableCell>{h?.incidentCount ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teams/${team.id}`}>View Details</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const createTeam = useCreateTeam();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTeam.mutate({ data: { name, description: desc } }, {
      onSuccess: () => {
        setOpen(false);
        setName("");
        setDesc("");
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTeamHealthMetricsQueryKey() });
        toast({ title: "Team created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create team", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
