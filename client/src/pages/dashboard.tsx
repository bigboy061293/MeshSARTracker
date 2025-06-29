import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDrone } from "@/hooks/useDrone";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TacticalMap from "@/components/maps/tactical-map";
import SignalChart from "@/components/monitoring/signal-chart";
import MessagePanel from "@/components/communications/message-panel";
import DroneControlPanel from "@/components/drone/control-panel";
import QRDialog from "@/components/ui/qr-dialog";
import { 
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
  const { drones, getConnectedDrones } = useDrone();
  
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 5000,
  });

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

  const connectedDrones = getConnectedDrones();

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <p className="text-sm text-dark-muted">UAS Status</p>
                <p className="text-3xl font-bold text-secondary">
                  {connectedDrones.length > 0 ? 'Ready' : 'N/A'}
                </p>
              </div>
              <Focus className="h-8 w-8 text-secondary" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-secondary">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{status?.connectedDrones || 0} connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-muted">Last Update</p>
                <p className="text-3xl font-bold text-accent">
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-accent">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Live monitoring</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={handleShareMap}
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share View
        </Button>
        <Button 
          variant="outline" 
          onClick={handleFullscreen}
          className="flex items-center gap-2"
        >
          <Expand className="h-4 w-4" />
          Fullscreen
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Tactical Map */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-dark-primary">Tactical Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <TacticalMap />
              </div>
            </CardContent>
          </Card>

          {/* Drone Control Panel */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-dark-primary">UAS Control Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <DroneControlPanel />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Message Panel */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-dark-primary">Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <MessagePanel />
            </CardContent>
          </Card>

          {/* Signal Chart */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-dark-primary">Signal Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <SignalChart data={[]} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Dialog */}
      <QRDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        title="Share Dashboard View"
        url={window.location.href}
      />
    </div>
  );
}