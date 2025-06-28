import { useState, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

// Web Serial API types
declare global {
  interface Navigator {
    readonly serial: {
      requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }
  
  interface SerialPort {
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
    open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: 'none' | 'even' | 'odd'; bufferSize?: number; flowControl?: 'none' | 'hardware' }): Promise<void>;
    close(): Promise<void>;
  }
}

export interface MAVLinkPacket {
  timestamp: number;
  systemId: number;
  componentId: number;
  messageId: number;
  payload: any;
  rawData: Uint8Array;
}

export interface WebSerialConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  bufferSize: number;
  flowControl: 'none' | 'hardware';
}

export const DEFAULT_SERIAL_CONFIG: WebSerialConfig = {
  baudRate: 57600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  bufferSize: 255,
  flowControl: 'none'
};

export function useWebSerial() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [config, setConfig] = useState<WebSerialConfig>(DEFAULT_SERIAL_CONFIG);
  const [lastMessage, setLastMessage] = useState<MAVLinkPacket | null>(null);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { toast } = useToast();

  // Check if Web Serial API is supported
  const isSupported = 'serial' in navigator;

  // MAVLink frame parsing state
  const frameBufferRef = useRef<number[]>([]);
  const MAVLINK_STX = 0xFE; // MAVLink 1.0 start byte
  const MAVLINK_STX_V2 = 0xFD; // MAVLink 2.0 start byte

  const parseMAVLinkFrame = useCallback((data: Uint8Array) => {
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      frameBufferRef.current.push(byte);

      // Look for MAVLink start byte
      if (byte === MAVLINK_STX || byte === MAVLINK_STX_V2) {
        frameBufferRef.current = [byte]; // Start new frame
        continue;
      }

      // Parse MAVLink 1.0 frame (minimum 8 bytes)
      if (frameBufferRef.current[0] === MAVLINK_STX && frameBufferRef.current.length >= 8) {
        const payloadLength = frameBufferRef.current[1];
        const totalLength = payloadLength + 8; // STX + LEN + SEQ + SYS + COMP + MSG + PAYLOAD + CRC

        if (frameBufferRef.current.length >= totalLength) {
          const frame = new Uint8Array(frameBufferRef.current.slice(0, totalLength));
          const packet: MAVLinkPacket = {
            timestamp: Date.now(),
            systemId: frame[3],
            componentId: frame[4],
            messageId: frame[5],
            payload: frame.slice(6, 6 + payloadLength),
            rawData: frame
          };

          setLastMessage(packet);
          setBytesReceived(prev => prev + totalLength);
          
          // Send to backend for processing
          fetch('/api/mavlink/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              packet: {
                systemId: packet.systemId,
                componentId: packet.componentId,
                messageId: packet.messageId,
                payload: Array.from(packet.payload),
                timestamp: packet.timestamp
              }
            })
          }).catch(console.error);

          frameBufferRef.current = []; // Reset for next frame
        }
      }

      // Parse MAVLink 2.0 frame (minimum 12 bytes)
      if (frameBufferRef.current[0] === MAVLINK_STX_V2 && frameBufferRef.current.length >= 12) {
        const payloadLength = frameBufferRef.current[1];
        const totalLength = payloadLength + 12; // STX_V2 + LEN + INCOMPAT + COMPAT + SEQ + SYS + COMP + MSG_ID(3) + PAYLOAD + CRC(2)

        if (frameBufferRef.current.length >= totalLength) {
          const frame = new Uint8Array(frameBufferRef.current.slice(0, totalLength));
          const packet: MAVLinkPacket = {
            timestamp: Date.now(),
            systemId: frame[5],
            componentId: frame[6],
            messageId: (frame[7] | (frame[8] << 8) | (frame[9] << 16)), // 24-bit message ID
            payload: frame.slice(10, 10 + payloadLength),
            rawData: frame
          };

          setLastMessage(packet);
          setBytesReceived(prev => prev + totalLength);
          
          // Send to backend for processing
          fetch('/api/mavlink/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              packet: {
                systemId: packet.systemId,
                componentId: packet.componentId,
                messageId: packet.messageId,
                payload: Array.from(packet.payload),
                timestamp: packet.timestamp
              }
            })
          }).catch(console.error);

          frameBufferRef.current = []; // Reset for next frame
        }
      }

      // Prevent buffer overflow
      if (frameBufferRef.current.length > 300) {
        frameBufferRef.current = [];
      }
    }
  }, []);

  const requestPort = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Web Serial Not Supported",
        description: "Your browser doesn't support Web Serial API. Please use Chrome 89+ or Edge 89+.",
        variant: "destructive"
      });
      return null;
    }

    try {
      const selectedPort = await navigator.serial.requestPort({
        filters: [
          // Common drone autopilot USB IDs
          { usbVendorId: 0x26AC }, // Pixhawk
          { usbVendorId: 0x0483 }, // STMicroelectronics
          { usbVendorId: 0x1209 }, // ArduPilot
          { usbVendorId: 0x2341 }, // Arduino
        ]
      });
      return selectedPort;
    } catch (error) {
      if ((error as Error).name !== 'NotFoundError') {
        toast({
          title: "Port Selection Failed",
          description: (error as Error).message,
          variant: "destructive"
        });
      }
      return null;
    }
  }, [isSupported, toast]);

  const connect = useCallback(async (selectedPort?: SerialPort) => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    
    try {
      const portToUse = selectedPort || await requestPort();
      if (!portToUse) {
        setIsConnecting(false);
        return;
      }

      await portToUse.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        bufferSize: config.bufferSize,
        flowControl: config.flowControl
      });

      setPort(portToUse);
      setIsConnected(true);

      // Setup abort controller for cancelling read operations
      abortControllerRef.current = new AbortController();

      // Setup reader
      if (portToUse.readable) {
        readerRef.current = portToUse.readable.getReader();
        
        // Start reading data
        const readLoop = async () => {
          try {
            while (readerRef.current && !abortControllerRef.current?.signal.aborted) {
              const { value, done } = await readerRef.current.read();
              
              if (done) break;
              if (value) {
                parseMAVLinkFrame(value);
              }
            }
          } catch (error) {
            if (!abortControllerRef.current?.signal.aborted) {
              console.error('Serial read error:', error);
              toast({
                title: "Connection Lost",
                description: "Lost connection to serial device",
                variant: "destructive"
              });
              await disconnect();
            }
          }
        };

        readLoop();
      }

      // Setup writer
      if (portToUse.writable) {
        writerRef.current = portToUse.writable.getWriter();
      }

      toast({
        title: "Connected",
        description: `Connected to drone via Web Serial at ${config.baudRate} baud`,
        variant: "default"
      });

    } catch (error) {
      console.error('Serial connection error:', error);
      toast({
        title: "Connection Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, config, requestPort, parseMAVLinkFrame, toast]);

  const disconnect = useCallback(async () => {
    try {
      // Cancel any ongoing read operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Close reader
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }

      // Close writer
      if (writerRef.current) {
        writerRef.current.releaseLock();
        writerRef.current = null;
      }

      // Close port
      if (port) {
        await port.close();
        setPort(null);
      }

      setIsConnected(false);
      frameBufferRef.current = [];
      
      toast({
        title: "Disconnected",
        description: "Serial connection closed",
        variant: "default"
      });

    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [port, toast]);

  const sendCommand = useCallback(async (data: Uint8Array) => {
    if (!writerRef.current || !isConnected) {
      throw new Error('Not connected to serial port');
    }

    try {
      await writerRef.current.write(data);
      setBytesSent(prev => prev + data.length);
    } catch (error) {
      console.error('Send command error:', error);
      throw error;
    }
  }, [isConnected]);

  const getAvailablePorts = useCallback(async () => {
    if (!isSupported) return [];
    
    try {
      return await navigator.serial.getPorts();
    } catch (error) {
      console.error('Failed to get available ports:', error);
      return [];
    }
  }, [isSupported]);

  return {
    // State
    port,
    isConnected,
    isConnecting,
    isSupported,
    config,
    lastMessage,
    bytesReceived,
    bytesSent,

    // Actions
    connect,
    disconnect,
    sendCommand,
    requestPort,
    getAvailablePorts,
    setConfig,

    // Utility
    resetStats: () => {
      setBytesReceived(0);
      setBytesSent(0);
    }
  };
}