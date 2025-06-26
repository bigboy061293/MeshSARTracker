import { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Gauge, 
  Battery, 
  Satellite, 
  Navigation,
  MountainSnow,
  Timer,
  Signal,
  Thermometer,
  Wind
} from "lucide-react";
import type { DroneData } from "@/types";

interface FlightDataProps {
  drone: DroneData;
}

export default function FlightData({ drone }: FlightDataProps) {
  const [flightTime, setFlightTime] = useState(0);

  // Calculate flight time (mock implementation)
  useEffect(() => {
    if (drone.armed && drone.isConnected) {
      const interval = setInterval(() => {
        setFlightTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setFlightTime(0);
    }
  }, [drone.armed, drone.isConnected]);

  const formatFlightTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCoordinate = (coord?: number, type: 'lat' | 'lon' = 'lat') => {
    if (!coord) return 'N/A';
    const abs = Math.abs(coord);
    const deg = Math.floor(abs);
    const min = ((abs - deg) * 60).toFixed(4);
    const hemisphere = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${deg}°${min}'${hemisphere}`;
  };

  const getGPSFixStatus = (fixType?: number) => {
    switch (fixType) {
      case 0: return { text: 'No Fix', color: 'text-error' };
      case 1: return { text: 'Dead Reckoning', color: 'text-accent' };
      case 2: return { text: '2D Fix', color: 'text-accent' };
      case 3: return { text: '3D Fix', color: 'text-secondary' };
      case 4: return { text: 'DGPS', color: 'text-secondary' };
      case 5: return { text: 'RTK Float', color: 'text-secondary' };
      case 6: return { text: 'RTK Fixed', color: 'text-secondary' };
      default: return { text: 'Unknown', color: 'text-gray-400' };
    }
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return 'bg-gray-500';
    if (level > 60) return 'bg-secondary';
    if (level > 30) return 'bg-accent';
    return 'bg-error';
  };

  const getSignalStrength = (satCount?: number) => {
    if (!satCount) return 0;
    return Math.min(100, (satCount / 12) * 100);
  };

  const gpsStatus = getGPSFixStatus(drone.gpsFixType);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-surface-light rounded-lg border border-gray-600">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            drone.isConnected ? 'bg-secondary animate-pulse' : 'bg-error'
          }`} />
          <span className="text-sm font-medium">
            {drone.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <Badge variant={drone.armed ? "destructive" : "secondary"} className="text-xs">
          {drone.armed ? 'ARMED' : 'DISARMED'}
        </Badge>
      </div>

      {/* Primary Flight Data */}
      <div className="space-y-4">
        {/* MountainSnow & Speed */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <MountainSnow className="h-4 w-4 text-primary" />
              <span className="text-sm text-gray-400">MountainSnow</span>
            </div>
            <div className="text-xl font-bold text-white">
              {drone.altitude ? `${Math.round(drone.altitude)}m` : '--'}
            </div>
            {drone.altitudeRelative && (
              <div className="text-xs text-gray-400">
                {Math.round(drone.altitudeRelative)}m AGL
              </div>
            )}
          </div>
          
          <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Gauge className="h-4 w-4 text-accent" />
              <span className="text-sm text-gray-400">Ground Speed</span>
            </div>
            <div className="text-xl font-bold text-white">
              {drone.groundSpeed ? `${drone.groundSpeed.toFixed(1)} m/s` : '--'}
            </div>
            {drone.airSpeed && (
              <div className="text-xs text-gray-400">
                Air: {drone.airSpeed.toFixed(1)} m/s
              </div>
            )}
          </div>
        </div>

        {/* Battery Status */}
        <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <Battery className="h-4 w-4 text-secondary" />
            <span className="text-sm text-gray-400">Battery</span>
          </div>
          <div className="space-y-2">
            {drone.batteryLevel !== undefined && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">{drone.batteryLevel}%</span>
                  {drone.voltage && (
                    <span className="text-sm text-gray-300">{drone.voltage.toFixed(1)}V</span>
                  )}
                </div>
                <Progress 
                  value={drone.batteryLevel} 
                  className="h-2"
                  style={{
                    backgroundColor: 'var(--surface)',
                  }}
                />
                <div className={`h-2 rounded-full ${getBatteryColor(drone.batteryLevel)}`}
                     style={{ width: `${drone.batteryLevel}%` }} />
              </>
            )}
            {!drone.batteryLevel && (
              <div className="text-lg font-bold text-gray-400">N/A</div>
            )}
          </div>
        </div>

        {/* GPS Status */}
        <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <Satellite className="h-4 w-4 text-primary" />
            <span className="text-sm text-gray-400">GPS Status</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${gpsStatus.color}`}>
                {gpsStatus.text}
              </span>
              {drone.satelliteCount !== undefined && (
                <span className="text-sm text-gray-300">
                  {drone.satelliteCount} sats
                </span>
              )}
            </div>
            
            {drone.satelliteCount !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Signal Strength</span>
                  <span>{Math.round(getSignalStrength(drone.satelliteCount))}%</span>
                </div>
                <div className="h-1 bg-surface rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-secondary rounded-full transition-all duration-300"
                    style={{ width: `${getSignalStrength(drone.satelliteCount)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Position Data */}
        <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <Navigation className="h-4 w-4 text-accent" />
            <span className="text-sm text-gray-400">Position</span>
          </div>
          <div className="space-y-1 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Lat:</span>
              <span className="text-white">
                {formatCoordinate(drone.latitude, 'lat')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Lon:</span>
              <span className="text-white">
                {formatCoordinate(drone.longitude, 'lon')}
              </span>
            </div>
            {drone.heading !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Heading:</span>
                <span className="text-white">{Math.round(drone.heading)}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Flight Time & Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Timer className="h-4 w-4 text-secondary" />
              <span className="text-sm text-gray-400">Flight Time</span>
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {formatFlightTime(flightTime)}
            </div>
          </div>
          
          <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Signal className="h-4 w-4 text-primary" />
              <span className="text-sm text-gray-400">Flight Mode</span>
            </div>
            <div className="text-sm font-bold text-white">
              {drone.flightMode || 'UNKNOWN'}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="p-3 bg-surface-light rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <Thermometer className="h-4 w-4 text-accent" />
            <span className="text-sm text-gray-400">System Status</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Last Telemetry:</span>
              <span className="text-white">
                {drone.lastTelemetry 
                  ? new Date(drone.lastTelemetry).toLocaleTimeString()
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Model:</span>
              <span className="text-white">{drone.model || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Serial:</span>
              <span className="text-white font-mono">
                {drone.serialNumber?.slice(-8) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
