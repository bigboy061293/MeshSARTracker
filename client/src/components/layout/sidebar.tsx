import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Map, 
  MessageSquare, 
  Plane,
  Radio,
  Usb,
  Route,
  Users,
  Settings,
  Shield
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'user', 'watcher'] },
  { name: 'Tactical Map', href: '/map', icon: Map, roles: ['admin', 'user', 'watcher'] },
  { name: 'Communications', href: '/communications', icon: MessageSquare, roles: ['admin', 'user'] },
  { name: 'UAS Control Mode', href: '/drone-control', icon: Plane, roles: ['admin', 'user'] },
  { name: 'Web Serial UAS', href: '/web-serial-uas', icon: Usb, roles: ['admin', 'user'] },
  { name: 'Nodes Control Mode', href: '/nodes-control', icon: Radio, roles: ['admin', 'user'] },
  { name: 'Mission Planning', href: '/mission-planning', icon: Route, roles: ['admin', 'user'] },
  { name: 'Team Management', href: '/team-management', icon: Users, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'user', 'watcher'] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role || 'watcher';

  // Filter navigation based on user role
  const allowedNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 bg-surface-variant border-r border-gray-700 flex flex-col">
      <nav className="flex-1 px-4 py-6 space-y-2">
        {allowedNavigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start space-x-3 px-3 py-2 h-auto",
                  isActive 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "text-gray-300 hover:bg-surface-light hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Button>
            </Link>
          );
        })}
        
        {/* Admin-only indicator */}
        {userRole === 'admin' && (
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2 px-3 py-2 text-xs text-gray-400">
              <Shield className="h-3 w-3" />
              <span>Admin Access</span>
            </div>
          </div>
        )}
      </nav>
      
      {/* Role indicator at bottom */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 text-center">
          Role: <span className="capitalize font-medium text-gray-300">{userRole}</span>
        </div>
      </div>
    </aside>
  );
}
