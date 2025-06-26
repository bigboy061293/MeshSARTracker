import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Shield, 
  UserPlus, 
  Settings,
  Search,
  MoreHorizontal,
  Eye,
  Edit
} from "lucide-react";
import type { User } from "@shared/schema";

export default function TeamManagement() {
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

  // Check admin permissions
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can access team management",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
      return;
    }
  }, [user, toast]);

  // Note: In a real implementation, this would fetch all users from an admin endpoint
  // For now, we'll show a placeholder since we only have the current user
  const mockTeamMembers: User[] = [
    {
      id: "1",
      email: "admin@example.com",
      firstName: "John",
      lastName: "Administrator",
      role: "admin",
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      email: "operator@example.com",
      firstName: "Sarah",
      lastName: "Operator",
      role: "user",
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "3",
      email: "monitor@example.com",
      firstName: "Mike",
      lastName: "Monitor",
      role: "watcher",
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading team management...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 space-y-6 bg-surface min-h-screen">
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-gray-400">
              Only administrators can access team management features
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-accent text-accent-foreground';
      case 'user': return 'bg-primary text-primary-foreground';
      case 'watcher': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'user': return <Users className="h-3 w-3" />;
      case 'watcher': return <Eye className="h-3 w-3" />;
      default: return null;
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last = lastName?.[0]?.toUpperCase() || '';
    return first + last || 'U';
  };

  const roleStats = {
    admin: mockTeamMembers.filter(m => m.role === 'admin').length,
    user: mockTeamMembers.filter(m => m.role === 'user').length,
    watcher: mockTeamMembers.filter(m => m.role === 'watcher').length,
  };

  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      {/* Team Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Management</h1>
          <p className="text-gray-400">Manage users and permissions</p>
        </div>
        
        <Button className="bg-primary hover:bg-primary/90">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Members</p>
                <p className="text-3xl font-bold">{mockTeamMembers.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Administrators</p>
                <p className="text-3xl font-bold text-accent">{roleStats.admin}</p>
              </div>
              <Shield className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Operators</p>
                <p className="text-3xl font-bold text-primary">{roleStats.user}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface-variant border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Watchers</p>
                <p className="text-3xl font-bold text-secondary">{roleStats.watcher}</p>
              </div>
              <Eye className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card className="bg-surface-variant border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  className="pl-10 bg-surface border-gray-600 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {mockTeamMembers.map((member, index) => (
              <div
                key={member.id}
                className={`p-6 flex items-center justify-between hover:bg-surface-light transition-colors ${
                  index !== mockTeamMembers.length - 1 ? 'border-b border-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email
                        }
                      </h3>
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {getRoleIcon(member.role)}
                        <span className="ml-1 capitalize">{member.role}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">{member.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined {member.createdAt?.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="border-gray-600">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="border-gray-600">
                    <Settings className="h-4 w-4 mr-1" />
                    Permissions
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card className="bg-surface-variant border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-surface-light rounded-lg border border-accent/30">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="h-5 w-5 text-accent" />
                  <h4 className="font-semibold text-accent">Administrator</h4>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Full system access</li>
                  <li>• User management</li>
                  <li>• Drone control</li>
                  <li>• Mission planning</li>
                  <li>• System configuration</li>
                </ul>
              </div>
              
              <div className="p-4 bg-surface-light rounded-lg border border-primary/30">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-primary">Operator</h4>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Communications</li>
                  <li>• Drone control</li>
                  <li>• Mission planning</li>
                  <li>• Map viewing</li>
                  <li>• Node monitoring</li>
                </ul>
              </div>
              
              <div className="p-4 bg-surface-light rounded-lg border border-secondary/30">
                <div className="flex items-center space-x-2 mb-3">
                  <Eye className="h-5 w-5 text-secondary" />
                  <h4 className="font-semibold text-secondary">Watcher</h4>
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Read-only access</li>
                  <li>• Map viewing</li>
                  <li>• Status monitoring</li>
                  <li>• Message viewing</li>
                  <li>• No control functions</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
