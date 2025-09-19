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
  User, 
  MapPin, 
  AlertTriangle,
  Eye,
  Calendar
} from 'lucide-react';

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

interface Profile {
  id: string;
  name: string;
  role: string;
  created_at: string;
  user_id: string;
}

const AdminPanel = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Check if user has admin privileges
  const isAdmin = profile?.role === 'analyst' || profile?.role === 'disaster_manager';

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (
            name,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch reports",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleVerifyReport = async (reportId: string, status: 'verified' | 'rejected') => {
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

      // Refresh reports
      fetchReports();
      setSelectedReport(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update report",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'disaster_manager':
        return <Badge className="bg-red-100 text-red-800">Disaster Manager</Badge>;
      case 'analyst':
        return <Badge className="bg-blue-100 text-blue-800">Analyst</Badge>;
      case 'citizen':
        return <Badge className="bg-gray-100 text-gray-800">Citizen</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the admin panel. 
            Only Analysts and Disaster Managers can access this area.
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
            <Shield className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const verifiedReports = reports.filter(r => r.status === 'verified');
  const rejectedReports = reports.filter(r => r.status === 'rejected');

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Manage hazard reports and monitor system activity
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingReports.length}</p>
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
                <p className="text-2xl font-bold">{verifiedReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Report Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reports List */}
            <Card>
              <CardHeader>
                <CardTitle>Reports Queue</CardTitle>
                <CardDescription>Click on a report to review and verify</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {reports.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No reports available</p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedReport?.id === report.id ? 'bg-muted border-primary' : ''
                        }`}
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium capitalize">
                              {report.hazard_type.replace('_', ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {report.location_name || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                            </p>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {report.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {report.profiles?.name || 'Anonymous'}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Report Details */}
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
                <CardDescription>
                  {selectedReport ? 'Review and verify the selected report' : 'Select a report to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedReport ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-1">Hazard Type</h4>
                      <p className="text-sm capitalize">{selectedReport.hazard_type.replace('_', ' ')}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-1">Status</h4>
                      {getStatusBadge(selectedReport.status)}
                    </div>

                    <div>
                      <h4 className="font-medium mb-1">Location</h4>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {selectedReport.location_name || 'No location name'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-1">Description</h4>
                      <p className="text-sm">{selectedReport.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-1">Reported By</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{selectedReport.profiles?.name || 'Anonymous'}</span>
                        {getRoleBadge(selectedReport.profiles?.role || 'citizen')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedReport.created_at).toLocaleString()}
                      </p>
                    </div>

                    {selectedReport.media_url && (
                      <div>
                        <h4 className="font-medium mb-1">Media Evidence</h4>
                        <div className="bg-muted rounded-lg p-4 text-center">
                          <Eye className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Media viewer coming soon</p>
                        </div>
                      </div>
                    )}

                    {selectedReport.status === 'pending' && (
                      <div className="flex space-x-2 pt-4 border-t">
                        <Button
                          onClick={() => handleVerifyReport(selectedReport.id, 'verified')}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Report
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleVerifyReport(selectedReport.id, 'rejected')}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Report
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select a report to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Overview of all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;