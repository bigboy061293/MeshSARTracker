import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Web Serial API type declarations
declare global {
  interface Navigator {
    serial: Serial;
  }

  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }

  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialPort {
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
    
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }

  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Usb, 
  Play, 
  Square, 
  Trash2, 
  Wifi,
  WifiOff,
  Terminal,
  Download,
  Search
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'data' | 'error' | 'connect' | 'disconnect';
  message: string;
  rawData?: Uint8Array;
}

export default function NodesControl() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [port, setPort] = useState<SerialPort | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);
  
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Check if Web Serial API is supported
  const isWebSerialSupported = 'serial' in navigator;

  const addLog = (type: LogEntry['type'], message: string, rawData?: Uint8Array) => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      rawData
    };
    
    setLogs(prev => [...prev, newLog]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logScrollRef.current) {
        logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
      }
    }, 10);
  };

  const checkPreviousPorts = async () => {
    if (!isWebSerialSupported) {
      addLog('error', 'Web Serial API not supported');
      return;
    }

    try {
      const availablePorts = await navigator.serial.getPorts();
      
      if (availablePorts.length === 0) {
        addLog('info', 'No previously granted ports found. Use "Connect to Node" to select a device.');
        return;
      }

      addLog('info', `Found ${availablePorts.length} previously granted port(s)`);
      
      // Check each port's status
      for (let i = 0; i < availablePorts.length; i++) {
        const port = availablePorts[i];
        const portInfo = port.getInfo();
        const isOpen = port.readable || port.writable;
        
        addLog('info', `Port ${i + 1}: USB VID: ${portInfo.usbVendorId ? '0x' + portInfo.usbVendorId.toString(16) : 'Unknown'}, PID: ${portInfo.usbProductId ? '0x' + portInfo.usbProductId.toString(16) : 'Unknown'} - ${isOpen ? 'OPEN' : 'CLOSED'}`);
        
        if (isOpen) {
          addLog('info', 'Warning: Port is still open from previous session. Consider disconnecting and reconnecting.');
        }
      }
      
    } catch (error: any) {
      addLog('error', `Error checking ports: ${error.message}`);
    }
  };

  const connectToDevice = async () => {
    if (!isWebSerialSupported) {
      toast({
        title: "Web Serial Not Supported",
        description: "Please use Chrome or Edge browser for Web Serial API support",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Check if there are any previously granted ports
      const availablePorts = await navigator.serial.getPorts();
      if (availablePorts.length > 0) {
        addLog('info', `Found ${availablePorts.length} previously granted port(s)`);
      }
      
      // Request a port - use broader filters or no filters to show all devices
      const selectedPort = await navigator.serial.requestPort({
        // No filters to allow selection of any COM port including COM6
      });

      // Get device info before connecting
      const portInfo = selectedPort.getInfo();
      addLog('connect', `Serial port selected: USB Vendor ID: ${portInfo.usbVendorId ? '0x' + portInfo.usbVendorId.toString(16) : 'Unknown'}, Product ID: ${portInfo.usbProductId ? '0x' + portInfo.usbProductId.toString(16) : 'Unknown'}`);
      addLog('connect', 'Attempting connection...');

      // Open the port with settings suitable for Meshtastic devices
      await selectedPort.open({ 
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      setPort(selectedPort);
      setIsConnected(true);
      
      addLog('connect', 'Successfully connected to Meshtastic node via COM port');
      addLog('info', `Baud rate: 115200, Data bits: 8, Stop bits: 1, Parity: none`);
      
      toast({
        title: "Connected",
        description: "Successfully connected to Meshtastic node",
      });

      // Start reading data
      startReading(selectedPort);

    } catch (error: any) {
      console.error('Serial connection error:', error);
      addLog('error', `Connection failed: ${error.message}`);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to device",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const startReading = async (serialPort: SerialPort) => {
    if (!serialPort.readable) {
      addLog('error', 'Port is not readable');
      return;
    }

    try {
      const reader = serialPort.readable.getReader();
      readerRef.current = reader;
      
      addLog('info', 'Started reading data from node...');

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          addLog('info', 'Reading stream closed');
          break;
        }

        if (value) {
          // Update statistics
          setBytesReceived(prev => prev + value.length);
          setPacketsReceived(prev => prev + 1);

          // Process the received data
          processReceivedData(value);
        }
      }
    } catch (error: any) {
      if (error.name !== 'NetworkError') {
        addLog('error', `Reading error: ${error.message}`);
        console.error('Reading error:', error);
      }
    } finally {
      readerRef.current = null;
    }
  };

  const processReceivedData = (data: Uint8Array) => {
    // Convert to hex string for display
    const hexString = Array.from(data)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ');

    // Try to convert to ASCII for readable text
    const asciiString = Array.from(data)
      .map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.')
      .join('');

    // Log the raw data
    addLog('data', `Received ${data.length} bytes: ${hexString}`, data);
    
    // If it looks like text, also log the ASCII representation
    if (asciiString.includes('Meshtastic') || asciiString.match(/[a-zA-Z]{3,}/)) {
      addLog('data', `ASCII: ${asciiString}`);
    }

    // Basic Meshtastic packet detection
    if (data.length > 4) {
      // Look for potential Meshtastic packet markers
      if (data[0] === 0x94 && data[1] === 0xc3) {
        addLog('info', 'Detected potential Meshtastic packet');
        analyzePacket(data);
      }
    }
  };

  const analyzePacket = (packet: Uint8Array) => {
    try {
      // Basic packet analysis
      const length = packet.length;
      const header = Array.from(packet.slice(0, Math.min(8, length)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      addLog('info', `Packet analysis - Length: ${length}, Header: ${header}`);
      
      // Look for common Meshtastic patterns
      const packetStr = Array.from(packet).map(b => String.fromCharCode(b)).join('');
      
      if (packetStr.includes('!')) {
        addLog('info', 'Detected text message marker');
      }
      
      if (packet[0] === 0x94 && packet[1] === 0xc3) {
        addLog('info', 'Detected protobuf packet header');
      }
      
    } catch (error: any) {
      addLog('error', `Packet analysis error: ${error.message}`);
    }
  };

  const disconnectDevice = async () => {
    try {
      // Stop reading first
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
        } catch (cancelError) {
          addLog('info', 'Reader already cancelled or closed');
        }
        readerRef.current = null;
      }

      // Close the port if it's still open
      if (port && (port.readable || port.writable)) {
        await port.close();
        addLog('disconnect', 'Serial port closed');
      }

      addLog('disconnect', 'Disconnected from Meshtastic node');
      
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from device",
      });

    } catch (error: any) {
      addLog('error', `Disconnect error: ${error.message}`);
      console.error('Disconnect error:', error);
    } finally {
      // Always reset state regardless of errors
      setPort(null);
      setIsConnected(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setBytesReceived(0);
    setPacketsReceived(0);
    addLog('info', 'Log console cleared');
  };

  const exportLogs = () => {
    const logData = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meshtastic-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('info', 'Logs exported to file');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected && port) {
        // Force cleanup on page unmount
        addLog('info', 'Page unmounted - cleaning up connection...');
        
        // Stop reading
        if (readerRef.current) {
          readerRef.current.cancel().catch(() => {
            // Ignore cancellation errors during cleanup
          });
          readerRef.current = null;
        }

        // Close the port
        if (port && port.readable) {
          port.close().catch(() => {
            // Ignore close errors during cleanup
          });
        }
        
        setPort(null);
        setIsConnected(false);
      }
    };
  }, [isConnected, port]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-dark-secondary">Loading nodes control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-primary">Nodes Control Mode</h1>
          <p className="text-dark-secondary">Connect to local Meshtastic nodes via Web Serial API</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isWebSerialSupported ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              Web Serial Supported
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Web Serial Not Supported
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Controls */}
      <Card className="bg-surface-variant border-gray-700">
        <CardHeader>
          <CardTitle className="text-dark-primary flex items-center gap-2">
            <Usb className="h-5 w-5" />
            Serial Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {!isConnected ? (
                <>
                  <Button 
                    onClick={connectToDevice}
                    disabled={isConnecting || !isWebSerialSupported}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {isConnecting ? 'Connecting...' : 'Connect to Node'}
                  </Button>
                  <Button 
                    onClick={checkPreviousPorts}
                    disabled={isConnecting || !isWebSerialSupported}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Check Ports
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={disconnectDevice}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-dark-secondary">
              <div>
                Status: <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>Packets: {packetsReceived}</div>
              <div>Bytes: {bytesReceived.toLocaleString()}</div>
            </div>
          </div>
          
          {!isWebSerialSupported && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Web Serial API not supported.</strong> Please use Chrome or Edge browser 
                to connect directly to Meshtastic devices via USB.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Console */}
      <Card className="bg-surface-variant border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-dark-primary flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Log Console
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={exportLogs}
                variant="outline"
                size="sm"
                disabled={logs.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full border rounded-lg bg-black p-4" ref={logScrollRef}>
            <div className="font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Connect to a device to see data...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`flex gap-2 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'connect' ? 'text-green-400' :
                    log.type === 'disconnect' ? 'text-yellow-400' :
                    log.type === 'data' ? 'text-blue-400' :
                    'text-gray-300'
                  }`}>
                    <span className="text-gray-500 w-20 flex-shrink-0">[{log.timestamp}]</span>
                    <span className="w-12 flex-shrink-0 uppercase text-xs">
                      {log.type}:
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="mt-4 text-sm text-dark-secondary">
            <p>
              <strong>Instructions:</strong> Click "Connect to Node" to select and connect to a 
              Meshtastic device. All data received from the node will be displayed in the console above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}