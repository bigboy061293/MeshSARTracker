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
import DroneFocus from "@/pages/drone-focus";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/shared/:id" component={SharedMap} />
      
      {/* Protected routes - authenticated users */}
      {isAuthenticated ? (
        <>
          <Route path="/" component={AuthenticatedApp} />
          <Route path="/dashboard" component={AuthenticatedApp} />
          <Route path="/map" component={AuthenticatedApp} />
          <Route path="/communications" component={AuthenticatedApp} />
          <Route path="/drone-control" component={AuthenticatedApp} />
          <Route path="/mission-planning" component={AuthenticatedApp} />
          <Route path="/team-management" component={AuthenticatedApp} />
          <Route path="/settings" component={AuthenticatedApp} />
        </>
      ) : (
        <Route path="/" component={Landing} />
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
