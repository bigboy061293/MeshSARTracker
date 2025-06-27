import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface BridgeStats {
  totalMessages: number;
  totalBytes: number;
  lastReceived: string | null;
  isActive: boolean;
  formattedBytes: string;
  secondsSinceLastMessage: number | null;
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
    if (stats.isActive) return 'default';
    if (stats.totalMessages > 0) return 'secondary';
    return 'destructive';
  };

  const getStatusText = () => {
    if (!stats) return 'Loading...';
    if (stats.isActive) return 'Active';
    if (stats.totalMessages > 0) return 'Inactive';
    return 'No Data';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Bridge Connection</CardTitle>
            <CardDescription>
              Real-time status of local COM4 → Cloud bridge
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Messages Received</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalMessages.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Data Transferred</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.formattedBytes}
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Message:</span>
                <span className="font-medium">
                  {stats.lastReceived ? (
                    stats.secondsSinceLastMessage !== null && stats.secondsSinceLastMessage < 60 ? (
                      `${stats.secondsSinceLastMessage}s ago`
                    ) : stats.lastReceived ? (
                      new Date(stats.lastReceived).toLocaleTimeString()
                    ) : (
                      'Never'
                    )
                  ) : (
                    'Never'
                  )}
                </span>
              </div>
            </div>

            {stats.isActive && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-800 font-medium">
                    Receiving live data from local hardware
                  </span>
                </div>
              </div>
            )}

            {!stats.isActive && stats.totalMessages > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm text-yellow-800">
                  Bridge was active but no recent data. Check your local bridge connection.
                </div>
              </div>
            )}

            {stats.totalMessages === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Waiting for bridge connection</div>
                  <div>Start the cloud bridge on your local computer:</div>
                  <code className="text-xs bg-blue-100 px-1 py-0.5 rounded mt-1 block">
                    node cloud-bridge.js --url {window.location.origin}
                  </code>
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