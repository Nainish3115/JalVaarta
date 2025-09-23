import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Eye,
  TrendingUp,
  Users,
  MessageSquare,
  Activity,
  ArrowRight,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Report {
  id: string;
  hazard_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: string;
  created_at: string;
  media_url: string;
  profiles: {
    name: string;
    role: string;
  } | null;
}

interface DashboardStats {
  pendingReports: number;
  verifiedReports: number;
  rejectedReports: number;
  totalUsers: number;
  recentAlerts: number;
  socialMediaAlerts: number;
}

const DisasterManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendingReports: 0,
    verifiedReports: 0,
    rejectedReports: 0,
    totalUsers: 0,
    recentAlerts: 0,
    socialMediaAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Check if user has disaster management privileges
  const isDisasterManager = profile?.role === 'disaster_manager' || profile?.role === 'analyst';

  useEffect(() => {
    if (isDisasterManager) {
      fetchDashboardData();
    }
  }, [isDisasterManager]);

  const fetchDashboardData = async () => {
    try {
      // Fetch reports with profiles
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, role');

      if (profilesError) throw profilesError;

      // Join data
      const reportsWithProfiles = (reportsData || []).map(report => ({
        ...report,
        profiles: profilesData?.find(profile => profile.user_id === report.user_id) || null
      }));

      setReports(reportsWithProfiles);

      // Calculate stats
      const pending = reportsWithProfiles.filter(r => r.status === 'pending').length;
      const verified = reportsWithProfiles.filter(r => r.status === 'verified').length;
      const rejected = reportsWithProfiles.filter(r => r.status === 'rejected').length;
      
      // Recent alerts (last 24 hours)
      const recent = reportsWithProfiles.filter(r => {
        const reportDate = new Date(r.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60);
        return diffHours <= 24;
      }).length;

      // Fetch social media stats
      const { data: socialData } = await supabase
        .from('social_media_posts')
        .select('*')
        .not('hazard_type', 'is', null);

      setStats({
        pendingReports: pending,
        verifiedReports: verified,
        rejectedReports: rejected,
        totalUsers: profilesData?.length || 0,
        recentAlerts: recent,
        socialMediaAlerts: socialData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch dashboard data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickVerify = async (reportId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          verified_by: profile?.user_id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Updated",
        description: `Report has been ${status}`,
      });

      fetchDashboardData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update report",
      });
    }
  };

  const getUrgencyLevel = (report: Report) => {
    const urgentTypes = ['tsunami', 'storm_surge'];
    const recentHours = (new Date().getTime() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    
    if (urgentTypes.includes(report.hazard_type) || recentHours < 2) {
      return { level: 'high', color: 'bg-red-500', text: 'High Priority' };
    } else if (recentHours < 12) {
      return { level: 'medium', color: 'bg-yellow-500', text: 'Medium Priority' };
    }
    return { level: 'low', color: 'bg-blue-500', text: 'Standard' };
  };

  if (!isDisasterManager) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            This area is restricted to Disaster Management personnel only.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading disaster management dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending').slice(0, 5);
  const urgentReports = reports.filter(r => r.status === 'pending' && getUrgencyLevel(r).level === 'high');

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-primary" />
          Disaster Management Center
        </h1>
        <p className="text-muted-foreground">
          Real-time hazard monitoring and emergency response coordination
        </p>
      </div>

      {/* Critical Alerts */}
      {urgentReports.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Alerts Requiring Immediate Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="font-medium capitalize">{report.hazard_type.replace('_', ' ')}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      • {report.location_name || 'Location pending'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleQuickVerify(report.id, 'verified')}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleQuickVerify(report.id, 'rejected')}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pendingReports}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Verified</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.verifiedReports}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Recent Alerts</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.recentAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Active Users</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Social Alerts</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.socialMediaAlerts}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Rejected</p>
                <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.rejectedReports}</p>
              </div>
              <XCircle className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Essential disaster management tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin">
              <Button className="w-full justify-start" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Full Admin Panel
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            <Link to="/social">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Social Media Analysis
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            <Link to="/map">
              <Button className="w-full justify-start" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Interactive Map View
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Reports Queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pending Verification Queue</CardTitle>
            <CardDescription>Reports awaiting your review and verification</CardDescription>
          </CardHeader>
          <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingReports.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">All reports have been reviewed!</p>
                </div>
              ) : (
                pendingReports.map((report) => {
                  const urgency = getUrgencyLevel(report);
                  return (
                    <div key={report.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium capitalize">
                              {report.hazard_type.replace('_', ' ')}
                            </h4>
                            <div className={`w-2 h-2 rounded-full ${urgency.color}`} title={urgency.text}></div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {report.location_name || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                          </p>
                          <p className="text-sm mt-1 line-clamp-2">{report.description}</p>
                          
                          {/* Media preview */}
                          {report.media_url && (
                            <div className="mt-2">
                              {report.media_url.includes('.mp4') || report.media_url.includes('.mov') ? (
                                <video 
                                  src={report.media_url} 
                                  className="w-20 h-20 object-cover rounded border cursor-pointer"
                                  onClick={() => setSelectedReport(report)}
                                />
                              ) : (
                                <img 
                                  src={report.media_url} 
                                  alt="Report evidence" 
                                  className="w-20 h-20 object-cover rounded border cursor-pointer"
                                  onClick={() => setSelectedReport(report)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <Button size="sm" variant="outline" onClick={() => setSelectedReport(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={() => handleQuickVerify(report.id, 'verified')}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleQuickVerify(report.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>By: {report.profiles?.name || 'Anonymous'}</span>
                        <span>{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {pendingReports.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Link to="/admin">
                  <Button variant="outline" className="w-full">
                    View All Reports <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold capitalize">
                  {selectedReport.hazard_type.replace('_', ' ')} Report
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Location</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.location_name || 'No location name provided'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Reporter Information</h3>
                  <p className="text-sm">Name: {selectedReport.profiles?.name || 'Anonymous'}</p>
                  <p className="text-sm">Role: {selectedReport.profiles?.role || 'Unknown'}</p>
                  <p className="text-sm">Reported: {new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
                
                {selectedReport.media_url && (
                  <div>
                    <h3 className="font-medium mb-2">Evidence</h3>
                    {selectedReport.media_url.includes('.mp4') || selectedReport.media_url.includes('.mov') ? (
                      <video 
                        src={selectedReport.media_url} 
                        controls 
                        className="w-full max-h-64 rounded border"
                      />
                    ) : (
                      <img 
                        src={selectedReport.media_url} 
                        alt="Report evidence" 
                        className="w-full max-h-64 object-contain rounded border bg-muted"
                      />
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2 pt-4 border-t">
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      handleQuickVerify(selectedReport.id, 'verified');
                      setSelectedReport(null);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Report
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => {
                      handleQuickVerify(selectedReport.id, 'rejected');
                      setSelectedReport(null);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Status & Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Verification Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Review location accuracy and hazard type classification</li>
                <li>• Check for duplicate reports in the same area</li>
                <li>• Verify media evidence when available</li>
                <li>• Consider real-time weather and oceanic conditions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Priority Levels</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>High: Tsunami, storm surge, or reports &lt;2 hours old</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Medium: Reports &lt;12 hours old</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Standard: Other reports</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DisasterManagement;