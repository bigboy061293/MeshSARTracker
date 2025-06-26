import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { NodeData, DroneData } from '@/types';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const nodeIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#388E3C" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#388E3C" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const offlineNodeIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#666666" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#666666" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const droneIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1976D2" width="32" height="32">
      <path d="M5.5 1C4.67 1 4 1.67 4 2.5S4.67 4 5.5 4 7 3.33 7 2.5 6.33 1 5.5 1M18.5 1C17.67 1 17 1.67 17 2.5S17.67 4 18.5 4 20 3.33 20 2.5 19.33 1 18.5 1M9.91 3.38L9 5H4V7H8L9.91 3.38M14.09 3.38L15 5H20V7H16L14.09 3.38M12 4C10 4 8 5 8 8V12C8 14 10 16 12 16S16 14 16 12V8C16 5 14 4 12 4M5.5 5C4.67 5 4 5.67 4 6.5S4.67 8 5.5 8 7 7.33 7 6.5 6.33 5 5.5 5M18.5 5C17.67 5 17 5.67 17 6.5S17.67 8 18.5 8 20 7.33 20 6.5 19.33 5 18.5 5Z" fill="#1976D2"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface MapControlsProps {
  nodes: NodeData[];
  drones: DroneData[];
}

function MapControls({ nodes, drones }: MapControlsProps) {
  const map = useMap();

  useEffect(() => {
    // Auto-fit map to show all markers
    const positions: [number, number][] = [];
    
    nodes.forEach(node => {
      if (node.latitude && node.longitude) {
        positions.push([node.latitude, node.longitude]);
      }
    });

    drones.forEach(drone => {
      if (drone.latitude && drone.longitude) {
        positions.push([drone.latitude, drone.longitude]);
      }
    });

    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, nodes, drones]);

  return null;
}

interface TacticalMapProps {
  nodes: NodeData[];
  drones: DroneData[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export default function TacticalMap({ 
  nodes, 
  drones, 
  height = "100%", 
  center = [37.7749, -122.4194], // Default to San Francisco
  zoom = 13 
}: TacticalMapProps) {
  const mapRef = useRef<L.Map>(null);

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const formatRSSI = (rssi?: number) => {
    if (!rssi) return 'N/A';
    return `${rssi} dBm`;
  };

  const formatBattery = (voltage?: number, level?: number) => {
    if (level !== undefined) return `${level}%`;
    if (voltage) return `${voltage.toFixed(1)}V`;
    return 'N/A';
  };

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapControls nodes={nodes} drones={drones} />

        {/* Node Markers */}
        {nodes.filter(node => node.latitude && node.longitude).map((node) => (
          <Marker
            key={node.id}
            position={[node.latitude!, node.longitude!]}
            icon={node.isOnline ? nodeIcon : offlineNodeIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-2">{node.name}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={node.isOnline ? 'text-green-600' : 'text-red-600'}>
                      {node.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">RSSI:</span>
                    <span className="font-mono">{formatRSSI(node.rssi)}</span>
                  </div>
                  {node.batteryLevel !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battery:</span>
                      <span className="font-mono">{formatBattery(node.voltage, node.batteryLevel)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Seen:</span>
                    <span className="font-mono">{formatLastSeen(node.lastSeen)}</span>
                  </div>
                  {node.altitude && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Altitude:</span>
                      <span className="font-mono">{Math.round(node.altitude)}m</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Drone Markers */}
        {drones.filter(drone => drone.latitude && drone.longitude).map((drone) => (
          <Marker
            key={drone.id}
            position={[drone.latitude!, drone.longitude!]}
            icon={droneIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-2">{drone.name}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={drone.isConnected ? 'text-green-600' : 'text-red-600'}>
                      {drone.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Flight Mode:</span>
                    <span className="font-mono">{drone.flightMode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Armed:</span>
                    <span className={drone.armed ? 'text-orange-600' : 'text-green-600'}>
                      {drone.armed ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {drone.altitude && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Altitude:</span>
                      <span className="font-mono">{Math.round(drone.altitude)}m</span>
                    </div>
                  )}
                  {drone.groundSpeed && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Speed:</span>
                      <span className="font-mono">{drone.groundSpeed.toFixed(1)} m/s</span>
                    </div>
                  )}
                  {drone.batteryLevel !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battery:</span>
                      <span className="font-mono">{drone.batteryLevel}%</span>
                    </div>
                  )}
                  {drone.satelliteCount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">GPS:</span>
                      <span className="font-mono">{drone.satelliteCount} sats</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
