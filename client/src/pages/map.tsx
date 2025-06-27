import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNodes } from "@/hooks/useNodes";
import { useDrone } from "@/hooks/useDrone";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TacticalMap from "@/components/maps/tactical-map";
import QRDialog from "@/components/ui/qr-dialog";
import { 
  Share2, 
  Expand, 
  Layers, 
  Ruler,
  MapPin,
  Crosshair
} from "lucide-react";

export default function TacticalMapPage() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { nodes, getOnlineNodes, getNodesWithGPS } = useNodes();
  const { drones, getConnectedDrones, getDronesWithGPS } = useDrone();
  
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading tactical map...</p>
        </div>
      </div>
    );
  }

  const onlineNodes = getOnlineNodes();
  const nodesWithGPS = getNodesWithGPS();
  const connectedDrones = getConnectedDrones();
  const dronesWithGPS = getDronesWithGPS();

  const handleShareMap = () => {
    console.log("Share View button clicked!");
    console.log("QR dialog state before:", qrDialogOpen);
    try {
      // Generate current map URL with current state
      const currentUrl = window.location.href;
      console.log("Current URL:", currentUrl);
      console.log("Setting QR dialog open to true...");
      setQrDialogOpen(true);
      console.log("QR dialog state after:", true);
      
      // Also copy to clipboard immediately
      navigator.clipboard.writeText(currentUrl).then(() => {
        console.log("URL copied to clipboard successfully");
        toast({
          title: "Map URL Copied",
          description: "The map link has been copied to your clipboard",
        });
      }).catch((error) => {
        console.error("Clipboard error:", error);
        toast({
          title: "QR Code Generated",
          description: "Scan the QR code to share this map view",
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
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* Map Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tactical Map</h1>
          <p className="text-gray-400">Real-time tactical situation awareness</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="h-4 w-4 text-secondary" />
            <span className="text-gray-300">{nodesWithGPS.length} Nodes</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Crosshair className="h-4 w-4 text-primary" />
            <span className="text-gray-300">{dronesWithGPS.length} Drones</span>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Tactical Overview</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleShareMap} className="border-gray-600">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share View
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFullscreen} className="border-gray-600">
                    <Expand className="h-4 w-4 mr-1" />
                    Fullscreen
                  </Button>
                  <Button variant="outline" size="sm" className="border-gray-600">
                    <Layers className="h-4 w-4 mr-1" />
                    Layers
                  </Button>
                  <Button variant="outline" size="sm" className="border-gray-600">
                    <Ruler className="h-4 w-4 mr-1" />
                    Measure
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[calc(100vh-250px)]">
                <TacticalMap 
                  nodes={nodes} 
                  drones={drones}
                  height="100%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Legend and Statistics */}
        <div className="space-y-6">
          {/* Legend */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Map Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-secondary rounded-full border-2 border-white"></div>
                  <span className="text-sm">Online Node</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-gray-500 rounded-full border-2 border-white"></div>
                  <span className="text-sm">Offline Node</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-primary"></div>
                  <span className="text-sm">Drone (Connected)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-accent"></div>
                  <span className="text-sm">Waypoint</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Nodes:</span>
                  <Badge variant="secondary">{nodes.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Online Nodes:</span>
                  <Badge className="bg-secondary text-secondary-foreground">{onlineNodes.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Nodes with GPS:</span>
                  <Badge variant="outline">{nodesWithGPS.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Connected Drones:</span>
                  <Badge className="bg-primary text-primary-foreground">{connectedDrones.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Coverage Area:</span>
                  <Badge variant="outline">
                    {nodesWithGPS.length > 0 ? "Active" : "N/A"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full border-gray-600" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Center on Nodes
              </Button>
              <Button variant="outline" className="w-full border-gray-600" size="sm">
                <Crosshair className="h-4 w-4 mr-2" />
                Track Drones
              </Button>
              <Button variant="outline" className="w-full border-gray-600" size="sm">
                <Ruler className="h-4 w-4 mr-2" />
                Measure Distance
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Share Dialog */}
      <QRDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        url={window.location.href}
        title="Share Tactical Map"
        description="Scan the QR code or copy the link to share this tactical map view with your team"
      />
    </div>
  );
}
