import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Route, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Edit,
  Trash2,
  Map,
  Clock
} from "lucide-react";
import type { MissionData, DroneData } from "@/types";

export default function MissionPlanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionData | null>(null);

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
        description: "Watchers have read-only access to mission planning",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const { data: missions = [], isLoading: missionsLoading } = useQuery<MissionData[]>({
    queryKey: ['/api/missions'],
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
    },
  });

  const { data: drones = [] } = useQuery<DroneData[]>({
    queryKey: ['/api/drones'],
  });

  const createMission = useMutation({
    mutationFn: async (missionData: any) => {
      const response = await apiRequest('POST', '/api/missions', missionData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mission Created",
        description: "Mission plan has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
      setIsCreateDialogOpen(false);
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
        description: "Failed to create mission",
        variant: "destructive",
      });
    },
  });

  const updateMissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/missions/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/missions'] });
    },
  });

  if (isLoading || missionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading missions...</p>
        </div>
      </div>
    );
  }

  const handleCreateMission = (formData: FormData) => {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const droneId = formData.get('droneId') as string;

    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Mission name is required",
        variant: "destructive",
      });
      return;
    }

    createMission.mutate({
      name: name.trim(),
      description: description.trim(),
      droneId: droneId ? parseInt(droneId) : null,
      status: 'planned',
      waypoints: [],
      parameters: {},
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-secondary text-secondary-foreground';
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'aborted': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'completed': return <Square className="h-3 w-3" />;
      case 'aborted': return <Pause className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* Mission Planning Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mission Planning</h1>
          <p className="text-gray-400">Create and manage drone missions</p>
        </div>
        
        {user?.role !== 'watcher' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Mission
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface-variant border-gray-700">
              <DialogHeader>
                <DialogTitle>Create New Mission</DialogTitle>
              </DialogHeader>
              <form action={handleCreateMission} className="space-y-4">
                <div>
                  <Label htmlFor="name">Mission Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter mission name"
                    className="bg-surface border-gray-600"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Mission description and objectives"
                    className="bg-surface border-gray-600"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="droneId">Assigned Drone</Label>
                  <Select name="droneId">
                    <SelectTrigger className="bg-surface border-gray-600">
                      <SelectValue placeholder="Select a drone" />
                    </SelectTrigger>
                    <SelectContent>
                      {drones.map((drone) => (
                        <SelectItem key={drone.id} value={drone.id.toString()}>
                          {drone.name} - {drone.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMission.isPending}
                  >
                    Create Mission
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Mission Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Missions</p>
                <p className="text-3xl font-bold">{missions.length}</p>
              </div>
              <Route className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-3xl font-bold text-secondary">
                  {missions.filter(m => m.status === 'active').length}
                </p>
              </div>
              <Play className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-primary">
                  {missions.filter(m => m.status === 'completed').length}
                </p>
              </div>
              <Square className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Planned</p>
                <p className="text-3xl font-bold text-accent">
                  {missions.filter(m => m.status === 'planned').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mission List */}
      <Card className="bg-surface-variant border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Mission Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <div className="text-center py-8">
              <Route className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Missions Created</h3>
              <p className="text-gray-400 mb-4">
                Create your first mission to start planning drone operations
              </p>
              {user?.role !== 'watcher' && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  variant="outline" 
                  className="border-gray-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Mission
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 bg-surface-light rounded-lg border border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{mission.name}</h3>
                        <Badge className={getStatusColor(mission.status)}>
                          {getStatusIcon(mission.status)}
                          <span className="ml-1 capitalize">{mission.status}</span>
                        </Badge>
                      </div>
                      
                      {mission.description && (
                        <p className="text-sm text-gray-400 mb-2">{mission.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {new Date(mission.createdAt).toLocaleDateString()}</span>
                        {mission.droneId && (
                          <span>Drone: {drones.find(d => d.id === mission.droneId)?.name || 'Unknown'}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="border-gray-600">
                        <Map className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {user?.role !== 'watcher' && (
                        <>
                          <Button variant="outline" size="sm" className="border-gray-600">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          
                          {mission.status === 'planned' && (
                            <Button
                              size="sm"
                              className="bg-secondary hover:bg-secondary/90"
                              onClick={() => updateMissionStatus.mutate({ id: mission.id, status: 'active' })}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          
                          {mission.status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateMissionStatus.mutate({ id: mission.id, status: 'aborted' })}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              Stop
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
