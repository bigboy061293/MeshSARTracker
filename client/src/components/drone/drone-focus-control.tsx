import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { Battery, Compass, Gauge, MapPin, Plane, Zap } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface DroneData {
  id: number;
  systemId: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  relativeAltitude?: number;
  heading?: number;
  groundSpeed?: number;
  airSpeed?: number;
  climbRate?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  batteryRemaining?: number;
  roll?: number;
  pitch?: number;
  yaw?: number;
  flightMode?: string;
  isConnected: boolean;
  lastTelemetry?: string;
}

// AHRS Attitude Display Component
function AHRSDisplay({ roll = 0, pitch = 0, yaw = 0 }: { roll?: number; pitch?: number; yaw?: number }) {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Outer ring */}
      <div className="absolute inset-0 border-2 border-gray-300 rounded-full"></div>
      
      {/* Horizon line */}
      <div 
        className="absolute inset-4 bg-gradient-to-b from-blue-300 to-amber-300 rounded-full overflow-hidden"
        style={{ transform: `rotate(${-roll}deg)` }}
      >
        <div 
          className="absolute w-full h-1/2 bg-blue-300"
          style={{ transform: `translateY(${pitch * 2}px)` }}
        ></div>
        <div 
          className="absolute bottom-0 w-full h-1/2 bg-amber-300"
          style={{ transform: `translateY(${-pitch * 2}px)` }}
        ></div>
        
        {/* Center line */}
        <div className="absolute top-1/2 left-1/2 w-8 h-0.5 bg-white transform -translate-x-1/2 -translate-y-0.5"></div>
        <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white transform -translate-x-1/2 -translate-y-2"></div>
      </div>
      
      {/* Roll indicator */}
      <div className="absolute top-1 left-1/2 w-0.5 h-3 bg-red-500 transform -translate-x-1/2"></div>
      
      {/* Compass heading */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="text-sm font-mono bg-gray-800 text-white px-2 py-1 rounded">
          {Math.round(yaw)}°
        </div>
      </div>
    </div>
  );
}

// Custom drone icon for map
const droneIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14 7H22L16 12L18 20L12 16L6 20L8 12L2 7H10L12 2Z" fill="#3B82F6" stroke="#1E40AF" stroke-width="1"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

export default function DroneFocusControl() {
  const [selectedDrone, setSelectedDrone] = useState<DroneData | null>(null);

  // Fetch drone data
  const { data: drones = [] } = useQuery<DroneData[]>({
    queryKey: ['/api/drones'],
    refetchInterval: 1000, // Update every second
  });

  // Auto-select first connected drone
  useEffect(() => {
    const connectedDrones = drones.filter(d => d.isConnected);
    if (connectedDrones.length > 0 && !selectedDrone) {
      setSelectedDrone(connectedDrones[0]);
    }
  }, [drones, selectedDrone]);

  if (!selectedDrone) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Plane className="h-5 w-5" />
            Focus Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Plane className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No connected drone available</p>
            <p className="text-sm text-gray-500">Connect a drone via MAVLink to see telemetry data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Drone Selection */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Plane className="h-5 w-5" />
            Focus Control - Drone {selectedDrone.systemId}
            <Badge variant={selectedDrone.isConnected ? "default" : "destructive"}>
              {selectedDrone.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Display */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <MapPin className="h-5 w-5" />
              Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDrone.latitude && selectedDrone.longitude ? (
              <div className="h-64 rounded-lg overflow-hidden">
                <MapContainer
                  center={[selectedDrone.latitude, selectedDrone.longitude]}
                  zoom={16}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  <Marker 
                    position={[selectedDrone.latitude, selectedDrone.longitude]}
                    icon={droneIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>Drone {selectedDrone.systemId}</strong><br/>
                        Lat: {selectedDrone.latitude.toFixed(6)}°<br/>
                        Lon: {selectedDrone.longitude.toFixed(6)}°<br/>
                        Alt: {selectedDrone.altitude?.toFixed(1)}m MSL<br/>
                        AGL: {selectedDrone.relativeAltitude?.toFixed(1)}m
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <MapPin className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">No GPS position available</p>
                </div>
              </div>
            )}
            
            {/* Position Data */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Latitude:</span>
                <span className="font-mono text-gray-800">
                  {selectedDrone.latitude?.toFixed(6)}°
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Longitude:</span>
                <span className="font-mono text-gray-800">
                  {selectedDrone.longitude?.toFixed(6)}°
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AHRS and Telemetry */}
        <div className="space-y-6">
          {/* AHRS Display */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Compass className="h-5 w-5" />
                Attitude (AHRS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <AHRSDisplay 
                  roll={selectedDrone.roll || 0}
                  pitch={selectedDrone.pitch || 0}
                  yaw={selectedDrone.yaw || selectedDrone.heading || 0}
                />
                
                <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Roll</div>
                    <div className="font-mono text-lg text-gray-800">
                      {selectedDrone.roll?.toFixed(1) || '0.0'}°
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Pitch</div>
                    <div className="font-mono text-lg text-gray-800">
                      {selectedDrone.pitch?.toFixed(1) || '0.0'}°
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Yaw</div>
                    <div className="font-mono text-lg text-gray-800">
                      {(selectedDrone.yaw || selectedDrone.heading || 0).toFixed(1)}°
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Power System */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Battery className="h-5 w-5" />
                Power System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Battery Level:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          (selectedDrone.batteryRemaining || 0) > 50 
                            ? 'bg-green-500' 
                            : (selectedDrone.batteryRemaining || 0) > 20 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedDrone.batteryRemaining || 0}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-sm text-gray-800">
                      {selectedDrone.batteryRemaining?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="text-gray-600">Voltage</div>
                      <div className="font-mono text-gray-800">
                        {(selectedDrone.batteryVoltage || 0).toFixed(2)}V
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-gray-600">Current</div>
                      <div className="font-mono text-gray-800">
                        {(selectedDrone.batteryCurrent || 0).toFixed(2)}A
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Altitude and Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-gray-600 text-sm">Altitude MSL</div>
              <div className="font-mono text-xl text-gray-800">
                {selectedDrone.altitude?.toFixed(1) || '0.0'}m
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-gray-600 text-sm">Altitude AGL</div>
              <div className="font-mono text-xl text-gray-800">
                {selectedDrone.relativeAltitude?.toFixed(1) || '0.0'}m
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-gray-600 text-sm">Heading</div>
              <div className="font-mono text-xl text-gray-800">
                {selectedDrone.heading?.toFixed(0) || '0'}°
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-gray-600 text-sm">Ground Speed</div>
              <div className="font-mono text-xl text-gray-800">
                {selectedDrone.groundSpeed?.toFixed(1) || '0.0'} m/s
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flight Mode and Status */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gray-600">Flight Mode:</span>
              <Badge variant="outline" className="ml-2">
                {selectedDrone.flightMode || 'Unknown'}
              </Badge>
            </div>
            <div className="text-sm text-gray-500">
              Last Update: {selectedDrone.lastTelemetry 
                ? new Date(selectedDrone.lastTelemetry).toLocaleTimeString() 
                : 'Never'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}