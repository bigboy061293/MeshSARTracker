import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BridgeMonitor } from "@/components/bridge-monitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Radio, 
  Focus,
  Map,
  Bell,
  Shield,
  Save,
  RefreshCw
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    // Meshtastic Settings
    meshtasticPort: '/dev/ttyUSB0',
    meshtasticBaud: '921600',
    nodeUpdateInterval: '5',
    autoReconnect: true,
    
    // MAVLink Settings
    mavlinkConnection: 'udp:127.0.0.1:14550',
    mavlinkHeartbeat: '1',
    droneTimeout: '10',
    
    // Map Settings
    defaultMapView: 'satellite',
    mapUpdateInterval: '2',
    showTrails: true,
    autoCenter: false,
    
    // Notification Settings
    soundAlerts: true,
    desktopNotifications: true,
    emailAlerts: false,
    alertThresholds: {
      lowBattery: '20',
      weakSignal: '-90',
      nodeOffline: '300',
    },
    
    // System Settings
    dataRetention: '30',
    logLevel: 'info',
    maxConnections: '50',
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Load settings from backend
  const { data: loadedSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isAuthenticated,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      return await apiRequest('POST', '/api/settings', settingsData);
    },
    onSuccess: (response: any) => {
      const connectionResult = response?.connectionResult;
      
      if (connectionResult) {
        // Show connection-specific feedback
        if (connectionResult.success) {
          toast({
            title: "Connection Successful",
            description: connectionResult.message || "MAVLink connection established successfully",
          });
        } else {
          // Show detailed error message for connection failure
          const errorDetails = connectionResult.details;
          let description = connectionResult.message;
          
          // Add helpful suggestions based on error type
          if (description.includes('timeout')) {
            description += "\n\nSuggestions:\n• Check device is powered on and connected\n• Verify correct COM port or network address\n• Ensure MAVLink is enabled on autopilot";
          } else if (description.includes('Port access failed')) {
            description += "\n\nSuggestions:\n• Check cable connection\n• Verify correct COM port number\n• Try a different USB port";
          } else if (description.includes('Invalid connection string')) {
            description += "\n\nSuggestions:\n• Use format: COM4, /dev/ttyUSB0, or udp:127.0.0.1:14550\n• Check for typos in connection string";
          }
          
          toast({
            title: "Connection Failed",
            description: description,
            variant: "destructive",
          });
        }
      } else {
        // Standard success message for non-connection settings
        toast({
          title: "Settings Saved",
          description: "Your configuration has been saved successfully",
        });
      }
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast({
        title: "Settings Save Failed",
        description: "Failed to save settings. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  // Update local settings when loaded from backend
  useEffect(() => {
    if (loadedSettings) {
      const settingsMap: Record<string, any> = {};
      
      // Convert array of settings to object
      ['mavlink', 'meshtastic', 'map', 'notifications', 'system'].forEach(category => {
        const categorySettings = (loadedSettings as any)[category];
        if (categorySettings && Array.isArray(categorySettings)) {
          categorySettings.forEach((setting: any) => {
            settingsMap[setting.key] = setting.value;
          });
        }
      });

      // Update state with loaded settings, ensuring all values are defined
      setSettings(prev => {
        const newSettings = { ...prev };
        Object.keys(settingsMap).forEach(key => {
          if (settingsMap[key] !== undefined && settingsMap[key] !== null) {
            (newSettings as any)[key] = settingsMap[key];
          }
        });
        return newSettings;
      });
    }
  }, [loadedSettings]);

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleReset = () => {
    // Reset to default values
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults",
    });
  };

  const isAdmin = (user as any)?.role === 'admin';
  const canEditSystem = isAdmin;

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* Settings Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure system preferences and connectivity</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset} className="border-gray-600">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveSettingsMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meshtastic Configuration */}
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Radio className="h-5 w-5 text-secondary" />
              <span>Meshtastic Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="meshtastic-port">Serial Port</Label>
              <Input
                id="meshtastic-port"
                value={settings.meshtasticPort}
                onChange={(e) => setSettings(s => ({ ...s, meshtasticPort: e.target.value }))}
                className="bg-surface border-gray-600"
                disabled={!canEditSystem}
              />
            </div>
            
            <div>
              <Label htmlFor="meshtastic-baud">Baud Rate</Label>
              <Select
                value={settings.meshtasticBaud}
                onValueChange={(value) => setSettings(s => ({ ...s, meshtasticBaud: value }))}
                disabled={!canEditSystem}
              >
                <SelectTrigger className="bg-surface border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="115200">115200</SelectItem>
                  <SelectItem value="921600">921600</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="node-update">Node Update Interval (seconds)</Label>
              <Input
                id="node-update"
                type="number"
                value={settings.nodeUpdateInterval}
                onChange={(e) => setSettings(s => ({ ...s, nodeUpdateInterval: e.target.value }))}
                className="bg-surface border-gray-600"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reconnect">Auto Reconnect</Label>
              <Switch
                id="auto-reconnect"
                checked={settings.autoReconnect}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, autoReconnect: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* MAVLink Configuration */}
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Focus className="h-5 w-5 text-primary" />
              <span>MAVLink Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mavlink-connection">Connection String</Label>
              <Input
                id="mavlink-connection"
                value={settings.mavlinkConnection}
                onChange={(e) => setSettings(s => ({ ...s, mavlinkConnection: e.target.value }))}
                className="bg-surface border-gray-600"
                disabled={!canEditSystem}
                placeholder="udp:127.0.0.1:14550"
              />
              <div className="mt-2 text-sm text-gray-400">
                <p><strong>Development Bridge Mode:</strong></p>
                <p>• Run <code>node com-bridge.js</code> on your local computer</p>
                <p>• Connect to <code>udp:127.0.0.1:14550</code> to access real COM4 hardware</p>
                <p>• This bridges local serial ports to cloud development environment</p>
                <p><strong>Other Options:</strong> <code>udp:192.168.1.100:14550</code>, <code>tcp:drone.local:5760</code></p>
                <p><strong>See:</strong> DEVELOPMENT_BRIDGE_GUIDE.md for complete setup instructions</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="mavlink-heartbeat">Heartbeat Interval (seconds)</Label>
              <Input
                id="mavlink-heartbeat"
                type="number"
                value={settings.mavlinkHeartbeat}
                onChange={(e) => setSettings(s => ({ ...s, mavlinkHeartbeat: e.target.value }))}
                className="bg-surface border-gray-600"
              />
            </div>
            
            <div>
              <Label htmlFor="drone-timeout">Focus Timeout (seconds)</Label>
              <Input
                id="drone-timeout"
                type="number"
                value={settings.droneTimeout}
                onChange={(e) => setSettings(s => ({ ...s, droneTimeout: e.target.value }))}
                className="bg-surface border-gray-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bridge Monitor */}
        <BridgeMonitor />

        {/* Map Settings */}
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Map className="h-5 w-5 text-accent" />
              <span>Map Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default-map">Default Map View</Label>
              <Select
                value={settings.defaultMapView}
                onValueChange={(value) => setSettings(s => ({ ...s, defaultMapView: value }))}
              >
                <SelectTrigger className="bg-surface border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="street">Street Map</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="map-update">Update Interval (seconds)</Label>
              <Input
                id="map-update"
                type="number"
                value={settings.mapUpdateInterval}
                onChange={(e) => setSettings(s => ({ ...s, mapUpdateInterval: e.target.value }))}
                className="bg-surface border-gray-600"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-trails">Show Movement Trails</Label>
              <Switch
                id="show-trails"
                checked={settings.showTrails}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, showTrails: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-center">Auto Center on Nodes</Label>
              <Switch
                id="auto-center"
                checked={settings.autoCenter}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, autoCenter: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-accent" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-alerts">Sound Alerts</Label>
              <Switch
                id="sound-alerts"
                checked={settings.soundAlerts}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, soundAlerts: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
              <Switch
                id="desktop-notifications"
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, desktopNotifications: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email-alerts">Email Alerts</Label>
              <Switch
                id="email-alerts"
                checked={settings.emailAlerts}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, emailAlerts: checked }))}
                disabled={!isAdmin}
              />
            </div>
            
            <Separator />
            
            <div>
              <Label htmlFor="low-battery">Low Battery Threshold (%)</Label>
              <Input
                id="low-battery"
                type="number"
                value={settings.alertThresholds.lowBattery}
                onChange={(e) => setSettings(s => ({ 
                  ...s, 
                  alertThresholds: { ...s.alertThresholds, lowBattery: e.target.value }
                }))}
                className="bg-surface border-gray-600"
              />
            </div>
            
            <div>
              <Label htmlFor="weak-signal">Weak Signal Threshold (dBm)</Label>
              <Input
                id="weak-signal"
                type="number"
                value={settings.alertThresholds.weakSignal}
                onChange={(e) => setSettings(s => ({ 
                  ...s, 
                  alertThresholds: { ...s.alertThresholds, weakSignal: e.target.value }
                }))}
                className="bg-surface border-gray-600"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Settings (Admin Only) */}
      {isAdmin && (
        <Card className="bg-surface-variant border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-accent" />
              <span>System Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="data-retention">Data Retention (days)</Label>
                <Input
                  id="data-retention"
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => setSettings(s => ({ ...s, dataRetention: e.target.value }))}
                  className="bg-surface border-gray-600"
                />
              </div>
              
              <div>
                <Label htmlFor="log-level">Log Level</Label>
                <Select
                  value={settings.logLevel}
                  onValueChange={(value) => setSettings(s => ({ ...s, logLevel: value }))}
                >
                  <SelectTrigger className="bg-surface border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="max-connections">Max WebSocket Connections</Label>
                <Input
                  id="max-connections"
                  type="number"
                  value={settings.maxConnections}
                  onChange={(e) => setSettings(s => ({ ...s, maxConnections: e.target.value }))}
                  className="bg-surface border-gray-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
