import { useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useDrone } from "@/hooks/useDrone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Square, 
  Home, 
  Pause,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Target,
  Camera,
  Video,
  Image,
  AlertTriangle
} from "lucide-react";
import type { DroneData } from "@/types";

interface DroneControlPanelProps {
  drone: DroneData;
  readOnly?: boolean;
}

export default function DroneControlPanel({ drone, readOnly = false }: DroneControlPanelProps) {
  const { user } = useAuth();
  const { 
    armDrone, 
    disarmDrone, 
    takeoff, 
    land, 
    returnToLaunch, 
    setFlightMode,
    sendQuickCommand 
  } = useDrone();
  const { toast } = useToast();
  
  const [selectedAltitude, setSelectedAltitude] = useState("10");
  const [selectedCommand, setSelectedCommand] = useState("");
  const [gotoCoords, setGotoCoords] = useState({ lat: "", lon: "", alt: "50" });

  const isDisabled = readOnly || user?.role === 'watcher';

  const handleQuickCommand = (command: string, params?: any) => {
    if (isDisabled) {
      toast({
        title: "Action Restricted",
        description: "You don't have permission to control drones",
        variant: "destructive",
      });
      return;
    }

    switch (command) {
      case 'arm':
        armDrone(drone.id);
        break;
      case 'disarm':
        disarmDrone(drone.id);
        break;
      case 'takeoff':
        takeoff(drone.id, parseInt(selectedAltitude) || 10);
        break;
      case 'land':
        land(drone.id);
        break;
      case 'rtl':
        returnToLaunch(drone.id);
        break;
      case 'goto':
        if (gotoCoords.lat && gotoCoords.lon) {
          sendQuickCommand(drone.id, 'goto', {
            lat: parseFloat(gotoCoords.lat),
            lon: parseFloat(gotoCoords.lon),
            alt: parseFloat(gotoCoords.alt) || 50
          });
        }
        break;
      default:
        if (selectedCommand) {
          sendQuickCommand(drone.id, selectedCommand, params);
          setSelectedCommand("");
        }
    }
  };

  const handleEmergencyLand = () => {
    if (isDisabled) return;
    
    if (confirm("Emergency land will immediately force the drone to land. Are you sure?")) {
      sendQuickCommand(drone.id, 'land');
      toast({
        title: "Emergency Land Activated",
        description: "Drone is performing emergency landing",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Controls */}
      <Card className="bg-error/10 border-error/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-error" />
              <span className="font-semibold text-error">Emergency Controls</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmergencyLand}
              disabled={isDisabled || !drone.isConnected}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Emergency Land
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Flight Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Flight Controls</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={drone.armed ? "destructive" : "default"}
              className={drone.armed ? "" : "bg-secondary hover:bg-secondary/90"}
              onClick={() => handleQuickCommand(drone.armed ? 'disarm' : 'arm')}
              disabled={isDisabled || !drone.isConnected}
            >
              {drone.armed ? (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Disarm
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Arm
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="border-gray-600"
              onClick={() => handleQuickCommand('rtl')}
              disabled={isDisabled || !drone.isConnected || !drone.armed}
            >
              <Home className="h-4 w-4 mr-1" />
              RTL
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="takeoff-alt" className="text-sm">Takeoff Altitude (m)</Label>
              <Input
                id="takeoff-alt"
                type="number"
                value={selectedAltitude}
                onChange={(e) => setSelectedAltitude(e.target.value)}
                className="w-20 h-8 bg-surface border-gray-600 text-xs"
                disabled={isDisabled}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => handleQuickCommand('takeoff')}
                disabled={isDisabled || !drone.isConnected || !drone.armed}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Takeoff
              </Button>
              
              <Button
                variant="outline"
                className="border-gray-600"
                onClick={() => handleQuickCommand('land')}
                disabled={isDisabled || !drone.isConnected}
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                Land
              </Button>
            </div>
          </div>

          {/* Flight Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Flight Mode</Label>
            <Select
              value={drone.flightMode || ""}
              onValueChange={(mode) => setFlightMode(drone.id, mode)}
              disabled={isDisabled || !drone.isConnected}
            >
              <SelectTrigger className="bg-surface border-gray-600">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STABILIZE">Stabilize</SelectItem>
                <SelectItem value="ALT_HOLD">Altitude Hold</SelectItem>
                <SelectItem value="LOITER">Loiter</SelectItem>
                <SelectItem value="AUTO">Auto Mission</SelectItem>
                <SelectItem value="GUIDED">Guided</SelectItem>
                <SelectItem value="CIRCLE">Circle</SelectItem>
                <SelectItem value="POSHOLD">Position Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mission Commands */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Mission Commands</h3>
          
          <div className="space-y-2">
            <Label className="text-sm">Quick Commands</Label>
            <Select
              value={selectedCommand}
              onValueChange={setSelectedCommand}
              disabled={isDisabled || !drone.isConnected}
            >
              <SelectTrigger className="bg-surface border-gray-600">
                <SelectValue placeholder="Select command..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="search_pattern">Search Pattern Alpha</SelectItem>
                <SelectItem value="deploy_node">Deploy Node Package</SelectItem>
                <SelectItem value="thermal_scan">Thermal Scan Area</SelectItem>
                <SelectItem value="orbit">Orbit Point</SelectItem>
                <SelectItem value="survey">Survey Mission</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              className="w-full border-gray-600"
              onClick={() => handleQuickCommand('execute')}
              disabled={isDisabled || !selectedCommand || !drone.isConnected}
            >
              <Target className="h-4 w-4 mr-1" />
              Execute Command
            </Button>
          </div>

          {/* Goto Controls */}
          <div className="space-y-2">
            <Label className="text-sm">Go To Location</Label>
            <div className="grid grid-cols-2 gap-1">
              <Input
                placeholder="Latitude"
                value={gotoCoords.lat}
                onChange={(e) => setGotoCoords(prev => ({ ...prev, lat: e.target.value }))}
                className="bg-surface border-gray-600 text-xs"
                disabled={isDisabled}
              />
              <Input
                placeholder="Longitude"
                value={gotoCoords.lon}
                onChange={(e) => setGotoCoords(prev => ({ ...prev, lon: e.target.value }))}
                className="bg-surface border-gray-600 text-xs"
                disabled={isDisabled}
              />
            </div>
            <div className="flex space-x-1">
              <Input
                placeholder="Alt (m)"
                value={gotoCoords.alt}
                onChange={(e) => setGotoCoords(prev => ({ ...prev, alt: e.target.value }))}
                className="w-20 bg-surface border-gray-600 text-xs"
                disabled={isDisabled}
              />
              <Button
                variant="outline"
                className="flex-1 border-gray-600"
                onClick={() => handleQuickCommand('goto')}
                disabled={isDisabled || !gotoCoords.lat || !gotoCoords.lon || !drone.isConnected}
              >
                <Target className="h-4 w-4 mr-1" />
                Go To
              </Button>
            </div>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Camera & Sensors</h3>
          
          {/* Camera Feed Placeholder */}
          <div className="relative bg-surface-light rounded border border-gray-600 aspect-video">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Camera Feed</p>
                <p className="text-xs text-gray-500">No signal</p>
              </div>
            </div>
            
            {/* Camera Status Overlays */}
            <div className="absolute top-2 left-2 bg-surface-variant/90 px-2 py-1 rounded text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>No Feed</span>
              </div>
            </div>
            
            <div className="absolute bottom-2 right-2 bg-surface-variant/90 px-2 py-1 rounded text-xs font-mono">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          {/* Camera Controls */}
          <div className="grid grid-cols-3 gap-1">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-xs"
              disabled={isDisabled || !drone.isConnected}
            >
              <Camera className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-xs"
              disabled={isDisabled || !drone.isConnected}
            >
              <Video className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-xs"
              disabled={isDisabled || !drone.isConnected}
            >
              <Image className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-xs"
              disabled={isDisabled || !drone.isConnected}
            >
              Thermal View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-xs"
              disabled={isDisabled || !drone.isConnected}
            >
              Visible Light
            </Button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {isDisabled && (
        <Card className="bg-accent/10 border-accent/30">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 text-accent text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {readOnly 
                  ? "Read-only mode: All controls are disabled"
                  : "Insufficient permissions: Contact administrator for drone control access"
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
