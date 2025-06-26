import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDrone } from "@/hooks/useDrone";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DroneControlPanel from "@/components/drone/control-panel";
import FlightData from "@/components/drone/flight-data";
import DroneFocusControl from "@/components/drone/drone-focus-control";
import { AlertTriangle, Focus, Radio } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function DroneControl() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { drones, getConnectedDrones, getDroneById } = useDrone();

  // Check MAVLink connection mutation
  const checkConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/mavlink/status');
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.deviceConnected) {
        toast({
          title: "Connection Successful",
          description: `Device connected via ${data.connectionString}. Last heartbeat: ${new Date(data.lastDeviceHeartbeat).toLocaleTimeString()}`,
          variant: "default",
        });
      } else if (data.dataSource === 'simulation') {
        toast({
          title: "Simulation Mode",
          description: "No real device connected - using simulated data",
          variant: "default",
        });
      } else {
        toast({
          title: "No Device Response",
          description: `No heartbeat received from ${data.connectionString}. Check device power and connection.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      
      toast({
        title: "Connection Check Failed",
        description: error instanceof Error ? error.message : "Unable to check connection status",
        variant: "destructive",
      });
    },
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

  // Check role permissions
  useEffect(() => {
    if (user && user.role === 'watcher') {
      toast({
        title: "Access Restricted",
        description: "Watchers have read-only access to drone control",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading drone control...</p>
        </div>
      </div>
    );
  }

  const connectedDrones = getConnectedDrones();
  const primaryDrone = connectedDrones[0]; // Use first connected drone as primary

  if (connectedDrones.length === 0) {
    return (
      <div className="p-6 space-y-6 bg-surface min-h-screen">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark">Focus Control</h1>
            <p className="text-dark-secondary">UAV command and control interface</p>
          </div>
        </div>

        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-8 text-center">
            <Focus className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Drones Connected</h3>
            <p className="text-dark-muted mb-4">
              Connect a drone via MAVLink to access flight controls and telemetry
            </p>
            <Button 
              variant="outline" 
              className="border-gray-600"
              onClick={() => checkConnectionMutation.mutate()}
              disabled={checkConnectionMutation.isPending}
            >
              <Radio className="h-4 w-4 mr-2" />
              {checkConnectionMutation.isPending ? "Checking..." : "Check Connection"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* Focus Control Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Focus Control</h1>
          <p className="text-dark-secondary">UAV command and control interface</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              primaryDrone?.isConnected ? 'bg-secondary animate-pulse' : 'bg-error'
            }`} />
            <span className="text-sm text-dark-secondary">
              {primaryDrone?.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <Badge 
            variant={primaryDrone?.armed ? "destructive" : "secondary"}
            className="text-xs"
          >
            {primaryDrone?.armed ? 'ARMED' : 'DISARMED'}
          </Badge>

          {user?.role !== 'watcher' && (
            <Button variant="destructive" size="sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Emergency Land
            </Button>
          )}
        </div>
      </div>

      {/* Comprehensive Focus Control Display */}
      <DroneFocusControl />

      {/* Focus Selection */}
      {connectedDrones.length > 1 && (
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Connected Drones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectedDrones.map((drone) => (
                <div
                  key={drone.id}
                  className={`p-4 rounded-lg border ${
                    drone.id === primaryDrone?.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-600 bg-surface-light'
                  } cursor-pointer transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    <Focus className="h-6 w-6 text-primary" />
                    <div>
                      <div className="font-medium">{drone.name}</div>
                      <div className="text-sm text-gray-400">{drone.model}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Control Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flight Data */}
        <div>
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Flight Data</CardTitle>
            </CardHeader>
            <CardContent>
              <FlightData drone={primaryDrone} />
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Mission Control - {primaryDrone.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={primaryDrone.flightMode === 'AUTO' ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {primaryDrone.flightMode || 'MANUAL'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <DroneControlPanel drone={primaryDrone} readOnly={user?.role === 'watcher'} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Messages */}
      {user?.role === 'watcher' && (
        <Card className="bg-accent/10 border-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-accent">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                You are in watcher mode. All drone controls are read-only.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
