import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Activity, GitPullRequest, GitMerge, AlertTriangle, Users, Database, Trophy } from "lucide-react";
import { useEffect } from "react";

import Overview from "./pages/overview";
import Deployments from "./pages/deployments";
import Dora from "./pages/dora";
import Flow from "./pages/flow";
import PRs from "./pages/pull-requests";
import Incidents from "./pages/incidents";
import Teams from "./pages/teams";
import TeamDetail from "./pages/team-detail";
import Repositories from "./pages/repositories";
import Leaderboard from "./pages/leaderboard";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/dora", label: "DORA Metrics", icon: Activity },
    { href: "/flow", label: "Flow Metrics", icon: GitMerge },
    { href: "/deployments", label: "Deployments", icon: GitPullRequest },
    { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
    { href: "/incidents", label: "Incidents", icon: AlertTriangle },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/repositories", label: "Repositories", icon: Database },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden w-full bg-background dark text-foreground">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="h-14 flex items-center px-4 border-b border-border">
            <span className="font-bold text-sm tracking-wide">ARGUS</span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location === item.href ||
                      (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/dora" component={Dora} />
        <Route path="/flow" component={Flow} />
        <Route path="/deployments" component={Deployments} />
        <Route path="/pull-requests" component={PRs} />
        <Route path="/incidents" component={Incidents} />
        <Route path="/teams" component={Teams} />
        <Route path="/teams/:id" component={TeamDetail} />
        <Route path="/repositories" component={Repositories} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
