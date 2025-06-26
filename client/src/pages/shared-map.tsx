import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TacticalMap from "@/components/maps/tactical-map";
import { 
  Map, 
  Share2, 
  ExternalLink,
  Clock,
  User,
  Globe
} from "lucide-react";
import type { SharedMap } from "@shared/schema";

export default function SharedMapPage() {
  const { id } = useParams<{ id: string }>();

  const { data: sharedMap, isLoading, error } = useQuery<SharedMap>({
    queryKey: [`/api/shared-maps/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading shared map...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedMap) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="bg-surface-variant border-gray-700 w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Map className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Map Not Found</h1>
            <p className="text-gray-400 mb-4">
              The shared map you're looking for doesn't exist or has expired.
            </p>
            <Button 
              variant="outline" 
              className="border-gray-600"
              onClick={() => window.location.href = '/'}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Main App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if map has expired
  const isExpired = sharedMap.expiresAt && new Date(sharedMap.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="bg-surface-variant border-gray-700 w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Clock className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Map Expired</h1>
            <p className="text-gray-400 mb-4">
              This shared map has expired and is no longer available.
            </p>
            <Button 
              variant="outline" 
              className="border-gray-600"
              onClick={() => window.location.href = '/'}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Main App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data for shared map view (in real implementation, this would come from the shared map settings)
  const mockNodes = [
    {
      id: 1,
      nodeId: "!33a8b7f0",
      name: "Node-Alpha",
      latitude: 37.7749,
      longitude: -122.4194,
      isOnline: true,
      rssi: -85,
      batteryLevel: 78,
      voltage: 3.7,
      lastSeen: new Date(),
    },
    {
      id: 2,
      nodeId: "!44b9c8e1",
      name: "Node-Bravo",
      latitude: 37.7849,
      longitude: -122.4094,
      isOnline: true,
      rssi: -72,
      batteryLevel: 92,
      voltage: 4.1,
      lastSeen: new Date(),
    },
  ];

  const mockDrones = [
    {
      id: 1,
      name: "UAV-01",
      latitude: 37.7799,
      longitude: -122.4144,
      altitude: 150,
      armed: false,
      isConnected: true,
      flightMode: "LOITER",
      batteryLevel: 78,
      groundSpeed: 0,
      satelliteCount: 12,
    },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Shared Map Header */}
      <header className="bg-surface-variant border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Map className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-white">{sharedMap.name}</h1>
              {sharedMap.description && (
                <p className="text-sm text-gray-400">{sharedMap.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-gray-600">
              <Globe className="h-3 w-3 mr-1" />
              Public View
            </Badge>
            
            <div className="text-sm text-gray-400">
              {sharedMap.expiresAt && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Expires: {new Date(sharedMap.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-600"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Map link copied to clipboard!');
              }}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Map Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Map */}
          <div className="lg:col-span-3">
            <Card className="bg-surface-variant border-gray-700">
              <CardContent className="p-0">
                <div className="h-[calc(100vh-200px)]">
                  <TacticalMap 
                    nodes={mockNodes} 
                    drones={mockDrones}
                    height="100%"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Information */}
          <div className="space-y-6">
            {/* Map Details */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Map Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Created:</span>
                  <span className="text-sm">
                    {new Date(sharedMap.createdAt!).toLocaleDateString()}
                  </span>
                </div>
                
                {sharedMap.expiresAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Expires:</span>
                    <span className="text-sm">
                      {new Date(sharedMap.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Type:</span>
                  <Badge variant="outline">
                    {sharedMap.isPublic ? 'Public' : 'Private'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Live Statistics */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Live Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Active Nodes:</span>
                  <Badge className="bg-secondary text-secondary-foreground">
                    {mockNodes.filter(n => n.isOnline).length}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Connected Drones:</span>
                  <Badge className="bg-primary text-primary-foreground">
                    {mockDrones.filter(d => d.isConnected).length}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Last Update:</span>
                  <span className="text-sm">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="bg-surface-variant border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  <span className="text-sm">Drone</span>
                </div>
              </CardContent>
            </Card>

            {/* Access Main App */}
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4 text-center">
                <User className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-gray-300 mb-3">
                  Want full access to MeshTac?
                </p>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => window.location.href = '/'}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Command Center
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
