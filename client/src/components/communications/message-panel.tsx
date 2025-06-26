import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useNodes } from "@/hooks/useNodes";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  MessageSquare, 
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import type { MessageData } from "@/types";

export default function MessagePanel() {
  const { user } = useAuth();
  const { nodes, getNodeById } = useNodes();
  const { lastMessage, sendMessage } = useWebSocket();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedNode, setSelectedNode] = useState<string>('BROADCAST');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  const { data: initialMessages = [] } = useQuery<MessageData[]>({
    queryKey: ['/api/messages'],
  });

  // Update messages when initial data loads
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages.reverse()); // Reverse to show newest at bottom
    }
  }, [initialMessages]);

  // Handle real-time message updates
  useEffect(() => {
    if (lastMessage?.type === 'newMessage') {
      setMessages(prev => [...prev, lastMessage.data]);
    } else if (lastMessage?.type === 'messages') {
      setMessages(lastMessage.data.reverse());
    }
  }, [lastMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || user?.role === 'watcher') return;

    const messageData = {
      content: newMessage.trim(),
      toNodeId: selectedNode === 'BROADCAST' ? undefined : selectedNode,
      messageType: 'text' as const,
    };

    // Try WebSocket first, fallback to HTTP
    const sent = sendMessage({
      type: 'sendMessage',
      ...messageData,
    });

    if (!sent) {
      // Fallback to HTTP API would go here
      console.log('WebSocket not available, would use HTTP API');
    }

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageSender = (message: MessageData) => {
    if (message.fromNodeId) {
      const node = getNodeById(message.fromNodeId);
      return node?.name || message.fromNodeId.slice(-4);
    }
    return 'System';
  };

  const getAvatarColor = (senderId: string) => {
    const colors = [
      'bg-primary', 'bg-secondary', 'bg-accent', 
      'bg-purple-500', 'bg-green-500', 'bg-blue-500'
    ];
    const hash = senderId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const onlineNodes = nodes.filter(node => node.isOnline);

  return (
    <div className="flex flex-col h-full">
      {/* Message Header */}
      <div className="p-4 border-b border-gray-700 bg-surface-variant">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Mesh Communications</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            <span>{onlineNodes.length} Online</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Messages</h3>
              <p className="text-gray-400 text-sm">
                Start a conversation with your mesh network
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={getAvatarColor(message.fromNodeId || 'system')}>
                    {getInitials(getMessageSender(message))}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium">
                      {getMessageSender(message)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(message.timestamp)}</span>
                    </span>
                    {message.messageType !== 'text' && (
                      <Badge variant="outline" className="text-xs">
                        {message.messageType}
                      </Badge>
                    )}
                    {message.acknowledged ? (
                      <CheckCircle className="h-3 w-3 text-secondary" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-200 break-words">
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-surface-variant">
        <div className="space-y-3">
          {/* Target Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 min-w-0">To:</span>
            <Select value={selectedNode} onValueChange={setSelectedNode}>
              <SelectTrigger className="bg-surface border-gray-600 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BROADCAST">All Nodes (Broadcast)</SelectItem>
                {onlineNodes.map((node) => (
                  <SelectItem key={node.nodeId} value={node.nodeId}>
                    {node.name} ({node.rssi ? `${node.rssi}dBm` : 'N/A'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                user?.role === 'watcher' 
                  ? "Read-only mode" 
                  : "Type your message..."
              }
              className="flex-1 bg-surface border-gray-600 text-white placeholder-gray-400"
              disabled={user?.role === 'watcher'}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || user?.role === 'watcher'}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {user?.role === 'watcher' && (
            <div className="text-xs text-gray-400 text-center">
              You are in watcher mode. Message sending is disabled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
