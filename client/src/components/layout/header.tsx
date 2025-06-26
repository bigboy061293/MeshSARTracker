import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Shield, Signal, Users, LogOut } from "lucide-react";
import type { SystemStatus } from "@/types";

export default function Header() {
  const { user } = useAuth();
  const { data: status } = useQuery<SystemStatus>({
    queryKey: ['/api/status'],
    refetchInterval: 5000, // Update every 5 seconds
  });

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
      case 'watcher': return <Signal className="h-3 w-3" />;
      default: return null;
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last = lastName?.[0]?.toUpperCase() || '';
    return first + last || 'U';
  };

  return (
    <header className="bg-surface-variant border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">MeshTac</h1>
          </div>
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            SAR Command Center
          </Badge>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* System Status */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                status?.meshtasticConnected ? 'bg-secondary animate-pulse' : 'bg-error'
              }`} />
              <span className="text-gray-300">
                Network: {status?.meshtasticConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Signal className="h-4 w-4 text-secondary" />
              <span className="text-gray-300">
                {status?.activeNodes || 0} Nodes
              </span>
            </div>
          </div>
          
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl} alt="User avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-medium">
                    {user?.firstName || user?.lastName 
                      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                      : user?.email || 'User'
                    }
                  </div>
                  <div className="flex items-center space-x-1">
                    {getRoleIcon(user?.role)}
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getRoleBadgeColor(user?.role)}`}
                    >
                      {user?.role?.toUpperCase() || 'USER'}
                    </Badge>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>
                <div className="flex flex-col space-y-1">
                  <div className="text-sm font-medium">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => window.location.href = '/api/logout'}
                className="text-red-400 focus:text-red-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
