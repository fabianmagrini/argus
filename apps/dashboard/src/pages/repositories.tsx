import { useListRepositories, useListTeams, useCreateRepository, getListRepositoriesQueryKey } from "@argus/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Repositories() {
  const { data: repos, isLoading: loadingRepos } = useListRepositories();
  const { data: teams, isLoading: loadingTeams } = useListTeams();
  
  const getTeamName = (id?: number | null) => id ? (teams?.find(t => t.id === id)?.name || id) : "-";

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
        <CreateRepoDialog teams={teams || []} />
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Default Branch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingRepos || loadingTeams ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : repos?.map((repo) => (
              <TableRow key={repo.id}>
                <TableCell className="font-medium font-mono text-sm">{repo.name}</TableCell>
                <TableCell className="text-muted-foreground">{repo.fullName}</TableCell>
                <TableCell>{repo.language || "-"}</TableCell>
                <TableCell>{getTeamName(repo.teamId)}</TableCell>
                <TableCell className="font-mono text-xs">{repo.defaultBranch || "main"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateRepoDialog({ teams }: { teams: any[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [language, setLanguage] = useState("");
  
  const createRepo = useCreateRepository();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRepo.mutate({ 
      data: { 
        name, 
        fullName, 
        teamId: teamId ? parseInt(teamId) : undefined,
        language
      } 
    }, {
      onSuccess: () => {
        setOpen(false);
        setName("");
        setFullName("");
        setTeamId("");
        setLanguage("");
        queryClient.invalidateQueries({ queryKey: getListRepositoriesQueryKey() });
        toast({ title: "Repository registered successfully" });
      },
      onError: () => {
        toast({ title: "Failed to register repository", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Register Repo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Repository</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="api-server" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="org/api-server" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team">Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lang">Language</Label>
            <Input id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="TypeScript" />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createRepo.isPending}>
              {createRepo.isPending ? "Registering..." : "Register"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
