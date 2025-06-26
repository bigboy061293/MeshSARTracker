import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { NodeData, WebSocketMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

export function useNodes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lastMessage, sendMessage } = useWebSocket();
  const [realtimeNodes, setRealtimeNodes] = useState<NodeData[]>([]);

  const { data: nodes = [], isLoading, error } = useQuery<NodeData[]>({
    queryKey: ['/api/nodes'],
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
        description: "Failed to fetch nodes",
        variant: "destructive",
      });
    },
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'nodes':
          setRealtimeNodes(lastMessage.data);
          break;
        case 'nodePositionUpdate':
          setRealtimeNodes(prev => prev.map(node => 
            node.nodeId === lastMessage.data.nodeId 
              ? { ...node, ...lastMessage.data.position }
              : node
          ));
          break;
        case 'nodeTelemetryUpdate':
          setRealtimeNodes(prev => prev.map(node => 
            node.nodeId === lastMessage.data.nodeId 
              ? { ...node, ...lastMessage.data.telemetry }
              : node
          ));
          break;
      }
    }
  }, [lastMessage]);

  const sendNodeMessage = useMutation({
    mutationFn: async ({ toNodeId, content }: { toNodeId: string; content: string }) => {
      const response = await apiRequest('POST', '/api/messages', {
        toNodeId,
        content,
        messageType: 'text',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const sendQuickMessage = (toNodeId: string, content: string) => {
    if (sendMessage({ type: 'sendMessage', toNodeId, content })) {
      return true;
    } else {
      // Fallback to HTTP API
      sendNodeMessage.mutate({ toNodeId, content });
      return false;
    }
  };

  // Merge static data with real-time updates
  const mergedNodes = realtimeNodes.length > 0 ? realtimeNodes : nodes;

  const getOnlineNodes = () => mergedNodes.filter(node => node.isOnline);
  const getOfflineNodes = () => mergedNodes.filter(node => !node.isOnline);
  const getNodeById = (nodeId: string) => mergedNodes.find(node => node.nodeId === nodeId);
  const getNodesWithGPS = () => mergedNodes.filter(node => node.latitude && node.longitude);

  return {
    nodes: mergedNodes,
    isLoading,
    error,
    sendQuickMessage,
    sendNodeMessage,
    getOnlineNodes,
    getOfflineNodes,
    getNodeById,
    getNodesWithGPS,
  };
}
