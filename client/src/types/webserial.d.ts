// Web Serial API type declarations
interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  
  getInfo(): SerialPortInfo;
  getSignals(): Promise<SerialPortSignals>;
  setSignals(signals: SerialPortSignals): Promise<void>;
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
  name?: string;
}

interface SerialPortSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  ring?: boolean;
  dataCarrierDetect?: boolean;
  clearToSend?: boolean;
  dataSetReady?: boolean;
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}

interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
  name?: string;
}

interface Serial extends EventTarget {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  
  addEventListener(type: 'connect', listener: (event: Event) => void): void;
  addEventListener(type: 'disconnect', listener: (event: Event) => void): void;
  removeEventListener(type: 'connect', listener: (event: Event) => void): void;
  removeEventListener(type: 'disconnect', listener: (event: Event) => void): void;
}

interface Navigator {
  readonly serial: Serial;
}

declare global {
  interface Window {
    navigator: Navigator;
  }
}