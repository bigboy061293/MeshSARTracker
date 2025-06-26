import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import TacticalMap from "@/pages/map";
import Communications from "@/pages/communications";
import DroneControl from "@/pages/drone-control";
import MissionPlanning from "@/pages/mission-planning";
import TeamManagement from "@/pages/team-management";
import Settings from "@/pages/settings";
import SharedMap from "@/pages/shared-map";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/map" component={TacticalMap} />
            <Route path="/communications" component={Communications} />
            <Route path="/drone-control" component={DroneControl} />
            <Route path="/mission-planning" component={MissionPlanning} />
            <Route path="/team-management" component={TeamManagement} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/shared/:id" component={SharedMap} />
      
      {/* Protected routes */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route>
          <AuthenticatedApp />
        </Route>
      )}
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
