import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessagePanel from "@/components/communications/message-panel";
import { Phone, PhoneCall, Users, Mic } from "lucide-react";

export default function Communications() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Check role permissions
  useEffect(() => {
    if (user && user.role === 'watcher') {
      toast({
        title: "Access Restricted",
        description: "Watchers have read-only access to communications",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading communications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* Communications Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Communications</h1>
          <p className="text-gray-400">Mesh network messaging and voice calls</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
            <span className="text-dark-secondary">Network Online</span>
          </div>
        </div>
      </div>

      {/* Communications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Message Panel */}
        <div className="lg:col-span-2">
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Mesh Network Messages</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-sm text-secondary">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span>Connected</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[calc(100vh-250px)]">
                <MessagePanel />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communication Controls */}
        <div className="space-y-6">
          {/* Voice Controls */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Voice Communications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <button 
                  className="w-full px-4 py-3 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors flex items-center justify-center space-x-2"
                  disabled={user?.role === 'watcher'}
                >
                  <Mic className="h-4 w-4" />
                  <span>Push to Talk</span>
                </button>
                
                <button 
                  className="w-full px-4 py-2 bg-secondary/20 text-secondary rounded-lg hover:bg-secondary/30 transition-colors flex items-center justify-center space-x-2"
                  disabled={user?.role === 'watcher'}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Voice Call</span>
                </button>

                <button 
                  className="w-full px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors flex items-center justify-center space-x-2"
                  disabled={user?.role === 'watcher'}
                >
                  <Users className="h-4 w-4" />
                  <span>Conference Call</span>
                </button>
              </div>

              {user?.role === 'watcher' && (
                <div className="text-xs text-gray-400 text-center">
                  Voice features are read-only for watchers
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Messages */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Status Report",
                "Need Assistance",
                "All Clear",
                "En Route",
                "Objective Complete",
                "Emergency"
              ].map((message, index) => (
                <button
                  key={index}
                  className="w-full px-3 py-2 text-left bg-surface-light text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
                  disabled={user?.role === 'watcher'}
                >
                  {message}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Network Status */}
          <Card className="bg-surface-variant border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Network Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Mesh Network:</span>
                <span className="text-sm text-secondary">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Connected Nodes:</span>
                <span className="text-sm">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Signal Quality:</span>
                <span className="text-sm text-secondary">Good</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Voice Channel:</span>
                <span className="text-sm">Channel 1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Encryption:</span>
                <span className="text-sm text-secondary">Enabled</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
