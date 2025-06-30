import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeshtasticProtocol } from "@shared/meshtastic-proto";

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
  Search,
  Database,
  Info,
  RefreshCw
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'data' | 'error' | 'connect' | 'disconnect' | 'protocol' | 'success';
  message: string;
  rawData?: Uint8Array;
}

export default function NodesControl() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [port, setPort] = useState<SerialPort | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);
  const [connectedNodeId, setConnectedNodeId] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<MeshtasticProtocol | null>(null);
  const [protocolInitialized, setProtocolInitialized] = useState(false);
  const [dataBuffer, setDataBuffer] = useState<Uint8Array>(new Uint8Array(0));
  // Console text buffer for extracting node ID from fragmented debug output
  const [consoleBuffer, setConsoleBuffer] = useState<string>('');
  
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Extract node ID from console debug text 
  const extractNodeIdFromConsoleText = (text: string): string | null => {
    // Look for patterns like "!da75d1c4" or "0xda75d1c4" in debug output
    const exclamationMatch = text.match(/!([a-f0-9]{8})/i);
    if (exclamationMatch) {
      return `!${exclamationMatch[1].toLowerCase()}`;
    }
    
    const hexMatch = text.match(/0x([a-f0-9]{8})/i);
    if (hexMatch) {
      return `!${hexMatch[1].toLowerCase()}`;
    }
    
    return null;
  };

  // Check if Web Serial API is supported
  const isWebSerialSupported = 'serial' in navigator;

  // Initialize Meshtastic protocol
  useEffect(() => {
    const initProtocol = async () => {
      try {
        const meshProtocol = MeshtasticProtocol.getInstance();
        await meshProtocol.initialize();
        setProtocol(meshProtocol);
        setProtocolInitialized(true);
        addLog('info', '✅ Meshtastic protobuf protocol initialized');
      } catch (error) {
        addLog('error', `Failed to initialize Meshtastic protocol: ${error}`);
      }
    };
    
    initProtocol();
  }, []);

  // NodeDB mutation
  const nodeDbMutation = useMutation({
    mutationFn: async (data: {
      nodeId: string;
      dataType: string;
      rawData: any;
      parsedData?: any;
      dataSize?: number;
      recordCount?: number;
    }) => {
      const response = await apiRequest('POST', '/api/nodedb/read', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "NodeDB Read Successfully",
        description: "NodeDB data has been saved to the database",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/nodedb'] });
    },
    onError: (error: any) => {
      toast({
        title: "NodeDB Read Failed",
        description: error.message || "Failed to read NodeDB",
        variant: "destructive",
      });
    },
  });

  // Node Info mutation
  const nodeInfoMutation = useMutation({
    mutationFn: async (data: {
      nodeId: string;
      dataType: string;
      rawData: any;
      parsedData?: any;
      dataSize?: number;
      recordCount?: number;
    }) => {
      const response = await apiRequest('POST', '/api/nodedb/read', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Node Info Read Successfully",
        description: "Node information has been retrieved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Node Info Read Failed",
        description: error.message || "Failed to read node information",
        variant: "destructive",
      });
    },
  });

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

  // Switch device to API mode (from console mode)
  const switchToApiMode = async () => {
    if (!port || !port.writable) {
      addLog('error', 'Cannot switch to API mode - port not writable');
      return;
    }

    try {
      addLog('info', '🔄 Attempting to switch device from console to API mode...');
      
      const writer = port.writable.getWriter();
      
      try {
        // Ultra-aggressive approach to force device out of console debug mode
        const commands = [
          '\x03\x03\x03\x03', // Quadruple Ctrl+C to break any running process
          '\r\n',             // Send newline to clear any partial commands
          'reset\r\n',        // Hardware reset attempt
          '\x1A',             // Ctrl+Z (suspend)
          '\r\n',             // Clear line
          'exit\r\n',         // Try to exit current mode
          'quit\r\n',         // Alternative exit command
          '\x04\x04',         // Double Ctrl+D to force exit
          '\r\n',             // Clear line again
          'api\r\n',          // Switch to API mode
          'meshtastic --set device.serialConsole false\r\n', // Disable serial console
          '+++',              // Hayes command escape sequence (longer version)
          '\r\n',             // Clear line
          'AT\r\n',           // AT command (some devices respond to this)
          'AT+API\r\n',       // Force API mode with AT command
          '\x1b\x1b',         // Double ESC key
          '\r\n',             // Clear line
          '\x00\x00',         // Null bytes to trigger binary mode detection
          '\r\n',             // Final clear
        ];
        
        for (const command of commands) {
          const commandBytes = new TextEncoder().encode(command);
          const displayCmd = command === '\x03\x03\x03\x03' ? 'Quadruple Ctrl+C' :
                           command === '\x03\x03\x03' ? 'Triple Ctrl+C' : 
                           command === '\x03' ? 'Ctrl+C' : 
                           command === '\x04\x04' ? 'Double Ctrl+D' :
                           command === '\x04' ? 'Ctrl+D' : 
                           command === '\x1A' ? 'Ctrl+Z (Suspend)' :
                           command === '\x1b\x1b' ? 'Double ESC' :
                           command === '\x1b' ? 'ESC' :
                           command === '\x00\x00' ? 'Null Bytes (Binary Mode)' :
                           command === '+++' ? 'Hayes Escape Sequence' :
                           command.includes('meshtastic') ? 'Disable Serial Console' :
                           command.includes('AT') ? 'AT Command' :
                           command.replace(/\r\n/g, '\\r\\n');
          addLog('info', `📤 Sending command: ${displayCmd}`);
          await writer.write(commandBytes);
          await new Promise(resolve => setTimeout(resolve, 250)); // Slightly faster sequence
        }
        
        // Wait a bit then try to send a test protobuf frame
        setTimeout(async () => {
          try {
            addLog('info', '🧪 Testing if API mode is active - sending test frame...');
            const testFrame = new Uint8Array([0x94, 0xc3, 0x00, 0x01, 0x08, 0x01]); // Simple test frame
            await writer.write(testFrame);
            addLog('info', '📤 Test protobuf frame sent');
          } catch (error: any) {
            addLog('error', `⚠️ Could not send test frame: ${error.message}`);
          }
        }, 2000);
        
        addLog('info', '✅ API mode switch commands sent - waiting for device response...');
        
      } finally {
        writer.releaseLock();
      }
      
    } catch (error: any) {
      addLog('error', `❌ Failed to switch to API mode: ${error.message}`);
      console.error('API mode switch error:', error);
    }
  };

  // Try firmware-level commands to force API mode
  const tryFirmwareLevelCommands = async (targetPort?: SerialPort) => {
    const activePort = targetPort || port;
    
    if (!activePort || !activePort.writable) {
      addLog('error', 'Cannot send firmware commands - port not available');
      return;
    }

    try {
      const writer = activePort.writable.getWriter();
      
      try {
        addLog('info', '🛠️ Trying firmware-level commands to disable console...');
        
        // Firmware-level configuration commands to disable serial console
        const firmwareCommands = [
          // Complete system reset
          'reboot\r\n',
          '\r\n',
        ];
        
        for (const command of firmwareCommands) {
          const commandBytes = new TextEncoder().encode(command);
          addLog('info', `📤 Firmware command: ${command.replace(/\r\n/g, '\\r\\n')}`);
          await writer.write(commandBytes);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // After reboot commands, wait and try meshtastic-specific config
        setTimeout(async () => {
          try {
            const configCommands = [
              // Meshtastic CLI-style commands to disable console
              'meshtastic --set device.serial_enabled false\r\n',
              'meshtastic --set device.debug_log_enabled false\r\n', 
              'meshtastic --set device.serial_console false\r\n',
              '\r\n',
              
              // Final API mode attempts
              'api\r\n',
              '\x00\x00\x00\x00', // Null bytes to trigger binary detection
            ];
            
            for (const cmd of configCommands) {
              const cmdBytes = new TextEncoder().encode(cmd);
              await writer.write(cmdBytes);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            addLog('info', '✅ Firmware configuration commands sent');
            addLog('info', '🔄 Device may need 10-30 seconds to apply settings...');
            
          } catch (error: any) {
            addLog('error', `Firmware config failed: ${error.message}`);
          }
        }, 2000);
        
      } finally {
        writer.releaseLock();
      }
      
    } catch (error: any) {
      addLog('error', `Cannot access port for firmware commands: ${error.message}`);
    }
  };

  // Send configuration request to establish connection (like phone app does)
  const sendConfigurationRequest = async (targetPort?: SerialPort) => {
    const activePort = targetPort || port;
    
    if (!activePort) {
      addLog('error', 'Cannot send config request - no port available');
      addLog('info', '💡 Make sure the device is connected first');
      return;
    }

    if (!activePort.writable) {
      addLog('error', 'Cannot send config request - port not writable (may be in read-only mode)');
      addLog('info', '💡 Port may need time to initialize or device may be in console mode');
      return;
    }

    if (!protocol || !protocolInitialized) {
      addLog('error', 'Cannot send config request - protocol not initialized');
      addLog('info', '💡 Protocol initialization is still in progress');
      return;
    }

    try {
      addLog('info', '🔧 Sending configuration request to establish connection...');
      
      const writer = activePort.writable.getWriter();
      
      try {
        // Create wantConfig request (equivalent to "Client wants config, nonce=8")
        const configRequest = protocol.createNodeDbRequest(); // This sends wantConfigId: true
        const framedRequest = protocol.frameData(configRequest);
        
        addLog('info', `📤 Sending wantConfig request (${framedRequest.length} bytes)`);
        addLog('data', `Config request HEX: ${Array.from(framedRequest.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        await writer.write(framedRequest);
        
        addLog('info', '✅ Configuration request sent - device should respond with node info');
        
      } finally {
        writer.releaseLock();
      }
      
    } catch (error: any) {
      addLog('error', `❌ Failed to send config request: ${error.message}`);
      console.error('Config request error:', error);
    }
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
      
      // Don't generate fake node ID - wait for real device response
      setConnectedNodeId(null);
      
      addLog('connect', 'Successfully connected to Meshtastic node via COM port');
      addLog('info', '🔍 Waiting for device to provide real node ID...');
      addLog('info', `Baud rate: 115200, Data bits: 8, Stop bits: 1, Parity: none`);
      
      toast({
        title: "Connected",
        description: "Successfully connected to Meshtastic node",
      });

      // Start reading data
      startReading(selectedPort);
      
      // Device is working correctly - just listen for data
      setTimeout(() => {
        addLog('info', '📡 Listening for device data...');
        addLog('info', '🔧 Serial data buffering enabled to handle fragmentation');
      }, 500);

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

  // Buffer to accumulate fragmented serial data
  let serialDataBuffer = new Uint8Array(0);
  let bufferTimeout: NodeJS.Timeout | null = null;

  const accumulateSerialData = (newData: Uint8Array) => {
    // Accumulate data into buffer
    const combinedBuffer = new Uint8Array(serialDataBuffer.length + newData.length);
    combinedBuffer.set(serialDataBuffer, 0);
    combinedBuffer.set(newData, serialDataBuffer.length);
    serialDataBuffer = combinedBuffer;

    // Clear any existing timeout
    if (bufferTimeout) {
      clearTimeout(bufferTimeout);
    }

    // Set timeout to process accumulated data after a brief pause
    bufferTimeout = setTimeout(() => {
      if (serialDataBuffer.length > 0) {
        // Process the accumulated data
        processReceivedData(serialDataBuffer);
        // Clear the buffer
        serialDataBuffer = new Uint8Array(0);
      }
    }, 100); // Wait 100ms for more data to accumulate
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

          // Accumulate fragmented data instead of processing immediately
          accumulateSerialData(value);
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
    // Enhanced debugging - show both hex and text interpretation
    const hexData = Array.from(data.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    
    // Convert bytes to readable text (printable ASCII characters)
    const textData = Array.from(data.slice(0, 32))
      .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
      .join('');
    
    // Convert bytes to binary for protocol analysis
    const binaryData = Array.from(data.slice(0, 8))
      .map(b => b.toString(2).padStart(8, '0'))
      .join(' ');
    
    addLog('data', `📥 Received ${data.length} bytes: "${textData}"${data.length > 32 ? '...' : ''}`);
    
    // Check if device is in console/debug mode (ASCII text output)
    const isConsoleOutput = data.every(b => (b >= 32 && b <= 126) || b === 0x1b || b === 0x0d || b === 0x0a);
    
    if (isConsoleOutput && data.length > 0) {
      // Convert to text and add to console buffer
      const fragmentText = Array.from(data).map(b => String.fromCharCode(b)).join('');
      const newConsoleBuffer = consoleBuffer + fragmentText;
      setConsoleBuffer(newConsoleBuffer);
      
      // Check if we have enough text to extract node ID
      const extractedNodeId = extractNodeIdFromConsoleText(newConsoleBuffer);
      if (extractedNodeId && extractedNodeId !== connectedNodeId) {
        addLog('info', `🎯 FOUND NODE ID in console output: ${extractedNodeId}`);
        setConnectedNodeId(extractedNodeId);
        
        // Create node record from console data
        const nodeData = {
          nodeId: extractedNodeId,
          dataType: 'console_extraction',
          rawData: { consoleText: newConsoleBuffer },
          parsedData: { nodeId: extractedNodeId, source: 'console_debug' },
          dataSize: newConsoleBuffer.length,
          recordCount: 1
        };
        
        // Store the node info
        nodeInfoMutation.mutate(nodeData);
      }
      
      addLog('error', '⚠️ Device is sending console/debug output, not protobuf data');
      addLog('error', `Console text: "${fragmentText}"`);
      addLog('info', '💡 Device may need to be switched to API mode or different baud rate');
      
      // Keep recent console buffer (last 2000 chars to avoid memory issues)
      if (newConsoleBuffer.length > 2000) {
        setConsoleBuffer(newConsoleBuffer.slice(-2000));
      }
      
      return; // Don't process as protobuf
    }
    
    // Clear console buffer when we get binary data
    if (consoleBuffer.length > 0) {
      setConsoleBuffer('');
      addLog('info', '🔄 Cleared console buffer - receiving binary data');
    }
    
    // Check for official Meshtastic frame patterns
    if (data.length >= 2) {
      if (data[0] === 0x94 && data[1] === 0xc3) {
        addLog('info', `🔍 Detected Meshtastic frame header: ${data[0].toString(16)} ${data[1].toString(16)}`);
        if (data.length >= 4) {
          const length = data[2] | (data[3] << 8);
          addLog('info', `📏 Frame length: ${length} bytes`);
        }
      } else {
        addLog('error', '⚠️ No valid Meshtastic frame header detected');
      }
    }
    
    // Process protobuf packets if protocol is initialized
    if (protocol && protocolInitialized && data.length > 0) {
      // Append new data to buffer
      const newBuffer = new Uint8Array(dataBuffer.length + data.length);
      newBuffer.set(dataBuffer);
      newBuffer.set(data, dataBuffer.length);
      
      try {
        // Parse framed data using protobuf protocol
        const { packets, remaining } = protocol.parseFramedData(newBuffer);
        
        // Process each complete packet
        packets.forEach((packet, index) => {
          try {
            const parsedData = protocol.parseFromRadio(packet);
            if (parsedData) {
              addLog('info', `📦 Parsed protobuf packet ${index + 1}: ${parsedData.myInfo ? 'MyNodeInfo' : parsedData.nodeInfo ? 'NodeInfo' : parsedData.packet ? 'MeshPacket' : 'Unknown'}`);
              
              // Handle different packet types
              if (parsedData.myInfo) {
                addLog('info', '📱 Received MyNodeInfo response');
                handleNodeInfoResponse(parsedData.myInfo);
              } else if (parsedData.nodeInfo) {
                addLog('info', '📊 Received NodeInfo response');
                handleNodeInfoResponse(parsedData.nodeInfo);
              } else if (parsedData.packet) {
                addLog('info', '📡 Received mesh packet');
                handleMeshPacket(parsedData.packet);
              }
            }
          } catch (error) {
            addLog('error', `❌ Failed to parse protobuf packet: ${error}`);
          }
        });
        
        // Update buffer with remaining data
        setDataBuffer(remaining);
      } catch (error) {
        addLog('error', `❌ Frame parsing error: ${error}`);
        // Clear buffer on parse error to prevent corruption
        setDataBuffer(new Uint8Array(0));
      }
    } else if (data.length > 0) {
      // Store binary data in buffer even if protocol not ready
      const newBuffer = new Uint8Array(dataBuffer.length + data.length);
      newBuffer.set(dataBuffer);
      newBuffer.set(data, dataBuffer.length);
      setDataBuffer(newBuffer);
      
      addLog('info', '📦 Binary data buffered (protocol not ready)');
    }
  };

  // Handle node info responses from protobuf
  const handleNodeInfoResponse = (nodeInfo: any) => {
    try {
      addLog('info', '🔍 Processing node info response...');
      addLog('data', `Raw nodeInfo object: ${JSON.stringify(nodeInfo, null, 2)}`);
      
      const convertedInfo = protocol?.convertNodeInfo(nodeInfo);
      if (convertedInfo) {
        addLog('data', `Converted info: ${JSON.stringify(convertedInfo, null, 2)}`);
        
        const realNodeId = convertedInfo.nodeInfo.nodeId;
        addLog('info', `📱 Node Info: ${convertedInfo.nodeInfo.longName} (${convertedInfo.nodeInfo.hwModel})`);
        addLog('info', `🔑 Extracted node ID: "${realNodeId}" (length: ${realNodeId?.length})`);
        
        // Debug node ID format
        if (realNodeId) {
          const isValidFormat = realNodeId.startsWith('!') && realNodeId.length === 9;
          addLog('info', `🔍 Node ID format check: ${isValidFormat ? 'VALID' : 'INVALID'} (expected: !xxxxxxxx)`);
          
          if (realNodeId !== connectedNodeId) {
            setConnectedNodeId(realNodeId);
            addLog('info', `✅ Updated node ID from "${connectedNodeId}" to "${realNodeId}"`);
          } else {
            addLog('info', `ℹ️ Node ID unchanged: "${realNodeId}"`);
          }
        } else {
          addLog('error', '❌ No node ID found in response');
        }
        
        // Store the node info
        nodeInfoMutation.mutate({
          nodeId: realNodeId || 'unknown',
          dataType: 'node_info',
          rawData: nodeInfo,
          parsedData: convertedInfo,
          dataSize: JSON.stringify(nodeInfo).length,
          recordCount: 1
        });
      } else {
        addLog('error', '❌ Failed to convert node info - protocol.convertNodeInfo returned null');
      }
    } catch (error) {
      addLog('error', `❌ Failed to process node info: ${error}`);
      console.error('Node info processing error:', error);
    }
  };

  // Handle mesh packets from protobuf
  const handleMeshPacket = (packet: any) => {
    addLog('info', `📡 Mesh packet from ${packet.from} to ${packet.to}`);
    
    // Could process different payload types here
    if (packet.payloadVariant) {
      try {
        // Decode data payload if present
        const dataPayload = protocol?.parseFromRadio(packet.payloadVariant);
        if (dataPayload) {
          addLog('info', `📋 Payload type: ${dataPayload.portnum || 'unknown'}`);
        }
      } catch (error) {
        // Ignore payload parsing errors - not all packets have decodable payloads
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
      setConnectedNodeId(null);
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



  const readNodeInfo = async () => {
    if (!isConnected || !port) {
      toast({
        title: "Cannot Read Node Info",
        description: "Please connect to a Meshtastic node first",
        variant: "destructive",
      });
      return;
    }

    if (!protocol || !protocolInitialized) {
      toast({
        title: "Protocol Not Ready",
        description: "Meshtastic protobuf protocol is not initialized",
        variant: "destructive",
      });
      return;
    }

    // Check if we already have a real node ID
    if (connectedNodeId && connectedNodeId.startsWith('!') && connectedNodeId.length === 9) {
      addLog('info', `🔑 Using existing real node ID: ${connectedNodeId}`);
    } else {
      addLog('info', '🔍 No real node ID yet - will be extracted from device response');
    }

    try {
      addLog('info', '🔍 Starting protobuf-compliant node info read...');
      
      if (!port.writable) {
        throw new Error('Port is not writable');
      }

      const writer = port.writable.getWriter();
      
      try {
        // Create proper protobuf node info request
        const nodeInfoRequest = protocol.createNodeInfoRequest(Date.now() % 65536);
        const framedRequest = protocol.frameData(nodeInfoRequest);
        
        addLog('info', `📤 Sending protobuf MyNodeInfo request (${framedRequest.length} bytes)`);
        await writer.write(framedRequest);
        
        addLog('info', '⏳ Waiting for protobuf responses (5 seconds)...');
        
        // Wait for responses to be processed by the protobuf handler
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        addLog('info', '✅ Protobuf node info request completed');
        
      } finally {
        writer.releaseLock();
      }
      
      addLog('info', '✅ Node info request completed - responses will be processed by protobuf handler');
      
    } catch (error: any) {
      addLog('error', `❌ Node info read failed: ${error.message}`);
      console.error('Node info read error:', error);
    }
  };

  // Read NodeDB function with protobuf protocol implementation
  const readNodeDb = async () => {
    if (!port || !isConnected) {
      addLog('error', '❌ No serial port connected');
      return;
    }

    addLog('info', '📋 Starting NodeDB read with protobuf protocol...');

    try {
      if (!port.writable) {
        addLog('error', '❌ Serial port is not writable');
        return;
      }

      const writer = port.writable.getWriter();
      
      try {
        // Initialize protobuf protocol
        const protocol = MeshtasticProtocol.getInstance();
        await protocol.initialize();
        
        // Create proper protobuf NodeDB request
        const nodeDbRequest = protocol.createNodeDbRequest();
        const framedRequest = protocol.frameData(nodeDbRequest);
        
        addLog('info', `📤 Sending protobuf NodeDB request (${framedRequest.length} bytes)`);
        await writer.write(framedRequest);
        
        addLog('info', '⏳ Waiting for NodeDB protobuf responses (5 seconds)...');
        
        // Wait for responses to be processed by the protobuf handler
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        addLog('info', '✅ Protobuf NodeDB request completed');
        
      } finally {
        writer.releaseLock();
      }
      
      addLog('info', '✅ NodeDB request completed - responses will be processed by protobuf handler');
      
    } catch (error: any) {
      addLog('error', `❌ NodeDB read failed: ${error.message}`);
      console.error('NodeDB read error:', error);
    }
  };
  
  // Helper function to parse Meshtastic responses
  const parseResponse = (payload: Uint8Array): any | null => {
    try {
      if (payload.length < 2) return null;
      
      const messageType = payload[0];
      
      switch (messageType) {
        case 0x08: // Admin response
          if (payload.length >= 4) {
            const adminType = payload[2];
            if (adminType === 0x01) {
              return {
                type: 'myNodeInfo',
                data: {
                  nodeId: `!${Array.from(payload.slice(4, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}`,
                  longName: extractStringFromPayload(payload, 8) || "Meshtastic Device",
                  shortName: extractStringFromPayload(payload, 20, 4) || "MESH",
                  hwModel: detectHardwareFromPayload(payload) || "Unknown",
                  firmwareVersion: extractStringFromPayload(payload, 30) || "Unknown"
                }
              };
            } else if (adminType === 0x02) {
              return {
                type: 'deviceConfig',
                data: {
                  role: extractRole(payload[10]) || "CLIENT",
                  region: extractRegion(payload[11]) || "Unknown"
                }
              };
            }
          }
          break;
          
        case 0x10: // Telemetry
          return {
            type: 'telemetry',
            data: {
              batteryLevel: payload[2] || 0,
              voltage: (payload[3] + payload[4] * 256) / 100 || 0,
              channelUtilization: payload[5] || 0
            }
          };
          
        case 0x20: // Position
          return {
            type: 'position',
            data: {
              latitude: extractCoordinate(payload, 2),
              longitude: extractCoordinate(payload, 6),
              altitude: payload[10] | (payload[11] << 8)
            }
          };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };
  
  // Helper functions for parsing
  const extractStringFromPayload = (payload: Uint8Array, offset: number, maxLength?: number): string | null => {
    try {
      const length = maxLength || Math.min(20, payload.length - offset);
      const chars = [];
      for (let i = 0; i < length && offset + i < payload.length; i++) {
        const byte = payload[offset + i];
        if (byte === 0) break;
        if (byte >= 32 && byte <= 126) {
          chars.push(String.fromCharCode(byte));
        }
      }
      return chars.length > 0 ? chars.join('') : null;
    } catch {
      return null;
    }
  };
  
  const detectHardwareFromPayload = (payload: Uint8Array): string => {
    const str = Array.from(payload).map(b => String.fromCharCode(b)).join('');
    if (str.includes('TBEAM')) return 'T-Beam';
    if (str.includes('HELTEC')) return 'Heltec';
    if (str.includes('RAK')) return 'RAK4631';
    return 'Unknown';
  };
  
  const extractRole = (byte: number): string => {
    const roles = ['CLIENT', 'CLIENT_MUTE', 'ROUTER', 'ROUTER_CLIENT'];
    return roles[byte] || 'CLIENT';
  };
  
  const extractRegion = (byte: number): string => {
    const regions = ['Unset', 'US', 'EU_433', 'EU_868', 'CN', 'JP', 'ANZ', 'KR', 'TW', 'RU', 'IN', 'NZ_865', 'TH', 'LORA_24', 'UA_433', 'UA_868'];
    return regions[byte] || 'Unknown';
  };
  
  const extractCoordinate = (payload: Uint8Array, offset: number): number => {
    if (offset + 4 <= payload.length) {
      const value = payload[offset] | (payload[offset + 1] << 8) | (payload[offset + 2] << 16) | (payload[offset + 3] << 24);
      return value / 10000000; // Meshtastic coordinate scaling
    }
    return 0;
  };



  // Check for existing connections on page load
  useEffect(() => {
    const checkExistingConnections = async () => {
      if (!isWebSerialSupported) return;
      
      try {
        const availablePorts = await navigator.serial.getPorts();
        
        // Check if any ports are currently open
        for (const existingPort of availablePorts) {
          if (existingPort.readable || existingPort.writable) {
            addLog('info', 'Detected active serial connection from previous session');
            const portInfo = existingPort.getInfo();
            addLog('info', `Reconnecting to: USB VID: ${portInfo.usbVendorId ? '0x' + portInfo.usbVendorId.toString(16) : 'Unknown'}, PID: ${portInfo.usbProductId ? '0x' + portInfo.usbProductId.toString(16) : 'Unknown'}`);
            
            // Restore the connection state
            setPort(existingPort);
            setIsConnected(true);
            
            // Resume reading from the port
            startReading(existingPort);
            break;
          }
        }
      } catch (error: any) {
        addLog('info', 'No existing connections detected');
      }
    };
    
    checkExistingConnections();
  }, []);

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
                <>
                  <Button 
                    onClick={readNodeInfo}
                    disabled={nodeInfoMutation.isPending}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    {nodeInfoMutation.isPending ? 'Reading...' : 'Read Info'}
                  </Button>
                  <Button 
                    onClick={readNodeDb}
                    disabled={nodeDbMutation.isPending}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    {nodeDbMutation.isPending ? 'Reading...' : 'Read NodeDB'}
                  </Button>
                  <Button 
                    onClick={() => sendConfigurationRequest()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Terminal className="h-4 w-4" />
                    Send Config Request
                  </Button>
                  <Button 
                    onClick={switchToApiMode}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Switch to API Mode
                  </Button>
                  <Button 
                    onClick={disconnectDevice}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Disconnect
                  </Button>
                </>
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