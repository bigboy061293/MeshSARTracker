import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Wifi, WifiOff, Battery, MapPin, Radio, Settings, Power, Zap, Usb, Bluetooth, Globe, Lock, LockOpen, Clock, Activity, Gauge, Router } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  macAddress?: string;
  hopsAway?: number;
  viaMqtt?: boolean;
  encryption?: boolean;
  publicKey?: string;
  firmwareVersion?: string;
  uptime?: number;
  channelUtilization?: number;
  airUtilTx?: number;
}

interface BridgeStatus {
  totalMessages: number;
  totalBytes: number;
  lastReceived: string | null;
  isActive: boolean;
}

// Web Serial Communication Hook
function useWebSerialMeshtastic() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [meshNodes, setMeshNodes] = useState<any>(null);
  const [devicePreferences, setDevicePreferences] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isWebSerialSupported = useMemo(() => {
    return 'serial' in navigator;
  }, []);

  const connectToDevice = useCallback(async () => {
    if (!isWebSerialSupported) {
      toast({
        title: "Web Serial Not Supported",
        description: "Please use Chrome/Edge browser for Web Serial connectivity",
        variant: "destructive",
      });
      return;
    }

    try {
      setConnectionStatus("Requesting device...");
      
      // Request a port and open a connection
      // Note: The browser will show a device picker dialog
      // Use no filters to show all devices (like official Meshtastic client)
      const selectedPort = await navigator.serial.requestPort();

      if (!selectedPort) {
        throw new Error("No device selected");
      }

      setConnectionStatus("Opening connection...");
      await selectedPort.open({ baudRate: 115200 });
      
      setPort(selectedPort);
      setIsConnected(true);
      setConnectionStatus("Connected");
      
      toast({
        title: "Device Connected",
        description: "Successfully connected to Meshtastic device via Web Serial",
      });

      // Start reading data
      startReading(selectedPort);
      
      // Start device info polling every 2 seconds
      startDevicePolling(selectedPort);

    } catch (error) {
      console.error('Web Serial connection error:', error);
      setConnectionStatus("Connection Failed");
      
      let errorMessage = "Failed to connect to device";
      if (error instanceof Error) {
        if (error.message.includes("No port selected")) {
          errorMessage = "No device was selected. Please try again and select a Meshtastic device from the dialog.";
        } else if (error.message.includes("not supported")) {
          errorMessage = "Web Serial is not supported. Please use Chrome 89+ or Edge 89+.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [isWebSerialSupported, toast]);

  const startReading = useCallback(async (serialPort: SerialPort) => {
    const reader = serialPort.readable?.getReader();
    if (!reader) return;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // Process received Meshtastic data
        await processReceivedData(value);
      }
    } catch (error) {
      console.error('Reading error:', error);
    } finally {
      reader.releaseLock();
    }
  }, []);

  const processReceivedData = useCallback(async (data: Uint8Array) => {
    try {
      // Convert to text for easier parsing
      const text = new TextDecoder().decode(data);
      const timestamp = new Date().toISOString();
      
      console.log(`📥 [${timestamp}] RAW DATA:`, Array.from(data));
      console.log(`📄 [${timestamp}] TEXT DATA:`, text);
      
      // Look for nodeDB information patterns
      if (text.includes('Node')) {
        console.log(`🔍 [${timestamp}] DETECTED NODE INFO:`, text);
      }
      
      if (text.includes('!')) {
        console.log(`📡 [${timestamp}] DETECTED NODE ID PATTERN:`, text);
      }
      
      // Parse specific command responses
      const parsedInfo = parseDeviceResponse(data);
      if (parsedInfo) {
        console.log(`✅ [${timestamp}] PARSED RESPONSE:`, parsedInfo);
        
        if (parsedInfo.type === 'device_info') {
          setDeviceInfo(parsedInfo.data);
          console.log(`📊 [${timestamp}] DEVICE INFO UPDATED:`, parsedInfo.data);
        } else if (parsedInfo.type === 'mesh_nodes') {
          setMeshNodes(parsedInfo.data);
          console.log(`🌐 [${timestamp}] MESH NODES UPDATED:`, parsedInfo.data);
        } else if (parsedInfo.type === 'preferences') {
          setDevicePreferences(parsedInfo.data);
          console.log(`⚙️ [${timestamp}] PREFERENCES UPDATED:`, parsedInfo.data);
        }
      }
      
      // Send raw data to server for processing
      await apiRequest("/api/meshtastic/process-serial", "POST", {
        data: Array.from(data),
        timestamp: Date.now()
      });
      
      // For testing purposes, create some sample node data if we detect node patterns
      if (text.includes('!') && text.match(/!([a-f0-9]{8})/)) {
        console.log(`🧪 [TEST] Creating test node data for development`);
        try {
          // Create test nodes from your known node IDs
          const testNodes = ['!ad75d1c4', '!ea8f884c', '!da73e25c'];
          for (const nodeId of testNodes) {
            await apiRequest("/api/nodes", "POST", {
              nodeId: nodeId,
              name: `Test-${nodeId.slice(-4)}`,
              shortName: nodeId.slice(-4).toUpperCase(),
              hwModel: 'TBEAM',
              isOnline: true,
              lastSeen: new Date().toISOString(),
              batteryLevel: Math.floor(Math.random() * 100),
              voltage: 3.7 + Math.random(),
              rssi: -80 + Math.floor(Math.random() * 40),
              snr: 5 + Math.floor(Math.random() * 10)
            });
          }
          console.log(`✅ [TEST] Test nodes created successfully`);
        } catch (error) {
          console.error('❌ [TEST] Failed to create test nodes:', error);
        }
      }
      
      // Refresh nodes data
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
    } catch (error) {
      console.error('❌ Data processing error:', error);
    }
  }, [queryClient]);

  const parseDeviceResponse = (data: Uint8Array) => {
    try {
      const text = new TextDecoder().decode(data);
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Look for nodeDB patterns
      if (text.includes('nodeDB') || text.includes('nodes:') || text.includes('Node:')) {
        console.log('🌐 [NODEDB] Found node database response:', lines);
        
        const nodes: any = {};
        let currentNode: any = null;
        
        for (const line of lines) {
          // Look for node ID patterns like "!abcd1234"
          const nodeIdMatch = line.match(/!([a-f0-9]{8})/);
          if (nodeIdMatch) {
            const nodeId = nodeIdMatch[1];
            currentNode = { nodeId: nodeIdMatch[0], shortName: '', longName: '', lastSeen: new Date().toISOString() };
            nodes[nodeId] = currentNode;
            console.log('📡 [NODEDB] Found node ID:', nodeIdMatch[0]);
          }
          
          // Parse node details
          if (currentNode) {
            if (line.includes('Short:')) {
              currentNode.shortName = line.split('Short:')[1]?.trim() || '';
            }
            if (line.includes('Long:')) {
              currentNode.longName = line.split('Long:')[1]?.trim() || '';
            }
            if (line.includes('SNR:')) {
              currentNode.snr = parseFloat(line.split('SNR:')[1]?.trim() || '0');
            }
            if (line.includes('RSSI:')) {
              currentNode.rssi = parseInt(line.split('RSSI:')[1]?.trim() || '0');
            }
          }
        }
        
        if (Object.keys(nodes).length > 0) {
          return {
            type: 'mesh_nodes',
            data: nodes
          };
        }
      }
      
      // Look for device info patterns
      if (text.includes('My info:') || text.includes('deviceId') || text.includes('myNodeNum')) {
        console.log('📱 [DEVICE] Found device info response:', lines);
        
        const deviceInfo: any = {
          lastResponse: new Date().toISOString()
        };
        
        for (const line of lines) {
          if (line.includes('myNodeNum:')) {
            deviceInfo.myNodeNum = line.split(':')[1]?.trim();
          }
          if (line.includes('deviceId:')) {
            deviceInfo.deviceId = line.split(':')[1]?.trim();
          }
          if (line.includes('firmware:')) {
            deviceInfo.firmwareVersion = line.split(':')[1]?.trim();
          }
          if (line.includes('hwModel:')) {
            deviceInfo.hwModel = line.split(':')[1]?.trim();
          }
          if (line.includes('rebootCount:')) {
            deviceInfo.rebootCount = parseInt(line.split(':')[1]?.trim() || '0');
          }
        }
        
        return {
          type: 'device_info',
          data: deviceInfo
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Response parsing error:', error);
      return null;
    }
  };

  const sendMeshtasticCommand = useCallback(async (port: SerialPort, command: string) => {
    if (!port || !port.writable) return;
    
    try {
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      
      // Send different command formats for better compatibility
      const commands = [
        command + '\r\n',
        command + '\n',
        command + '\r'
      ];
      
      for (const cmd of commands) {
        const commandData = encoder.encode(cmd);
        await writer.write(commandData);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between attempts
      }
      
      writer.releaseLock();
      console.log(`📤 Sent Meshtastic command: ${command}`);
    } catch (error) {
      console.error('❌ Error sending command:', error);
    }
  }, []);

  const startDevicePolling = useCallback((port: SerialPort) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(async () => {
      if (port && isConnected) {
        console.log('🔄 [POLLING] Requesting nodeDB and device info...');
        
        // Request node database and device information
        await sendMeshtasticCommand(port, '--nodes');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await sendMeshtasticCommand(port, '--info');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await sendMeshtasticCommand(port, '--get-canned-message');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await sendMeshtasticCommand(port, '--get-ringtone');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('📊 [POLLING] Commands sent, waiting for responses...');
      }
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
    
    // Initial request after 1 second
    setTimeout(async () => {
      if (port && isConnected) {
        console.log('🚀 [INITIAL] Starting nodeDB polling...');
        await sendMeshtasticCommand(port, '--nodes');
        await new Promise(resolve => setTimeout(resolve, 300));
        await sendMeshtasticCommand(port, '--info');
        console.log('✅ [INITIAL] Initial commands sent');
      }
    }, 1000);
  }, [pollingInterval, isConnected, sendMeshtasticCommand]);

  const disconnect = useCallback(async () => {
    if (port) {
      try {
        // Clear polling interval
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        await port.close();
        setPort(null);
        setIsConnected(false);
        setConnectionStatus("Disconnected");
        setDeviceInfo(null);
        setMeshNodes(null);
        setDevicePreferences(null);
        
        toast({
          title: "Device Disconnected",
          description: "Web Serial connection closed",
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }, [port, pollingInterval, toast]);

  return {
    isSupported: isWebSerialSupported,
    isConnected,
    connectionStatus,
    deviceInfo,
    meshNodes,
    devicePreferences,
    connect: connectToDevice,
    disconnect
  };
}

export default function NodesControl() {
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "lastSeen" | "snr" | "hops">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [selectedConnectionTab, setSelectedConnectionTab] = useState<"bridge" | "webserial">("bridge");
  
  const webSerial = useWebSerialMeshtastic();
  const { toast } = useToast();

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

  // Utility functions
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

  const formatMacAddress = (macAddress?: string) => {
    if (!macAddress) return "Unknown";
    return macAddress.match(/.{2}/g)?.join(":") || macAddress;
  };

  const getHardwareModel = (hwModel: string) => {
    // Map hardware model codes to readable names
    const models: Record<string, string> = {
      "HELTEC_V3": "Heltec V3",
      "TBEAM": "T-Beam",
      "T_ECHO": "T-Echo",
      "LORA32_V2": "LoRa32 V2",
      "STATION_G1": "Station G1",
      "RAK4631": "RAK4631",
      "TBEAM_V1_1": "T-Beam V1.1",
      "HELTEC_V2_1": "Heltec V2.1"
    };
    return models[hwModel] || hwModel;
  };

  const getConnectionText = (node: Node) => {
    if (node.hopsAway !== undefined) {
      if (node.viaMqtt === false && node.hopsAway === 0) {
        return "Direct";
      } else {
        const hopText = node.hopsAway === 1 ? "hop" : "hops";
        return `${node.hopsAway} ${hopText} away`;
      }
    }
    return "Unknown";
  };

  // Filter and sort nodes
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = showOnlineOnly ? nodes.filter(n => n.isOnline) : nodes;
    
    if (filterText) {
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(filterText.toLowerCase()) ||
        node.shortName.toLowerCase().includes(filterText.toLowerCase()) ||
        node.nodeId.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "lastSeen":
          aVal = new Date(a.lastSeen).getTime();
          bVal = new Date(b.lastSeen).getTime();
          break;
        case "snr":
          aVal = a.snr || -999;
          bVal = b.snr || -999;
          break;
        case "hops":
          aVal = a.hopsAway || 999;
          bVal = b.hopsAway || 999;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [nodes, filterText, sortBy, sortOrder, showOnlineOnly]);

  const onlineNodes = nodes.filter(n => n.isOnline);
  const offlineNodes = nodes.filter(n => !n.isOnline);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meshtastic Network Nodes</h1>
          <p className="text-muted-foreground">
            Connect and monitor Meshtastic mesh network devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={onlineNodes.length > 0 ? "default" : "secondary"}>
            {onlineNodes.length} Online
          </Badge>
          <Badge variant="outline">
            {nodes.length} Total
          </Badge>
          {webSerial.isConnected && (
            <Badge variant="default" className="bg-green-600">
              <Usb className="h-3 w-3 mr-1" />
              Web Serial
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Device Connection
          </CardTitle>
          <CardDescription>
            Connect to Meshtastic devices via Web Serial or bridge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedConnectionTab} onValueChange={(value) => setSelectedConnectionTab(value as "bridge" | "webserial")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="webserial" className="flex items-center gap-2">
                <Usb className="h-4 w-4" />
                Web Serial
              </TabsTrigger>
              <TabsTrigger value="bridge" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Bridge Connection
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="webserial" className="space-y-4">
              {!webSerial.isSupported ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Web Serial API is not supported in this browser. Please use Chrome 89+ or Edge 89+ for direct device connectivity.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${webSerial.isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <div>
                        <p className="font-medium">{webSerial.connectionStatus}</p>
                        <p className="text-sm text-muted-foreground">
                          {webSerial.isConnected ? 'Device connected via USB/Serial' : 'No device connected'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={webSerial.isConnected ? webSerial.disconnect : webSerial.connect}
                      variant={webSerial.isConnected ? "destructive" : "default"}
                    >
                      {webSerial.isConnected ? "Disconnect" : "Connect Device"}
                    </Button>
                  </div>
                  
                  <Alert>
                    <Usb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How to connect:</strong><br/>
                      1. Connect your Meshtastic device via USB cable<br/>
                      2. Click "Connect Device" and select your device from the browser dialog<br/>
                      3. Supports all common devices: ESP32, T-Beam, Heltec, RAK, Tiny CDC (CH340/CH341), and native USB devices<br/>
                      <em>Note: If your device doesn't appear in the filtered list, the system will automatically show all available serial devices.</em>
                    </AlertDescription>
                  </Alert>

                  {/* Device Info Display */}
                  {webSerial.isConnected && (
                    <div className="space-y-4">
                      {webSerial.deviceInfo && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3">Device Information</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Device ID:</span>
                              <span className="ml-2 font-mono">{webSerial.deviceInfo.deviceId}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Node Number:</span>
                              <span className="ml-2 font-mono">{webSerial.deviceInfo.myNodeNum}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Firmware:</span>
                              <span className="ml-2">{webSerial.deviceInfo.firmwareVersion}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hardware:</span>
                              <span className="ml-2">{webSerial.deviceInfo.hwModel}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reboots:</span>
                              <span className="ml-2">{webSerial.deviceInfo.rebootCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Response:</span>
                              <span className="ml-2">{webSerial.deviceInfo.lastResponse}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {webSerial.meshNodes && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3">Mesh Network Nodes</h4>
                          <div className="text-sm">
                            <p className="text-muted-foreground">
                              {Object.keys(webSerial.meshNodes).length} nodes detected in mesh
                            </p>
                            <div className="mt-2 space-y-1">
                              {Object.entries(webSerial.meshNodes).map(([nodeId, node]: [string, any]) => (
                                <div key={nodeId} className="flex justify-between items-center">
                                  <span className="font-mono text-xs">{nodeId}</span>
                                  <span className="text-muted-foreground">{node.longName || 'Unknown'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        🔄 Polling device every 2 seconds for updated information
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="bridge" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Nodes Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Router className="h-5 w-5" />
                Network Nodes
              </CardTitle>
              <CardDescription>
                Comprehensive view of all Meshtastic nodes in the mesh network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters and Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={async () => {
                    try {
                      console.log('🧪 Creating test nodes...');
                      const response = await apiRequest("/api/nodes/create-test", "POST", {});
                      console.log('✅ Test nodes created:', response);
                      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
                      toast({
                        title: "Test Nodes Created",
                        description: `Created ${response.count} test nodes successfully`,
                      });
                    } catch (error) {
                      console.error('❌ Failed to create test nodes:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create test nodes",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  className="w-fit"
                >
                  Create Test Nodes
                </Button>
                <div className="flex-1">
                  <Input
                    placeholder="Search nodes by name, short name, or ID..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="lastSeen">Last Seen</SelectItem>
                      <SelectItem value="snr">Signal</SelectItem>
                      <SelectItem value="hops">Hops</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showOnlineOnly}
                      onCheckedChange={setShowOnlineOnly}
                    />
                    <span className="text-sm whitespace-nowrap">Online only</span>
                  </div>
                </div>
              </div>

              {/* Nodes Table */}
              {filteredAndSortedNodes.length === 0 ? (
                <div className="text-center py-8">
                  <Router className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {nodes.length === 0 
                      ? "No nodes detected. Connect a Meshtastic device to start monitoring your mesh network."
                      : "No nodes match your current filters."
                    }
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Node</TableHead>
                        <TableHead>Hardware</TableHead>
                        <TableHead>Connection</TableHead>
                        <TableHead>Signal</TableHead>
                        <TableHead>Battery</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedNodes.map((node) => (
                        <>
                        <TableRow key={node.id} className={node.isOnline ? "" : "opacity-60"}>
                          <TableCell>
                            <div className={`w-3 h-3 rounded-full ${node.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <p className="font-medium">{node.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {node.shortName} • {node.nodeId.slice(-8)}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{getHardwareModel(node.hwModel)}</p>
                              {node.firmwareVersion && (
                                <p className="text-xs text-muted-foreground">v{node.firmwareVersion}</p>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {node.viaMqtt ? (
                                <Globe className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Radio className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-sm">{getConnectionText(node)}</span>
                              {node.encryption && <Lock className="h-3 w-3 text-yellow-500" />}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {node.rssi && node.snr ? (
                              <div>
                                <Badge variant="outline" className={`text-xs ${getSignalColor(node.rssi).replace('bg-', 'border-')}`}>
                                  {node.rssi} dBm
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">SNR: {node.snr}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {node.batteryLevel ? (
                              <div className="flex items-center gap-2">
                                <Battery className={`h-4 w-4 ${node.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`} />
                                <span className="text-sm">{node.batteryLevel}%</span>
                                {node.voltage && (
                                  <span className="text-xs text-muted-foreground">({node.voltage}V)</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <p className="text-sm">{new Date(node.lastSeen).toLocaleTimeString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(node.lastSeen).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedNode(selectedNode === node.nodeId ? "" : node.nodeId)}
                            >
                              {selectedNode === node.nodeId ? "Hide" : "Show"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {selectedNode === node.nodeId && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/50">
                              <div className="p-4 space-y-3">
                                <h4 className="font-medium">Detailed Information</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Node ID:</span>
                                    <p className="font-mono">{node.nodeId}</p>
                                  </div>
                                  {node.macAddress && (
                                    <div>
                                      <span className="text-muted-foreground">MAC Address:</span>
                                      <p className="font-mono">{formatMacAddress(node.macAddress)}</p>
                                    </div>
                                  )}
                                  {node.uptime && (
                                    <div>
                                      <span className="text-muted-foreground">Uptime:</span>
                                      <p>{Math.floor(node.uptime / 3600)}h {Math.floor((node.uptime % 3600) / 60)}m</p>
                                    </div>
                                  )}
                                  {node.channelUtilization && (
                                    <div>
                                      <span className="text-muted-foreground">Channel Usage:</span>
                                      <p>{node.channelUtilization.toFixed(1)}%</p>
                                    </div>
                                  )}
                                  {node.latitude && node.longitude && (
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Position:</span>
                                      <p className="font-mono">
                                        {node.latitude.toFixed(6)}, {node.longitude.toFixed(6)}
                                        {node.altitude && ` (${node.altitude}m)`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {node.publicKey && (
                                  <div>
                                    <span className="text-muted-foreground">Public Key:</span>
                                    <p className="font-mono text-xs break-all bg-background p-2 rounded border">
                                      {node.publicKey}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
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