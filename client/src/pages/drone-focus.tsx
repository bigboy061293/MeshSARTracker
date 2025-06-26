import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { Drone } from "@shared/schema";
import { Battery, Navigation, Gauge, MapPin, Zap } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface DroneData extends Drone {
  roll?: number;
  pitch?: number;
  yaw?: number;
  heading?: number;
  voltageV?: number;
  currentA?: number;
  altitudeMSL?: number;
  altitudeAGL?: number;
}

export default function DroneFocus() {
  const { user } = useAuth();
  const [selectedDrone, setSelectedDrone] = useState<DroneData | null>(null);
  const { lastMessage } = useWebSocket();

  const { data: drones, isLoading } = useQuery({
    queryKey: ['/api/drones'],
    refetchInterval: 1000,
  });

  // Update drone data from WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'droneUpdate' && selectedDrone) {
      const updatedDrone = lastMessage.data.find(
        (d: DroneData) => d.id === selectedDrone.id
      );
      if (updatedDrone) {
        setSelectedDrone(updatedDrone);
      }
    }
  }, [lastMessage, selectedDrone]);

  // Auto-select first available drone
  useEffect(() => {
    if (drones && drones.length > 0 && !selectedDrone) {
      setSelectedDrone(drones[0]);
    }
  }, [drones, selectedDrone]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading drone data...</div>
      </div>
    );
  }

  if (!drones || drones.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Drones Connected</h2>
          <p className="text-gray-600">Connect a MAVLink drone to view telemetry data</p>
        </div>
      </div>
    );
  }

  if (!selectedDrone) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Map Section - Left Side */}
        <div className="col-span-8">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Drone Position - {selectedDrone.name || `Drone ${selectedDrone.id}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]">
              <div className="h-full rounded-lg overflow-hidden">
                {selectedDrone.latitude && selectedDrone.longitude ? (
                  <MapContainer
                    center={[selectedDrone.latitude, selectedDrone.longitude]}
                    zoom={16}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={[selectedDrone.latitude, selectedDrone.longitude]}>
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{selectedDrone.name || `Drone ${selectedDrone.id}`}</div>
                          <div>Lat: {selectedDrone.latitude.toFixed(6)}</div>
                          <div>Lon: {selectedDrone.longitude.toFixed(6)}</div>
                          <div>Alt MSL: {selectedDrone.altitudeMSL?.toFixed(1) || selectedDrone.altitude?.toFixed(1) || 'N/A'}m</div>
                          <div>Heading: {selectedDrone.heading?.toFixed(0) || 'N/A'}°</div>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center text-gray-500">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Waiting for GPS position data...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Telemetry Section - Right Side */}
        <div className="col-span-4 space-y-4">
          {/* Power Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5" />
                Power Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Battery Level</span>
                  <span className="text-sm">{selectedDrone.batteryLevel?.toFixed(1) || 'N/A'}%</span>
                </div>
                <Progress value={selectedDrone.batteryLevel || 0} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-xs text-gray-600">Voltage</div>
                  <div className="text-lg font-bold text-blue-600">
                    {selectedDrone.voltageV?.toFixed(2) || selectedDrone.voltage?.toFixed(2) || 'N/A'}V
                  </div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-xs text-gray-600">Current</div>
                  <div className="text-lg font-bold text-green-600">
                    {selectedDrone.currentA?.toFixed(2) || selectedDrone.current?.toFixed(2) || 'N/A'}A
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AHRS Attitude */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Attitude (AHRS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Attitude Indicator */}
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-300 bg-gradient-to-b from-blue-400 to-blue-600">
                    {/* Horizon line */}
                    <div 
                      className="absolute w-full h-0.5 bg-white transform origin-center"
                      style={{
                        top: '50%',
                        transform: `translateY(-50%) rotate(${-(selectedDrone.roll || 0)}deg)`
                      }}
                    />
                    {/* Aircraft symbol */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-6 h-1 bg-yellow-400 rounded"></div>
                      <div className="w-1 h-6 bg-yellow-400 rounded mx-auto -mt-3"></div>
                    </div>
                  </div>
                </div>

                {/* Attitude Values */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-red-50 rounded">
                    <div className="text-xs text-gray-600">Roll</div>
                    <div className="text-sm font-bold text-red-600">
                      {selectedDrone.roll?.toFixed(1) || '0.0'}°
                    </div>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-xs text-gray-600">Pitch</div>
                    <div className="text-sm font-bold text-green-600">
                      {selectedDrone.pitch?.toFixed(1) || '0.0'}°
                    </div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-xs text-gray-600">Yaw</div>
                    <div className="text-sm font-bold text-blue-600">
                      {selectedDrone.yaw?.toFixed(1) || '0.0'}°
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Navigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Compass */}
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-300 bg-white">
                    {/* Compass markings */}
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold">N</div>
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs">S</div>
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs">E</div>
                    <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs">W</div>
                    
                    {/* Heading needle */}
                    <div 
                      className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-red-500 transform origin-bottom"
                      style={{
                        transform: `translate(-50%, -100%) rotate(${selectedDrone.heading || 0}deg)`
                      }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-lg font-bold">
                  {selectedDrone.heading?.toFixed(0) || '0'}°
                </div>
                <div className="text-xs text-gray-600">Heading</div>
              </div>

              {/* Altitude Data */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-xs text-gray-600">AGL</div>
                  <div className="text-lg font-bold text-purple-600">
                    {selectedDrone.altitudeAGL?.toFixed(1) || (selectedDrone.altitude ? selectedDrone.altitude.toFixed(1) : 'N/A')}m
                  </div>
                </div>
                <div className="text-center p-2 bg-indigo-50 rounded">
                  <div className="text-xs text-gray-600">MSL</div>
                  <div className="text-lg font-bold text-indigo-600">
                    {selectedDrone.altitudeMSL?.toFixed(1) || 'N/A'}m
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Connection</span>
                <Badge variant={selectedDrone.isConnected ? "default" : "destructive"}>
                  {selectedDrone.isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Flight Mode</span>
                <Badge variant="outline">
                  {selectedDrone.flightMode || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Last Update</span>
                <span className="text-xs text-gray-600">
                  {selectedDrone.lastTelemetry 
                    ? new Date(selectedDrone.lastTelemetry).toLocaleTimeString()
                    : 'N/A'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}