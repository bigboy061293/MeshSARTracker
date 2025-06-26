import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Radio, 
  Map, 
  MessageSquare, 
  Focus, 
  Users, 
  Shield, 
  Zap,
  Globe
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: <Radio className="h-8 w-8 text-primary" />,
      title: "Meshtastic Integration",
      description: "Real-time communication with all Meshtastic nodes in your network. Monitor RSSI, battery levels, and GPS coordinates."
    },
    {
      icon: <Map className="h-8 w-8 text-secondary" />,
      title: "Tactical Mapping",
      description: "Interactive maps with real-time node locations, shareable views, and collaborative planning tools."
    },
    {
      icon: <Focus className="h-8 w-8 text-accent" />,
      title: "Focus Control",
      description: "MAVLink integration for complete drone control, mission planning, and real-time telemetry monitoring."
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Team Communications",
      description: "Text messaging and voice calls across your mesh network with message history and acknowledgments."
    },
    {
      icon: <Users className="h-8 w-8 text-secondary" />,
      title: "Role-Based Access",
      description: "Admin, User, and Watcher roles with appropriate permissions for secure operations."
    },
    {
      icon: <Globe className="h-8 w-8 text-accent" />,
      title: "Cross-Platform",
      description: "Works seamlessly on Windows, Mac, Android, and iOS through your web browser."
    }
  ];

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Header */}
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">MeshTac</h1>
            </div>
            <Badge variant="outline" className="text-accent border-accent">
              SAR Command Center
            </Badge>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-primary/90"
          >
            <Zap className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Advanced Meshtastic
            <span className="text-primary block">SAR Operations Platform</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Comprehensive command and control platform for Search and Rescue operations, 
            featuring real-time Meshtastic communication, drone control, and collaborative mapping.
          </p>
          
          <div className="flex justify-center space-x-4 mb-12">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90"
            >
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-surface-light">
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-surface-variant border-gray-700">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-secondary mb-2">12+</div>
                <div className="text-sm text-gray-400">Active Nodes</div>
              </CardContent>
            </Card>
            <Card className="bg-surface-variant border-gray-700">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-sm text-gray-400">Monitoring</div>
              </CardContent>
            </Card>
            <Card className="bg-surface-variant border-gray-700">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-2">Real-time</div>
                <div className="text-sm text-gray-400">Updates</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-surface-variant">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Powerful Features</h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Everything you need for professional SAR operations in one integrated platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-surface border-gray-700 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Deploy?</h3>
          <p className="text-gray-300 mb-8 text-lg">
            Join SAR teams worldwide using MeshTac for critical operations. 
            Secure, reliable, and built for the field.
          </p>
          
          <div className="space-y-4">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
            >
              <Shield className="h-4 w-4 mr-2" />
              Access Command Center
            </Button>
            <p className="text-sm text-gray-400">
              Secure authentication required • Role-based access control
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 px-6 py-8">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>&copy; 2024 MeshTac SAR Command Center. Built for emergency response professionals.</p>
        </div>
      </footer>
    </div>
  );
}
