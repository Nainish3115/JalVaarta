import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Waves, 
  AlertTriangle, 
  MapPin, 
  TrendingUp, 
  Shield, 
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  verifiedReports: number;
  myReports: number;
  recentActivity: any[];
}

const Index = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    verifiedReports: 0,
    myReports: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      // Fetch reports statistics
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*');

      if (reportsError) throw reportsError;

      const totalReports = reports?.length || 0;
      const pendingReports = reports?.filter(r => r.status === 'pending').length || 0;
      const verifiedReports = reports?.filter(r => r.status === 'verified').length || 0;
      const myReports = reports?.filter(r => r.user_id === profile?.user_id).length || 0;

      // Fetch recent activity
      const { data: recentActivity, error: activityError } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (name, role)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activityError) throw activityError;

      setStats({
        totalReports,
        pendingReports,
        verifiedReports,
        myReports,
        recentActivity: recentActivity || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBasedWelcome = () => {
    switch (profile?.role) {
      case 'disaster_manager':
        return {
          title: 'Disaster Management Dashboard',
          subtitle: 'Monitor critical ocean hazards and coordinate emergency responses',
          icon: Shield
        };
      case 'analyst':
        return {
          title: 'Analytics Dashboard',
          subtitle: 'Analyze hazard patterns and verify community reports',
          icon: TrendingUp
        };
      default:
        return {
          title: 'Citizen Reporter Dashboard',
          subtitle: 'Help keep your community safe by reporting ocean hazards',
          icon: Users
        };
    }
  };

  const welcomeConfig = getRoleBasedWelcome();
  const WelcomeIcon = welcomeConfig.icon;

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Waves className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            <Waves className="h-10 w-10 text-primary" />
            <WelcomeIcon className="h-5 w-5 text-accent absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{welcomeConfig.title}</h1>
            <p className="text-muted-foreground">{welcomeConfig.subtitle}</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Welcome back, {profile?.name}!</h2>
              <p className="text-muted-foreground">
                {profile?.role === 'citizen' 
                  ? 'Your reports help keep communities safe from ocean hazards.'
                  : 'Monitor and manage ocean hazard reports from your community.'
                }
              </p>
            </div>
            <div className="hidden md:block">
              <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
                {profile?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{stats.verifiedReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-accent" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">My Reports</p>
                <p className="text-2xl font-bold">{stats.myReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link to="/report">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report New Hazard
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/map">
                <MapPin className="h-4 w-4 mr-2" />
                View Map Dashboard
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/social">
                <TrendingUp className="h-4 w-4 mr-2" />
                Social Media Analytics
              </Link>
            </Button>

            {(profile?.role === 'analyst' || profile?.role === 'disaster_manager') && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/admin">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest hazard reports from the community</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                stats.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                    {getStatusIcon(activity.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">
                        {activity.hazard_type.replace('_', ' ')} - {activity.status}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <span>{activity.profiles?.name || 'Anonymous'}</span>
                        <span className="mx-1">•</span>
                        <span>{new Date(activity.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Alert Banner (Placeholder) */}
      <Card className="mt-6 border-destructive/20 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Emergency Alert System</h3>
              <p className="text-sm text-muted-foreground">
                No active emergency alerts. System monitoring for critical ocean hazards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
