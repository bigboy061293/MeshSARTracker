import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
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

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Global scroll prevention setup
    const preventScrollBehavior = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    // Immediate reset
    preventScrollBehavior();
    
    // Disable scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Multiple prevention attempts
    requestAnimationFrame(preventScrollBehavior);
    setTimeout(preventScrollBehavior, 0);
    setTimeout(preventScrollBehavior, 10);
    setTimeout(preventScrollBehavior, 50);
    setTimeout(preventScrollBehavior, 100);
    
    // Add scroll event listener to force position reset
    const handleScroll = (e: Event) => {
      if (window.scrollY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        preventScrollBehavior();
      }
    };
    
    // Temporarily listen for scroll events and prevent them
    window.addEventListener('scroll', handleScroll, { passive: false });
    
    // Remove the scroll listener after a short delay
    const removeListener = setTimeout(() => {
      window.removeEventListener('scroll', handleScroll);
    }, 500);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(removeListener);
    };
  }, [location]);
  
  return null;
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <ScrollToTop />
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
