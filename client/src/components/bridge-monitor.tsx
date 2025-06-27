import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface BridgeData {
  totalMessages: number;
  totalBytes: number;
  lastReceived: string | null;
  isActive: boolean;
  formattedBytes: string;
  secondsSinceLastMessage: number | null;
}

interface BridgeStats {
  mavlink: BridgeData;
  meshtastic: BridgeData;
}

export function BridgeMonitor() {
  const [stats, setStats] = useState<BridgeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/bridge/status');
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch bridge status');
      }
    };

    // Fetch immediately
    fetchStats();

    // Update every 2 seconds
    const interval = setInterval(fetchStats, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!stats) return 'secondary';
    if (stats.mavlink.isActive || stats.meshtastic.isActive) return 'default';
    if (stats.mavlink.totalMessages > 0 || stats.meshtastic.totalMessages > 0) return 'secondary';
    return 'destructive';
  };

  const getStatusText = () => {
    if (!stats) return 'Loading...';
    if (stats.mavlink.isActive || stats.meshtastic.isActive) return 'Active';
    if (stats.mavlink.totalMessages > 0 || stats.meshtastic.totalMessages > 0) return 'Inactive';
    return 'No Data';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Bridge Connections</CardTitle>
            <CardDescription>
              Real-time status of drone and Meshtastic bridges
            </CardDescription>
          </div>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        ) : stats ? (
          <>
            {/* MAVLink Bridge Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">MAVLink Bridge (Drone Data)</h4>
                <Badge variant={stats.mavlink.isActive ? 'default' : stats.mavlink.totalMessages > 0 ? 'secondary' : 'destructive'}>
                  {stats.mavlink.isActive ? 'Active' : stats.mavlink.totalMessages > 0 ? 'Inactive' : 'No Data'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Messages</div>
                  <div className="text-xl font-bold text-blue-600">
                    {stats.mavlink.totalMessages.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Data</div>
                  <div className="text-xl font-bold text-green-600">
                    {stats.mavlink.formattedBytes}
                  </div>
                </div>
              </div>
              
              {stats.mavlink.isActive && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-800">Receiving drone telemetry</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t my-4"></div>

            {/* Meshtastic Bridge Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Meshtastic Bridge (Node Data)</h4>
                <Badge variant={stats.meshtastic.isActive ? 'default' : stats.meshtastic.totalMessages > 0 ? 'secondary' : 'destructive'}>
                  {stats.meshtastic.isActive ? 'Active' : stats.meshtastic.totalMessages > 0 ? 'Inactive' : 'No Data'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Messages</div>
                  <div className="text-xl font-bold text-blue-600">
                    {stats.meshtastic.totalMessages.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Data</div>
                  <div className="text-xl font-bold text-green-600">
                    {stats.meshtastic.formattedBytes}
                  </div>
                </div>
              </div>
              
              {stats.meshtastic.isActive && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-800">Receiving node data</span>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions when no data */}
            {stats.mavlink.totalMessages === 0 && stats.meshtastic.totalMessages === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">Waiting for bridge connections</div>
                  <div className="space-y-1">
                    <div>For drone data:</div>
                    <code className="text-xs bg-blue-100 px-1 py-0.5 rounded block">
                      node cloud-bridge.js --url {window.location.origin}
                    </code>
                    <div className="mt-2">For Meshtastic nodes:</div>
                    <code className="text-xs bg-blue-100 px-1 py-0.5 rounded block">
                      node meshtastic-bridge.js --url {window.location.origin}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}