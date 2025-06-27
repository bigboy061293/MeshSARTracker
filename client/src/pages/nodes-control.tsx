import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Wifi, WifiOff, Battery, MapPin, Radio, Settings, Power, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Node {
  id: string;
  nodeId: string;
  name: string;
  shortName: string;
  hwModel: string;
  isOnline: boolean;
  lastSeen: string;
  batteryLevel?: number;
  voltage?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  rssi?: number;
  snr?: number;
}

interface BridgeStatus {
  totalMessages: number;
  totalBytes: number;
  lastReceived: string | null;
  isActive: boolean;
}

export default function NodesControl() {
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [bridgeUrl, setBridgeUrl] = useState("");

  // Fetch nodes data
  const { data: nodes = [], isLoading: nodesLoading } = useQuery<Node[]>({
    queryKey: ["/api/nodes"],
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch bridge status
  const { data: bridgeStatus } = useQuery<{ meshtastic?: BridgeStatus }>({
    queryKey: ["/api/bridge/status"],
    refetchInterval: 5000,
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSignalStrength = (rssi?: number) => {
    if (!rssi) return "Unknown";
    if (rssi >= -50) return "Excellent";
    if (rssi >= -70) return "Good";
    if (rssi >= -90) return "Fair";
    return "Poor";
  };

  const getSignalColor = (rssi?: number) => {
    if (!rssi) return "bg-gray-500";
    if (rssi >= -50) return "bg-green-500";
    if (rssi >= -70) return "bg-yellow-500";
    if (rssi >= -90) return "bg-orange-500";
    return "bg-red-500";
  };

  const onlineNodes = nodes.filter(n => n.isOnline);
  const offlineNodes = nodes.filter(n => !n.isOnline);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nodes Control Mode</h1>
          <p className="text-muted-foreground">
            Manage and configure Meshtastic devices in your mesh network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={onlineNodes.length > 0 ? "default" : "secondary"}>
            {onlineNodes.length} Online
          </Badge>
          <Badge variant="outline">
            {nodes.length} Total
          </Badge>
        </div>
      </div>

      {/* Bridge Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Bridge Connection Status
          </CardTitle>
          <CardDescription>
            Status of the Meshtastic bridge connection to local hardware
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bridgeStatus?.meshtastic ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${bridgeStatus.meshtastic.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium">
                      {bridgeStatus.meshtastic.isActive ? 'Bridge Active' : 'Bridge Inactive'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {bridgeStatus.meshtastic.lastReceived 
                        ? `Last data: ${new Date(bridgeStatus.meshtastic.lastReceived).toLocaleTimeString()}`
                        : 'No data received'
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatBytes(bridgeStatus.meshtastic.totalBytes)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {bridgeStatus.meshtastic.totalMessages} packets
                  </p>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No bridge connection detected. Start the meshtastic-bridge.js tool to connect local devices.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="bridge-url">Bridge URL (for local setup)</Label>
              <div className="flex gap-2">
                <Input
                  id="bridge-url"
                  placeholder="https://your-repl.replit.dev"
                  value={bridgeUrl}
                  onChange={(e) => setBridgeUrl(e.target.value)}
                />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(`node meshtastic-bridge.js --url ${bridgeUrl || window.location.origin}`);
                }}>
                  Copy Command
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Run: <code>node meshtastic-bridge.js --url {bridgeUrl || window.location.origin}</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Online Nodes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-green-500" />
                Online Nodes ({onlineNodes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onlineNodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No nodes currently online</p>
                  <p className="text-sm">Check your bridge connection and device power</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {onlineNodes.map((node) => (
                    <Card key={node.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{node.name}</CardTitle>
                          <Badge variant="default" className="bg-green-500">
                            {node.shortName}
                          </Badge>
                        </div>
                        <CardDescription>{node.hwModel}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Battery</span>
                          <div className="flex items-center gap-2">
                            <Battery className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {node.batteryLevel ?? 'N/A'}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Voltage</span>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {node.voltage?.toFixed(2) ?? 'N/A'}V
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Signal</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getSignalColor(node.rssi)}`} />
                            <span className="text-sm font-medium">
                              {node.rssi ? `${node.rssi}dBm` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">SNR</span>
                          <span className="text-sm font-medium">
                            {node.snr ? `${node.snr}dB` : 'N/A'}
                          </span>
                        </div>
                        
                        {node.latitude && node.longitude && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Position</span>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <Separator />
                        <div className="text-xs text-muted-foreground">
                          Last seen: {new Date(node.lastSeen).toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offline Nodes */}
          {offlineNodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WifiOff className="h-5 w-5 text-red-500" />
                  Offline Nodes ({offlineNodes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {offlineNodes.map((node) => (
                    <Card key={node.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{node.name}</CardTitle>
                          <Badge variant="secondary">
                            {node.shortName}
                          </Badge>
                        </div>
                        <CardDescription>{node.hwModel}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          Last seen: {new Date(node.lastSeen).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Node Configuration
              </CardTitle>
              <CardDescription>
                Configure radio settings for mesh network nodes (Future Feature)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node-select">Select Node</Label>
                <Select value={selectedNode} onValueChange={setSelectedNode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a node to configure" />
                  </SelectTrigger>
                  <SelectContent>
                    {onlineNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name} ({node.shortName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Radio configuration features are reserved for future development. 
                  Visit <a href="https://meshtastic.org/docs/configuration/radio/" className="underline" target="_blank" rel="noopener noreferrer">
                    Meshtastic Radio Configuration
                  </a> for manual setup instructions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Diagnostics</CardTitle>
              <CardDescription>
                Monitor mesh network health and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{nodes.length}</div>
                  <div className="text-sm text-muted-foreground">Total Nodes</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{onlineNodes.length}</div>
                  <div className="text-sm text-muted-foreground">Online</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{offlineNodes.length}</div>
                  <div className="text-sm text-muted-foreground">Offline</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((onlineNodes.length / Math.max(nodes.length, 1)) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
              
              {bridgeStatus?.meshtastic && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Bridge Statistics</h4>
                  <div className="space-y-1 text-sm">
                    <div>Total Messages: {bridgeStatus.meshtastic.totalMessages}</div>
                    <div>Data Transferred: {formatBytes(bridgeStatus.meshtastic.totalBytes)}</div>
                    <div>Status: {bridgeStatus.meshtastic.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}