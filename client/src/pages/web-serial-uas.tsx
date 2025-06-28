import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Usb, Wifi, WifiOff, Play, Square, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import { useWebSerial } from '@/hooks/useWebSerial';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { Drone } from '@shared/schema';

export default function WebSerialUAS() {
  const { toast } = useToast();
  const {
    isSupported,
    isConnected,
    isConnecting,
    config,
    setConfig,
    connect,
    disconnect,
    lastMessage,
    bytesReceived,
    bytesSent,
    resetStats
  } = useWebSerial();

  const [selectedBaudRate, setSelectedBaudRate] = useState(57600);
  const [selectedDrone, setSelectedDrone] = useState<number>(1);

  // Fetch drones data to populate dropdown
  const { data: drones = [] } = useQuery<Drone[]>({
    queryKey: ['/api/drones'],
    refetchInterval: 3000
  });

  useEffect(() => {
    if (selectedBaudRate !== config.baudRate) {
      setConfig({ ...config, baudRate: selectedBaudRate });
    }
  }, [selectedBaudRate, config, setConfig]);

  const handleConnect = async () => {
    if (!isSupported) {
      toast({
        title: "Browser Not Supported",
        description: "Web Serial API requires Chrome 89+ or Edge 89+. Please update your browser.",
        variant: "destructive"
      });
      return;
    }

    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const selectedDroneData = drones.find(d => d.id === selectedDrone);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Web Serial UAS Control</h1>
          <p className="text-muted-foreground">Direct drone connection via Chrome Web Serial API</p>
        </div>
        <Badge variant={isSupported ? "default" : "destructive"}>
          {isSupported ? "Web Serial Supported" : "Not Supported"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Usb className="h-5 w-5" />
              Serial Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Baud Rate</label>
              <Select value={selectedBaudRate.toString()} onValueChange={(value) => setSelectedBaudRate(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                  <SelectItem value="57600">57600</SelectItem>
                  <SelectItem value="115200">115200</SelectItem>
                  <SelectItem value="230400">230400</SelectItem>
                  <SelectItem value="460800">460800</SelectItem>
                  <SelectItem value="921600">921600</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-500">Disconnected</span>
                  </>
                )}
              </div>
            </div>

            {isConnected ? (
              <Button onClick={handleDisconnect} variant="destructive" className="w-full">
                <Square className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting || !isSupported}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect to Drone"}
              </Button>
            )}

            {!isSupported && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-yellow-700 dark:text-yellow-300">
                  Please use Chrome 89+ or Edge 89+ for Web Serial support
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Data Received</span>
                <span className="font-mono">{formatBytes(bytesReceived)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Data Sent</span>
                <span className="font-mono">{formatBytes(bytesSent)}</span>
              </div>
            </div>

            {lastMessage && (
              <div className="space-y-2">
                <Separator />
                <div className="text-xs text-muted-foreground">Last Message</div>
                <div className="space-y-1 text-xs">
                  <div>System ID: {lastMessage.systemId}</div>
                  <div>Message ID: {lastMessage.messageId}</div>
                  <div>Time: {new Date(lastMessage.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            )}

            <Button onClick={resetStats} variant="outline" size="sm" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Stats
            </Button>
          </CardContent>
        </Card>

        {/* Drone Selection */}
        <Card>
          <CardHeader>
            <CardTitle>UAS Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Active Drone</label>
              <Select value={selectedDrone.toString()} onValueChange={(value) => setSelectedDrone(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {drones.map((drone) => (
                    <SelectItem key={drone.id} value={drone.id.toString()}>
                      {drone.name} - {drone.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDroneData && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">{selectedDroneData.name}</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <Badge variant={selectedDroneData.status === 'ARMED' ? 'destructive' : 'default'}>
                      {selectedDroneData.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Battery</span>
                    <span>{selectedDroneData.batteryLevel}%</span>
                  </div>
                  <Progress value={selectedDroneData.batteryLevel || 0} className="h-2" />
                  <div className="flex justify-between">
                    <span>Altitude</span>
                    <span>{selectedDroneData.altitude?.toFixed(1) || 0}m</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Display */}
      {isConnected && selectedDroneData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div>Lat: {selectedDroneData.latitude?.toFixed(6) || 'N/A'}</div>
                <div>Lon: {selectedDroneData.longitude?.toFixed(6) || 'N/A'}</div>
                <div>Alt: {selectedDroneData.altitude?.toFixed(1) || 0}m</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Attitude</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div>Roll: {selectedDroneData.roll?.toFixed(1) || 0}°</div>
                <div>Pitch: {selectedDroneData.pitch?.toFixed(1) || 0}°</div>
                <div>Yaw: {selectedDroneData.yaw?.toFixed(1) || 0}°</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Power System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div>Battery: {selectedDroneData.batteryLevel || 0}%</div>
                <div>Voltage: {selectedDroneData.voltage?.toFixed(2) || 0}V</div>
                <div>Current: {selectedDroneData.current?.toFixed(1) || 0}A</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Flight Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div>Speed: {selectedDroneData.groundSpeed?.toFixed(1) || 0} m/s</div>
                <div>Heading: {selectedDroneData.heading?.toFixed(0) || 0}°</div>
                <div>Mode: {selectedDroneData.flightMode || 'UNKNOWN'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection Instructions */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><strong>1.</strong> Connect your drone's flight controller to your computer via USB</p>
              <p><strong>2.</strong> Ensure your drone is powered on and the flight controller is active</p>
              <p><strong>3.</strong> Select the appropriate baud rate (usually 57600 for most autopilots)</p>
              <p><strong>4.</strong> Click "Connect to Drone" and select your flight controller from the list</p>
              <p><strong>5.</strong> Grant permission when prompted by Chrome</p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                This replaces the cloud bridge system with direct browser-to-drone communication
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}