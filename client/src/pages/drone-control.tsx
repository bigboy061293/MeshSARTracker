import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDrone } from "@/hooks/useDrone";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Plane, Radio, Battery, Navigation, Gauge, Home, RotateCcw } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Drone } from "@shared/schema";

export default function DroneControl() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedDroneId, setSelectedDroneId] = useState<string>("");

  // Fetch all drones
  const { data: drones = [], isLoading: dronesLoading } = useQuery({
    queryKey: ['/api/drones'],
    refetchInterval: 2000, // Update every 2 seconds
  });

  // Get selected drone details
  const selectedDrone = drones.find((drone: Drone) => drone.id.toString() === selectedDroneId);

  // Connection status query
  const { data: connectionStatus } = useQuery({
    queryKey: ['/api/mavlink/connection-status'],
    refetchInterval: 5000,
  });

  // Command mutation for Land/RTH
  const commandMutation = useMutation({
    mutationFn: async ({ droneId, command }: { droneId: number, command: string }) => {
      const response = await apiRequest('POST', '/api/drones/command', {
        droneId,
        command,
        parameters: {}
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Command Sent",
        description: `${variables.command} command sent successfully to drone ${variables.droneId}`,
        variant: "default",
      });
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
        title: "Command Failed",
        description: error instanceof Error ? error.message : "Failed to send command",
        variant: "destructive",
      });
    },
  });

  // Set first drone as default selection
  useEffect(() => {
    if (drones.length > 0 && !selectedDroneId) {
      setSelectedDroneId(drones[0].id.toString());
    }
  }, [drones, selectedDroneId]);

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

  if (isLoading || dronesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading UAS control mode...</p>
        </div>
      </div>
    );
  }

  const handleLandCommand = () => {
    if (selectedDrone) {
      commandMutation.mutate({ droneId: selectedDrone.id, command: 'land' });
    }
  };

  const handleRTHCommand = () => {
    if (selectedDrone) {
      commandMutation.mutate({ droneId: selectedDrone.id, command: 'rtl' });
    }
  };

  const formatValue = (value: number | null | undefined, unit: string = ""): string => {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(2)}${unit}`;
  };

  const getConnectionBadge = () => {
    if (!connectionStatus) return <Badge variant="secondary">Unknown</Badge>;
    
    if (connectionStatus.deviceConnected) {
      return <Badge variant="default">Connected via {connectionStatus.connectionString}</Badge>;
    } else if (connectionStatus.dataSource === 'simulation') {
      return <Badge variant="secondary">Simulation Mode</Badge>;
    } else {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">UAS Control Mode</h1>
          <p className="text-dark-secondary">Multi-drone telemetry monitoring and command interface</p>
        </div>
        {getConnectionBadge()}
      </div>

      {/* Drone Selection */}
      <Card className="bg-surface-variant border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5 text-primary" />
            <span>Drone Selection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {drones.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark mb-2">No Drones Available</h3>
              <p className="text-dark-secondary mb-4">
                No drone telemetry data detected. Check your bridge connection or start the MAVLink bridge.
              </p>
              <div className="text-sm text-gray-500">
                <p><strong>Bridge Mode:</strong> Run <code>node cloud-bridge.js --url {window.location.origin}</code></p>
                <p><strong>Local Mode:</strong> Connect directly via COM port or UDP in Settings</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-2">
                  Select Drone to Control
                </label>
                <Select value={selectedDroneId} onValueChange={setSelectedDroneId}>
                  <SelectTrigger className="bg-surface border-gray-600">
                    <SelectValue placeholder="Select a drone" />
                  </SelectTrigger>
                  <SelectContent>
                    {drones.map((drone: Drone) => (
                      <SelectItem key={drone.id} value={drone.id.toString()}>
                        Drone {drone.id} - {drone.name || `System ${drone.systemId}`} 
                        <Badge 
                          variant={drone.isConnected ? "default" : "secondary"} 
                          className="ml-2"
                        >
                          {drone.isConnected ? "Online" : "Offline"}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telemetry Display */}
      {selectedDrone && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Battery Status */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Battery className="h-5 w-5 text-green-500" />
                  <span>Power Systems</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Voltage:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.voltage, "V")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Current:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.current, "A")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Battery:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.batteryLevel, "%")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Altitude */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Gauge className="h-5 w-5 text-blue-500" />
                  <span>Altitude</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Absolute:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.altitude, "m")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Relative:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.relativeAlt, "m")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">GPS Fix:</span>
                  <Badge variant={selectedDrone.gpsFixType >= 3 ? "default" : "destructive"}>
                    {selectedDrone.gpsFixType >= 3 ? "3D Fix" : "No Fix"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Attitude */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Navigation className="h-5 w-5 text-purple-500" />
                  <span>Attitude</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Roll:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.roll ? selectedDrone.roll * 180 / Math.PI : undefined, "°")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Pitch:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.pitch ? selectedDrone.pitch * 180 / Math.PI : undefined, "°")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Yaw:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.yaw ? selectedDrone.yaw * 180 / Math.PI : undefined, "°")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Flight Status */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Radio className="h-5 w-5 text-orange-500" />
                  <span>Flight Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Flight Mode:</span>
                  <Badge variant="outline">{selectedDrone.flightMode || "Unknown"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Armed:</span>
                  <Badge variant={selectedDrone.isArmed ? "destructive" : "default"}>
                    {selectedDrone.isArmed ? "Armed" : "Disarmed"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">System ID:</span>
                  <span className="font-mono text-dark">{selectedDrone.systemId}</span>
                </div>
              </CardContent>
            </Card>

            {/* Position */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Navigation className="h-5 w-5 text-green-500" />
                  <span>Position</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Latitude:</span>
                  <span className="font-mono text-dark text-xs">{formatValue(selectedDrone.latitude)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Longitude:</span>
                  <span className="font-mono text-dark text-xs">{formatValue(selectedDrone.longitude)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-secondary">Heading:</span>
                  <span className="font-mono text-dark">{formatValue(selectedDrone.heading, "°")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AHRS Viewer */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-blue-500" />
                <span>AHRS (Attitude & Heading Reference System)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attitude Indicators */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-dark mb-3">Attitude</h4>
                  
                  {/* Roll */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">Roll</span>
                      <span className="font-mono text-dark">
                        {formatValue(selectedDrone.roll ? (selectedDrone.roll * 180 / Math.PI) : null, "°")}
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-blue-500 transition-all duration-300"
                        style={{
                          width: '2px',
                          left: '50%',
                          transform: `translateX(-50%) ${selectedDrone.roll ? `rotate(${selectedDrone.roll * 180 / Math.PI}deg)` : ''}`,
                          transformOrigin: 'bottom center'
                        }}
                      />
                      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-dark rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Pitch */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">Pitch</span>
                      <span className="font-mono text-dark">
                        {formatValue(selectedDrone.pitch ? (selectedDrone.pitch * 180 / Math.PI) : null, "°")}
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-green-500 transition-all duration-300"
                        style={{
                          width: '2px',
                          left: '50%',
                          transform: `translateX(-50%) ${selectedDrone.pitch ? `rotate(${selectedDrone.pitch * 180 / Math.PI}deg)` : ''}`,
                          transformOrigin: 'bottom center'
                        }}
                      />
                      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-dark rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Yaw/Heading */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">Yaw</span>
                      <span className="font-mono text-dark">
                        {formatValue(selectedDrone.yaw ? (selectedDrone.yaw * 180 / Math.PI) : null, "°")}
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-purple-500 transition-all duration-300"
                        style={{
                          width: '2px',
                          left: '50%',
                          transform: `translateX(-50%) ${selectedDrone.yaw ? `rotate(${selectedDrone.yaw * 180 / Math.PI}deg)` : ''}`,
                          transformOrigin: 'bottom center'
                        }}
                      />
                      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-dark rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Compass and Altitude */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-dark mb-3">Navigation</h4>
                  
                  {/* Compass */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">Heading</span>
                      <span className="font-mono text-dark">{formatValue(selectedDrone.heading, "°")}</span>
                    </div>
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-300">
                        {/* Compass markings */}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-dark">N</div>
                        <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 text-xs font-bold text-dark">E</div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-dark">S</div>
                        <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 text-xs font-bold text-dark">W</div>
                      </div>
                      {/* Compass needle */}
                      <div 
                        className="absolute top-1/2 left-1/2 w-8 h-0.5 bg-red-500 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300"
                        style={{
                          transform: `translate(-50%, -50%) rotate(${selectedDrone.heading || 0}deg)`,
                          transformOrigin: 'center'
                        }}
                      />
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-600 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Altitude */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">MSL Altitude</span>
                      <span className="font-mono text-dark">
                        {formatValue(selectedDrone.altitude ? selectedDrone.altitude / 1000 : null, "m")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">AGL Altitude</span>
                      <span className="font-mono text-dark">
                        {formatValue(selectedDrone.relativeAltitude ? selectedDrone.relativeAltitude / 1000 : null, "m")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-dark-secondary">Vertical Speed</span>
                      <span className="font-mono text-dark">
                        {formatValue(selectedDrone.verticalSpeed ? selectedDrone.verticalSpeed / 100 : null, "m/s")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Command Panel */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plane className="h-5 w-5 text-red-500" />
                <span>Drone Commands</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button
                  onClick={handleLandCommand}
                  disabled={commandMutation.isPending || (user as any)?.role === 'watcher'}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Land</span>
                </Button>
                
                <Button
                  onClick={handleRTHCommand}
                  disabled={commandMutation.isPending || (user as any)?.role === 'watcher'}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Return to Home</span>
                </Button>
              </div>
              
              {(user as any)?.role === 'watcher' && (
                <p className="text-sm text-gray-500 mt-3">
                  Commands disabled for watcher role
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
