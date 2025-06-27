import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNodes } from "@/hooks/useNodes";
import { useDrone } from "@/hooks/useDrone";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TacticalMap from "@/components/maps/tactical-map";
import NodeStatus from "@/components/monitoring/node-status";
import SignalChart from "@/components/monitoring/signal-chart";
import MessagePanel from "@/components/communications/message-panel";
import DroneControlPanel from "@/components/drone/control-panel";
import QRDialog from "@/components/ui/qr-dialog";
import { 
  Radio, 
  MessageSquare, 
  Focus, 
  Clock,
  TrendingUp,
  Share2,
  Expand
} from "lucide-react";
import type { SystemStatus } from "@/types";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { nodes, getOnlineNodes } = useNodes();
  const { drones, getConnectedDrones } = useDrone();
  
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 5000,
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  // Prevent automatic scrolling on page load
  useEffect(() => {
    // Reset scroll position to top when component mounts
    window.scrollTo(0, 0);
    // Prevent scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleShareMap = () => {
    console.log("Dashboard Share View button clicked!");
    try {
      const currentUrl = window.location.href;
      setQrDialogOpen(true);
      
      navigator.clipboard.writeText(currentUrl).then(() => {
        toast({
          title: "Dashboard URL Copied",
          description: "The dashboard link has been copied to your clipboard",
        });
      }).catch((error) => {
        console.error("Clipboard error:", error);
        toast({
          title: "QR Code Generated",
          description: "Scan the QR code to share this dashboard view",
        });
      });
    } catch (error) {
      console.error("Error in handleShareMap:", error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    }
  };

  const handleFullscreen = () => {
    console.log("Dashboard Fullscreen button clicked!");
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-dark-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const onlineNodes = getOnlineNodes();
  const connectedDrones = getConnectedDrones();

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Nodes</p>
                <p className="text-3xl font-bold text-secondary">
                  {onlineNodes.length}
                </p>
              </div>
              <Radio className="h-8 w-8 text-secondary" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-secondary">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{status?.totalNodes || 0} total nodes</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-muted">Messages</p>
                <p className="text-3xl font-bold text-primary">
                  {/* Will be populated by WebSocket */}
                  --
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-primary">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Real-time updates</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-muted">Focus Status</p>
                <p className="text-3xl font-bold text-secondary">
                  {connectedDrones.length > 0 ? 'Ready' : 'N/A'}
                </p>
              </div>
              <Focus className="h-8 w-8 text-secondary" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-dark-muted">
                <span>{connectedDrones.length} connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-muted">Mission Time</p>
                <p className="text-3xl font-bold text-accent">
                  {/* Will show active mission time */}
                  --:--:--
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-accent">
                <span>No active mission</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tactical Map */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Tactical Map</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleShareMap} className="border-gray-600">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share View
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFullscreen} className="border-gray-600">
                    <Expand className="h-4 w-4 mr-1" />
                    Fullscreen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <TacticalMap nodes={nodes} drones={drones} />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Node Status Panel */}
        <div>
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="text-lg font-semibold">Node Status</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <NodeStatus nodes={nodes} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts and Communications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Signal Monitoring */}
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Signal Strength (RSSI)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              <SignalChart nodes={onlineNodes} />
            </div>
          </CardContent>
        </Card>
        
        {/* Communications Panel */}
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Team Communications</CardTitle>
              <Button variant="outline" size="sm" className="border-gray-600">
                <MessageSquare className="h-4 w-4 mr-1" />
                Voice Call
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80">
              <MessagePanel />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Focus Control Panel */}
      {connectedDrones.length > 0 && (
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Focus Control - {connectedDrones[0]?.name}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                  <span>{connectedDrones[0]?.isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <Button variant="destructive" size="sm">
                  Emergency Land
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DroneControlPanel drone={connectedDrones[0]} />
          </CardContent>
        </Card>
      )}

      {/* QR Code Share Dialog */}
      <QRDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        url={window.location.href}
        title="Share Dashboard"
        description="Scan the QR code or copy the link to share this dashboard view with your team"
      />
    </div>
  );
}
