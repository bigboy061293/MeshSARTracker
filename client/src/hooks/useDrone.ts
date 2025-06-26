import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { DroneData, WebSocketMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

export function useDrone() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lastMessage, sendMessage } = useWebSocket();
  const [realtimeDrones, setRealtimeDrones] = useState<DroneData[]>([]);

  const { data: drones = [], isLoading, error } = useQuery<DroneData[]>({
    queryKey: ['/api/drones'],
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to fetch drones",
        variant: "destructive",
      });
    },
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'drones':
          setRealtimeDrones(lastMessage.data);
          break;
        case 'dronePositionUpdate':
          setRealtimeDrones(prev => prev.map(drone => 
            drone.id === lastMessage.data.systemId 
              ? { ...drone, ...mapMavlinkPosition(lastMessage.data.position) }
              : drone
          ));
          break;
        case 'droneBatteryUpdate':
          setRealtimeDrones(prev => prev.map(drone => 
            drone.id === lastMessage.data.systemId 
              ? { ...drone, batteryLevel: lastMessage.data.battery.battery_remaining, voltage: lastMessage.data.battery.voltages[0] / 1000 }
              : drone
          ));
          break;
        case 'droneHeartbeat':
          setRealtimeDrones(prev => prev.map(drone => 
            drone.id === lastMessage.data.systemId 
              ? { ...drone, isConnected: true, lastTelemetry: new Date() }
              : drone
          ));
          break;
      }
    }
  }, [lastMessage]);

  const sendDroneCommand = useMutation({
    mutationFn: async ({ droneId, command, parameters }: { droneId: number; command: string; parameters?: any }) => {
      const response = await apiRequest('POST', `/api/drones/${droneId}/command`, {
        command,
        parameters,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Command Sent",
        description: `${variables.command} command sent successfully`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send drone command",
        variant: "destructive",
      });
    },
  });

  const sendQuickCommand = (droneId: number, command: string, parameters?: any) => {
    if (sendMessage({ type: 'droneCommand', droneId, command, parameters })) {
      return true;
    } else {
      // Fallback to HTTP API
      sendDroneCommand.mutate({ droneId, command, parameters });
      return false;
    }
  };

  // Helper function to map MAVLink position data
  const mapMavlinkPosition = (mavlinkPos: any) => ({
    latitude: mavlinkPos.lat / 1e7,
    longitude: mavlinkPos.lon / 1e7,
    altitude: mavlinkPos.alt / 1000,
    altitudeRelative: mavlinkPos.relative_alt / 1000,
    groundSpeed: Math.sqrt(mavlinkPos.vx * mavlinkPos.vx + mavlinkPos.vy * mavlinkPos.vy) / 100,
    heading: mavlinkPos.hdg / 100,
  });

  // Merge static data with real-time updates
  const mergedDrones = realtimeDrones.length > 0 ? realtimeDrones : drones;

  const getConnectedDrones = () => mergedDrones.filter(drone => drone.isConnected);
  const getArmedDrones = () => mergedDrones.filter(drone => drone.armed);
  const getDroneById = (droneId: number) => mergedDrones.find(drone => drone.id === droneId);
  const getDronesWithGPS = () => mergedDrones.filter(drone => drone.latitude && drone.longitude);

  // Quick command helpers
  const armDrone = (droneId: number) => sendQuickCommand(droneId, 'arm');
  const disarmDrone = (droneId: number) => sendQuickCommand(droneId, 'disarm');
  const takeoff = (droneId: number, altitude = 10) => sendQuickCommand(droneId, 'takeoff', { altitude });
  const land = (droneId: number) => sendQuickCommand(droneId, 'land');
  const returnToLaunch = (droneId: number) => sendQuickCommand(droneId, 'rtl');
  const setFlightMode = (droneId: number, mode: string) => sendQuickCommand(droneId, 'set_mode', { mode });

  return {
    drones: mergedDrones,
    isLoading,
    error,
    sendDroneCommand,
    sendQuickCommand,
    getConnectedDrones,
    getArmedDrones,
    getDroneById,
    getDronesWithGPS,
    armDrone,
    disarmDrone,
    takeoff,
    land,
    returnToLaunch,
    setFlightMode,
  };
}
