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
                <span>Primary Flight Display (PFD)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full max-w-4xl mx-auto">
                {/* Main Flight Display */}
                <div className="relative w-full h-96 bg-gradient-to-b from-sky-400 to-blue-600 rounded-lg overflow-hidden border-2 border-gray-400">
                  
                  {/* Sky/Ground Horizon */}
                  <div 
                    className="absolute inset-0 transition-transform duration-300"
                    style={{
                      transform: `translateY(${selectedDrone.pitch ? (selectedDrone.pitch * 180 / Math.PI) * 2 : 0}px) rotate(${selectedDrone.roll ? -(selectedDrone.roll * 180 / Math.PI) : 0}deg)`,
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Sky */}
                    <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-blue-500" />
                    
                    {/* Ground */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-green-600 to-green-500" />
                    
                    {/* Horizon Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white shadow-lg" 
                         style={{ transform: 'translateY(-1px)' }} />
                    
                    {/* Pitch Lines */}
                    {[-30, -20, -10, 10, 20, 30].map(angle => (
                      <div
                        key={angle}
                        className="absolute left-1/4 right-1/4 h-1 bg-white shadow-lg"
                        style={{
                          top: `calc(50% + ${angle * 3}px)`,
                          transform: 'translateY(-2px)'
                        }}
                      >
                        <span className="absolute -left-12 -top-3 text-white text-sm font-bold drop-shadow-lg bg-black bg-opacity-50 px-1 rounded">
                          {Math.abs(angle)}
                        </span>
                        <span className="absolute -right-12 -top-3 text-white text-sm font-bold drop-shadow-lg bg-black bg-opacity-50 px-1 rounded">
                          {Math.abs(angle)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Aircraft Symbol (Fixed Center) */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="relative">
                      {/* Center dot */}
                      <div className="absolute w-3 h-3 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                      {/* Wings */}
                      <div className="absolute w-16 h-1 bg-yellow-400 transform -translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute w-1 h-8 bg-yellow-400 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  
                  {/* Heading Tape (Top) */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-black bg-opacity-75">
                    <div className="relative w-full h-full overflow-hidden">
                      <div 
                        className="absolute top-0 h-full flex items-center transition-transform duration-300"
                        style={{
                          transform: `translateX(${50 - (selectedDrone.heading || 0) / 360 * 100}%)`
                        }}
                      >
                        {Array.from({ length: 36 }, (_, i) => i * 10).map(heading => (
                          <div key={heading} className="relative flex-shrink-0 w-12 h-full flex flex-col items-center justify-center">
                            <div className="text-white text-sm font-bold font-mono drop-shadow-lg">
                              {heading === 0 ? 'N' : heading === 90 ? 'E' : heading === 180 ? 'S' : heading === 270 ? 'W' : heading.toString().padStart(3, '0')}
                            </div>
                            <div className="w-0.5 h-4 bg-white" />
                          </div>
                        ))}
                      </div>
                      {/* Heading Bug */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-yellow-400" />
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-black text-yellow-400 text-lg font-bold font-mono px-2 py-1 rounded border-2 border-yellow-400">
                        {Math.round(selectedDrone.heading || 0).toString().padStart(3, '0')}°
                      </div>
                    </div>
                  </div>
                  
                  {/* Altitude Tape (Right) */}
                  <div className="absolute top-0 right-0 w-20 bottom-0 bg-black bg-opacity-75">
                    <div className="relative w-full h-full overflow-hidden">
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black text-green-400 text-base font-bold font-mono px-2 py-1 rounded border-2 border-green-400">
                        {Math.round((selectedDrone.relativeAltitude || 0) / 1000)}m
                      </div>
                      <div className="absolute right-0 top-1/2 w-4 h-1 bg-white" />
                      <div className="absolute right-1 top-1/3 text-green-300 text-xs font-mono">ALT</div>
                      <div className="absolute right-1 bottom-1/3 text-green-300 text-xs font-mono">AGL</div>
                    </div>
                  </div>
                  
                  {/* Speed Tape (Left) */}
                  <div className="absolute top-0 left-0 w-20 bottom-0 bg-black bg-opacity-75">
                    <div className="relative w-full h-full overflow-hidden">
                      <div className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black text-green-400 text-base font-bold font-mono px-2 py-1 rounded border-2 border-green-400">
                        {Math.round(Math.sqrt(Math.pow((selectedDrone.velocityX || 0) / 100, 2) + Math.pow((selectedDrone.velocityY || 0) / 100, 2)))}
                      </div>
                      <div className="absolute left-0 top-1/2 w-4 h-1 bg-white" />
                      <div className="absolute left-1 top-1/3 text-green-300 text-xs font-mono">SPD</div>
                      <div className="absolute left-1 bottom-1/3 text-green-300 text-xs font-mono">m/s</div>
                    </div>
                  </div>
                  
                  {/* Status Information */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-black bg-opacity-90 p-3">
                    <div className="grid grid-cols-3 gap-6 h-full text-white">
                      {/* Left Column */}
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-cyan-400">
                          GPS: {selectedDrone.latitude && selectedDrone.longitude ? '3D Fix' : 'No Fix'}
                        </div>
                        <div className="text-sm font-bold text-cyan-300">
                          Satellites: {selectedDrone.satelliteCount || 0}
                        </div>
                      </div>
                      
                      {/* Center Column */}
                      <div className="text-center space-y-1">
                        <div className="text-2xl font-bold text-red-400 drop-shadow-lg">
                          {selectedDrone.armed ? 'ARMED' : 'DISARMED'}
                        </div>
                        <div className="text-lg font-bold text-yellow-400 drop-shadow-lg">
                          Mode: {selectedDrone.flightMode || 'UNKNOWN'}
                        </div>
                      </div>
                      
                      {/* Right Column */}
                      <div className="text-right space-y-2">
                        <div className="text-sm font-bold text-green-400">
                          Battery: {Math.round(selectedDrone.batteryLevel || 0)}%
                        </div>
                        <div className="text-sm font-bold text-green-300">
                          Voltage: {((selectedDrone.voltage || 0) / 1000).toFixed(1)}V
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Numeric Data Display */}
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-800 text-white p-3 rounded">
                    <div className="font-semibold mb-2">Attitude</div>
                    <div>Roll: {formatValue(selectedDrone.roll ? (selectedDrone.roll * 180 / Math.PI) : null, "°")}</div>
                    <div>Pitch: {formatValue(selectedDrone.pitch ? (selectedDrone.pitch * 180 / Math.PI) : null, "°")}</div>
                    <div>Yaw: {formatValue(selectedDrone.yaw ? (selectedDrone.yaw * 180 / Math.PI) : null, "°")}</div>
                  </div>
                  
                  <div className="bg-gray-800 text-white p-3 rounded">
                    <div className="font-semibold mb-2">Position</div>
                    <div>Lat: {formatValue(selectedDrone.latitude)}</div>
                    <div>Lon: {formatValue(selectedDrone.longitude)}</div>
                    <div>Alt: {formatValue(selectedDrone.altitude ? selectedDrone.altitude / 1000 : null, "m")}</div>
                  </div>
                  
                  <div className="bg-gray-800 text-white p-3 rounded">
                    <div className="font-semibold mb-2">System</div>
                    <div>ID: {selectedDrone.systemId || selectedDrone.id}</div>
                    <div>Status: {selectedDrone.isConnected ? 'Connected' : 'Disconnected'}</div>
                    <div>Uptime: {Math.round((selectedDrone.bootTime || 0) / 1000)}s</div>
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
