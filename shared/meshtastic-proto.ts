/**
 * Meshtastic Protocol Buffer Definitions
 * Based on Meshtastic official protobuf definitions
 */

import protobuf from 'protobufjs';

// Define Meshtastic protocol buffer messages
const meshtasticProto = `
syntax = "proto3";

package meshtastic;

// Data packet types
enum PortNum {
  UNKNOWN_APP = 0;
  TEXT_MESSAGE_APP = 1;
  REMOTE_HARDWARE_APP = 2;
  POSITION_APP = 3;
  NODEINFO_APP = 4;
  ROUTING_APP = 5;
  ADMIN_APP = 6;
  TEXT_MESSAGE_COMPRESSED_APP = 7;
  WAYPOINT_APP = 8;
  AUDIO_APP = 9;
  DETECTION_SENSOR_APP = 10;
  REPLY_APP = 32;
  IP_TUNNEL_APP = 33;
  PAXCOUNTER_APP = 34;
  SERIAL_APP = 64;
  STORE_FORWARD_APP = 65;
  RANGE_TEST_APP = 66;
  TELEMETRY_APP = 67;
  ZPS_APP = 68;
  SIMULATOR_APP = 69;
  TRACEROUTE_APP = 70;
  NEIGHBORINFO_APP = 71;
  ATAK_PLUGIN = 72;
  MAP_REPORT_APP = 73;
  PRIVATE_APP = 256;
  ATAK_FORWARDER = 257;
  MAX = 511;
}

// Hardware models
enum HardwareModel {
  UNSET = 0;
  TLORA_V2 = 1;
  TLORA_V1 = 2;
  TLORA_V2_1_1P6 = 3;
  TBEAM = 4;
  HELTEC_V2_0 = 5;
  TBEAM_V0P7 = 6;
  T_ECHO = 7;
  TLORA_V1_1P3 = 8;
  RAK4631 = 9;
  HELTEC_V2_1 = 10;
  HELTEC_V1 = 11;
  LILYGO_TBEAM_S3_CORE = 12;
  RAK11200 = 13;
  NANO_G1 = 14;
  TLORA_V2_1_1P8 = 15;
  TLORA_T3_S3 = 16;
  NANO_G1_EXPLORER = 17;
  NANO_G2_ULTRA = 18;
  CHATTER_2 = 19;
  HELTEC_V3 = 20;
  HELTEC_WSL_V3 = 21;
  BETAFPV_2400_TX = 22;
  BETAFPV_900_NANO_TX = 23;
  RPI_PICO = 24;
  HELTEC_WIRELESS_TRACKER = 25;
  HELTEC_WIRELESS_PAPER = 26;
  T_DECK = 27;
  T_WATCH_S3 = 28;
  PICOMPUTER_S3 = 29;
  HELTEC_HT62 = 30;
  EBYTE_ESP32_S3 = 31;
  ESP32_S3_PICO = 32;
  CHATTER_M = 33;
  HELTEC_WIRELESS_PAPER_V1_0 = 34;
  HELTEC_WIRELESS_TRACKER_V1_0 = 35;
  UNPHONE = 36;
  TD_LORAC = 37;
  CDEBYTE_EORA_S3 = 38;
  TWC_MESH_V4 = 39;
  NRF52840_PCA10059 = 40;
  NRF52840_PPR = 41;
  T_BEAM_SUPREME = 42;
  RAK3172 = 43;
  WIO_E5 = 44;
  RADIOMASTER_900_BANDIT = 45;
  ME25LS01_4Y10TD = 46;
  RP2040_LORA = 47;
  STATION_G1 = 48;
  RAK11310 = 49;
  SENSELORA_RP2040 = 50;
  SENSELORA_S3 = 51;
  CANARYONE = 52;
  RP2040_FEATHER_RFM95 = 53;
  M5STACK_CORE = 54;
  M5STACK_CORE2 = 55;
  M5STACK_M5STICKC = 56;
  M5STACK_M5STICKC_PLUS = 57;
  M5STACK_M5STICKC_PLUS2 = 58;
  M5STACK_M5STAMP_C3U = 59;
  M5STACK_M5STAMP_PICO = 60;
  M5STACK_ATOMS3 = 61;
  M5STACK_ATOMS3_LITE = 62;
  M5STACK_ATOMU = 63;
  M5STACK_FIRE = 64;
  M5STACK_CORE_INK = 65;
  M5STACK_PAPER = 66;
  M5STACK_TOUGH = 67;
  M5STACK_GREY = 68;
  M5STACK_TIMER_CAM = 69;
  M5STACK_M5NANO = 70;
  SEEED_WIO_WM1110 = 71;
  RADIOMASTER_900_BANDIT_NANO = 72;
  HELTEC_CAPSULE_SENSOR_V3 = 73;
  HELTEC_VISION_MASTER_T190 = 74;
  HELTEC_VISION_MASTER_E213 = 75;
  HELTEC_VISION_MASTER_E290 = 76;
  HELTEC_MESH_NODE_T114 = 77;
  SENSECAP_INDICATOR = 78;
  TRACKER_T1000_E = 79;
  RAK19007 = 80;
  RAK19001 = 81;
  RAK19003 = 82;
  RAK19007_RAK18060 = 83;
  RAK4631_RAK1901_RAK18001 = 84;
  HELTEC_HRU3601 = 85;
  RADIOMASTER_900_RANGER = 86;
  DIY_V1 = 87;
  NRF52_UNKNOWN = 88;
  PORTDUINO = 89;
  ANDROID_SIM = 90;
  NATIVE_NRF52 = 91;
  NATIVE_ESP32 = 92;
  SDCARD = 93;
  ESP32S2_LORA = 94;
  ESP32C3_LORA = 95;
  PPR = 96;
  RADIOMASTER_900_NANO = 97;
  PRIVATE_HW = 255;
}

// Node role in the mesh
enum Role {
  CLIENT = 0;
  CLIENT_MUTE = 1;
  ROUTER = 2;
  ROUTER_CLIENT = 3;
  REPEATER = 4;
  TRACKER = 5;
  SENSOR = 6;
  TAK = 7;
  CLIENT_HIDDEN = 8;
  LOST_AND_FOUND = 9;
  TAK_TRACKER = 10;
}

// Position message
message Position {
  int32 latitude_i = 1;
  int32 longitude_i = 2;
  int32 altitude = 3;
  int32 time = 4;
  int32 location_source = 5;
  int32 altitude_source = 6;
  int32 timestamp = 7;
  int32 timestamp_millis_adjust = 8;
  int32 altitude_hae = 9;
  int32 altitude_geoidal_separation = 10;
  int32 PDOP = 11;
  int32 HDOP = 12;
  int32 VDOP = 13;
  int32 gps_accuracy = 14;
  int32 ground_speed = 15;
  int32 ground_track = 16;
  int32 fix_quality = 17;
  int32 fix_type = 18;
  int32 sats_in_view = 19;
  int32 sensor_id = 20;
  int32 next_update = 21;
  int32 seq_number = 22;
  int32 precision_bits = 23;
}

// User information
message User {
  string id = 1;
  string long_name = 2;
  string short_name = 3;
  bytes macaddr = 4;
  HardwareModel hw_model = 5;
  bool is_licensed = 6;
  Role role = 7;
}

// Device metrics (telemetry)
message DeviceMetrics {
  int32 battery_level = 1;
  float voltage = 2;
  float channel_utilization = 3;
  float air_util_tx = 4;
  int32 uptime_seconds = 5;
}

// Node information
message NodeInfo {
  int32 num = 1;
  User user = 2;
  Position position = 3;
  int32 snr = 4;
  int32 last_heard = 5;
  DeviceMetrics device_metrics = 6;
  int32 channel = 7;
  bool via_mqtt = 8;
  int32 hops_away = 9;
  bool is_favorite = 10;
}

// Mesh packet
message MeshPacket {
  int32 from = 1;
  int32 to = 2;
  int32 channel = 3;
  bytes payload_variant = 4;
  int32 id = 5;
  int32 rx_time = 6;
  int32 rx_snr = 7;
  int32 hop_limit = 8;
  bool want_ack = 9;
  int32 priority = 10;
  int32 rx_rssi = 11;
  bool delayed = 12;
  bool via_mqtt = 13;
  int32 hop_start = 14;
}

// Data packet
message Data {
  PortNum portnum = 1;
  bytes payload = 2;
  bool want_response = 3;
  int32 dest = 4;
  int32 source = 5;
  int32 request_id = 6;
  int32 reply_id = 7;
  int32 emoji = 8;
}

// Request for information
message FromRadio {
  int32 id = 1;
  oneof payload_variant {
    MeshPacket packet = 2;
    NodeInfo my_info = 3;
    NodeInfo node_info = 4;
    User config_complete_id = 5;
    LogRecord log_record = 6;
    int32 config_nonce = 7;
    Heartbeat heartbeat = 8;
    bytes config = 9;
  }
}

// Commands to radio
message ToRadio {
  oneof payload_variant {
    MeshPacket packet = 1;
    bool want_config_id = 100;
    bool disconnect = 102;
    bool shutdown = 103;
    bool reboot = 104;
    bool factory_reset = 105;
    int32 nodedb_reset = 106;
    Heartbeat heartbeat = 107;
  }
}

// Log record
message LogRecord {
  string message = 1;
  int32 time = 2;
  string source = 3;
  int32 level = 4;
}

// Heartbeat
message Heartbeat {
}

// Admin message for node configuration
message AdminMessage {
  oneof payload_variant {
    bool get_owner_request = 1;
    User get_owner_response = 2;
    bool get_config_request = 3;
    bytes get_config_response = 4;
    bool get_module_config_request = 5;
    bytes get_module_config_response = 6;
    bool get_canned_message_module_messages_request = 7;
    string get_canned_message_module_messages_response = 8;
    bool get_device_metadata_request = 9;
    DeviceMetadata get_device_metadata_response = 10;
    bool get_device_connection_status_request = 11;
    DeviceConnectionStatus get_device_connection_status_response = 12;
    bool set_owner = 13;
    bool set_config = 14;
    bool set_module_config = 15;
    bool set_canned_message_module_messages = 16;
    bool set_ringtone_message = 17;
    bool remove_by_nodenum = 18;
    bool set_favorite_node = 19;
    bool remove_favorite_node = 20;
    bool set_fixed_position = 21;
    bool remove_fixed_position = 22;
    bool set_time_only = 23;
    bool begin_edit_settings = 24;
    bool commit_edit_settings = 25;
    int32 factory_reset_device = 26;
    int32 reboot_ota_seconds = 27;
    int32 exit_simulator = 28;
    int32 reboot_seconds = 29;
    int32 shutdown_seconds = 30;
    int32 get_node_remote_hardware_pins_request = 31;
    NodeRemoteHardwarePinsResponse get_node_remote_hardware_pins_response = 32;
  }
}

// Device metadata
message DeviceMetadata {
  string firmware_version = 1;
  int32 device_state_version = 2;
  bool can_shutdown = 3;
  bool has_wifi = 4;
  bool has_bluetooth = 5;
  bool has_ethernet = 6;
  Role role = 7;
  int32 position_flags = 8;
  HardwareModel hw_model = 9;
  bool has_32bit_node_id = 10;
}

// Device connection status
message DeviceConnectionStatus {
  bool wifi = 1;
  bool bluetooth = 2;
  bool ethernet = 3;
  bool serial = 4;
}

// Node remote hardware pins
message NodeRemoteHardwarePinsResponse {
  repeated NodeRemoteHardwarePin node_remote_hardware_pins = 1;
}

message NodeRemoteHardwarePin {
  int32 node_num = 1;
  NodeRemoteHardwarePinType pin = 2;
}

enum NodeRemoteHardwarePinType {
  UNKNOWN_PIN = 0;
  DIGITAL_READ = 1;
  DIGITAL_WRITE = 2;
}
`;

let root: protobuf.Root | null = null;

export class MeshtasticProtocol {
  private static instance: MeshtasticProtocol;
  private root: protobuf.Root | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): MeshtasticProtocol {
    if (!MeshtasticProtocol.instance) {
      MeshtasticProtocol.instance = new MeshtasticProtocol();
    }
    return MeshtasticProtocol.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.root = protobuf.parse(meshtasticProto).root;
      this.initialized = true;
      console.log('✅ Meshtastic protobuf initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Meshtastic protobuf:', error);
      throw error;
    }
  }

  // Create a request for node information
  public createNodeInfoRequest(requestId: number = 1): Uint8Array {
    if (!this.root) throw new Error('Protocol not initialized');

    const ToRadio = this.root.lookupType('meshtastic.ToRadio');
    const MeshPacket = this.root.lookupType('meshtastic.MeshPacket');
    const Data = this.root.lookupType('meshtastic.Data');
    const AdminMessage = this.root.lookupType('meshtastic.AdminMessage');

    // Create admin message to get owner info
    const adminMsg = AdminMessage.create({
      getOwnerRequest: true
    });

    const adminPayload = AdminMessage.encode(adminMsg).finish();

    // Create data packet
    const dataPacket = Data.create({
      portnum: 6, // ADMIN_APP
      payload: adminPayload,
      wantResponse: true,
      requestId: requestId
    });

    const dataPayload = Data.encode(dataPacket).finish();

    // Create mesh packet
    const meshPacket = MeshPacket.create({
      to: 0xFFFFFFFF, // Broadcast to get local node info
      payloadVariant: dataPayload,
      id: requestId,
      wantAck: false,
      hopLimit: 3
    });

    // Create ToRadio message
    const toRadio = ToRadio.create({
      packet: meshPacket
    });

    return ToRadio.encode(toRadio).finish();
  }

  // Create a request for node database
  public createNodeDbRequest(): Uint8Array {
    if (!this.root) throw new Error('Protocol not initialized');

    const ToRadio = this.root.lookupType('meshtastic.ToRadio');
    
    // Request configuration which includes node database
    const toRadio = ToRadio.create({
      wantConfigId: true
    });

    return ToRadio.encode(toRadio).finish();
  }

  // Parse incoming FromRadio message
  public parseFromRadio(data: Uint8Array): any {
    if (!this.root) throw new Error('Protocol not initialized');

    try {
      const FromRadio = this.root.lookupType('meshtastic.FromRadio');
      const decoded = FromRadio.decode(data);
      return FromRadio.toObject(decoded, {
        longs: String,
        enums: String,
        bytes: String
      });
    } catch (error) {
      console.error('Failed to parse FromRadio message:', error);
      return null;
    }
  }

  // Parse mesh packet
  public parseMeshPacket(data: Uint8Array): any {
    if (!this.root) throw new Error('Protocol not initialized');

    try {
      const MeshPacket = this.root.lookupType('meshtastic.MeshPacket');
      const decoded = MeshPacket.decode(data);
      return MeshPacket.toObject(decoded, {
        longs: String,
        enums: String,
        bytes: String
      });
    } catch (error) {
      console.error('Failed to parse MeshPacket:', error);
      return null;
    }
  }

  // Frame data with Meshtastic header
  public frameData(payload: Uint8Array): Uint8Array {
    const header = new Uint8Array([0x94, 0xc3]); // Official Meshtastic magic bytes
    const length = new Uint8Array(2);
    length[0] = payload.length & 0xFF;
    length[1] = (payload.length >> 8) & 0xFF;
    
    const result = new Uint8Array(header.length + length.length + payload.length);
    result.set(header, 0);
    result.set(length, header.length);
    result.set(payload, header.length + length.length);
    
    return result;
  }

  // Parse framed data from serial stream
  public parseFramedData(buffer: Uint8Array): { packets: Uint8Array[], remaining: Uint8Array } {
    const packets: Uint8Array[] = [];
    let offset = 0;

    while (offset < buffer.length - 3) {
      // Look for official Meshtastic magic bytes
      if (buffer[offset] === 0x94 && buffer[offset + 1] === 0xc3) {
        const length = buffer[offset + 2] | (buffer[offset + 3] << 8);
        
        if (offset + 4 + length <= buffer.length) {
          // Complete packet found
          const packet = buffer.slice(offset + 4, offset + 4 + length);
          packets.push(packet);
          offset += 4 + length;
        } else {
          // Incomplete packet, return remaining data
          break;
        }
      } else {
        offset++;
      }
    }

    const remaining = buffer.slice(offset);
    return { packets, remaining };
  }

  // Convert node info to standardized format
  public convertNodeInfo(nodeInfo: any): any {
    return {
      nodeInfo: {
        nodeId: nodeInfo.user?.id || 'unknown',
        longName: nodeInfo.user?.longName || 'Unknown Device',
        shortName: nodeInfo.user?.shortName || 'UNK',
        macAddress: nodeInfo.user?.macaddr ? Array.from(nodeInfo.user.macaddr as Uint8Array).map((b) => (b as number).toString(16).padStart(2, '0')).join(':') : 'Unknown',
        hwModel: nodeInfo.user?.hwModel || 'Unknown',
        hwModelSlug: nodeInfo.user?.hwModel?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown',
        firmwareVersion: nodeInfo.deviceMetadata?.firmwareVersion || 'Unknown',
        region: 'Unknown', // Not available in basic node info
        modemPreset: 'Unknown', // Not available in basic node info
        hasWifi: nodeInfo.deviceMetadata?.hasWifi || false,
        hasBluetooth: nodeInfo.deviceMetadata?.hasBluetooth || false,
        hasEthernet: nodeInfo.deviceMetadata?.hasEthernet || false,
        role: nodeInfo.user?.role || 'CLIENT',
        rebootCount: 0, // Not available in basic node info
        uptimeSeconds: nodeInfo.deviceMetrics?.uptimeSeconds || 0
      },
      deviceMetrics: {
        batteryLevel: nodeInfo.deviceMetrics?.batteryLevel || 0,
        voltage: nodeInfo.deviceMetrics?.voltage || 0,
        channelUtilization: nodeInfo.deviceMetrics?.channelUtilization || 0,
        airUtilTx: nodeInfo.deviceMetrics?.airUtilTx || 0
      },
      position: {
        latitude: nodeInfo.position?.latitudeI ? nodeInfo.position.latitudeI / 1e7 : 0,
        longitude: nodeInfo.position?.longitudeI ? nodeInfo.position.longitudeI / 1e7 : 0,
        altitude: nodeInfo.position?.altitude || 0,
        accuracy: nodeInfo.position?.gpsAccuracy || 0,
        timestamp: nodeInfo.position?.time ? new Date(nodeInfo.position.time * 1000).toISOString() : new Date().toISOString()
      },
      isRealData: true,
      note: "Data parsed from Meshtastic protobuf protocol"
    };
  }
}

export default MeshtasticProtocol;