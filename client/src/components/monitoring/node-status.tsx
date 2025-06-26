import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNodes } from "@/hooks/useNodes";
import { 
  Radio, 
  Battery, 
  Signal,
  Clock,
  MessageSquare,
  MapPin
} from "lucide-react";
import type { NodeData } from "@/types";

interface NodeStatusProps {
  nodes: NodeData[];
}

export default function NodeStatus({ nodes }: NodeStatusProps) {
  const { user } = useAuth();
  const { sendQuickMessage } = useNodes();

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const formatRSSI = (rssi?: number) => {
    if (!rssi) return 'N/A';
    return `${rssi} dBm`;
  };

  const formatBattery = (voltage?: number, level?: number) => {
    if (level !== undefined) return `${level}%`;
    if (voltage) return `${voltage.toFixed(1)}V`;
    return 'N/A';
  };

  const getBatteryColor = (level?: number, voltage?: number) => {
    if (level !== undefined) {
      if (level > 60) return 'text-secondary';
      if (level > 30) return 'text-accent';
      return 'text-error';
    }
    if (voltage !== undefined) {
      if (voltage > 3.5) return 'text-secondary';
      if (voltage > 3.2) return 'text-accent';
      return 'text-error';
    }
    return 'text-gray-400';
  };

  const getSignalColor = (rssi?: number) => {
    if (!rssi) return 'text-gray-400';
    if (rssi > -70) return 'text-secondary';
    if (rssi > -85) return 'text-accent';
    return 'text-error';
  };

  const handleSendMessage = (nodeId: string) => {
    const message = prompt(`Send message to ${nodeId}:`);
    if (message && message.trim()) {
      sendQuickMessage(nodeId, message.trim());
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Radio className="h-16 w-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Nodes Detected</h3>
        <p className="text-gray-400 text-sm">
          Check your Meshtastic connection and ensure nodes are active
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="border border-gray-600 rounded-lg p-3 bg-surface-light hover:bg-surface-light/80 transition-colors"
          >
            {/* Node Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h4 className="font-mono text-sm font-medium">{node.name}</h4>
                {node.shortName && (
                  <span className="text-xs text-gray-400">({node.shortName})</span>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  node.isOnline ? 'bg-secondary animate-pulse' : 'bg-gray-500'
                }`} />
                <span className={`text-xs ${
                  node.isOnline ? 'text-secondary' : 'text-gray-400'
                }`}>
                  {node.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Node Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center space-x-1">
                  <Signal className="h-3 w-3" />
                  <span>RSSI:</span>
                </span>
                <span className={`font-mono ${getSignalColor(node.rssi)}`}>
                  {formatRSSI(node.rssi)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center space-x-1">
                  <Battery className="h-3 w-3" />
                  <span>Battery:</span>
                </span>
                <span className={`font-mono ${getBatteryColor(node.batteryLevel, node.voltage)}`}>
                  {formatBattery(node.voltage, node.batteryLevel)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Last Seen:</span>
                </span>
                <span className="font-mono text-gray-300">
                  {formatLastSeen(node.lastSeen)}
                </span>
              </div>

              {node.latitude && node.longitude && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>GPS:</span>
                  </span>
                  <span className="font-mono text-secondary text-xs">
                    {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                  </span>
                </div>
              )}

              {node.hwModel && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Model:</span>
                  <span className="text-xs text-gray-300">{node.hwModel}</span>
                </div>
              )}
            </div>

            {/* Node Actions */}
            {user?.role !== 'watcher' && node.isOnline && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-600 text-xs"
                  onClick={() => handleSendMessage(node.nodeId)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Send Message
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
