import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Filter, Clock, User, CheckCircle, AlertTriangle } from 'lucide-react';
import MapComponent from '@/components/MapComponent';

interface Report {
  id: string;
  hazard_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: string;
  created_at: string;
  media_url?: string;
  profiles: {
    name: string;
  } | null;
}

const MapView = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    hazard_type: 'all',
    status: 'all',
    time_range: 'all'
  });

  const hazardTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'tsunami', label: 'Tsunami' },
    { value: 'flood', label: 'Flood' },
    { value: 'high_waves', label: 'High Waves' },
    { value: 'storm_surge', label: 'Storm Surge' },
    { value: 'abnormal_sea_behavior', label: 'Abnormal Sea Behavior' },
  ];

  const statusTypes = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
  ];

  useEffect(() => {
    fetchReports();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reports' },
        () => fetchReports()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchReports = async () => {
    try {
      // First get all reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Then get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name');

      if (profilesError) throw profilesError;

      // Manually join the data
      const reportsWithProfiles = (reportsData || []).map(report => ({
        ...report,
        profiles: profilesData?.find(profile => profile.user_id === report.user_id) || null
      }));

      setReports(reportsWithProfiles);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = reports;

    if (filters.hazard_type !== 'all') {
      filtered = filtered.filter(report => report.hazard_type === filters.hazard_type);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    if (filters.time_range !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (filters.time_range) {
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(report => new Date(report.created_at) >= cutoffDate);
    }

    setFilteredReports(filtered);
  };

  const getHazardIcon = (type: string) => {
    switch (type) {
      case 'tsunami':
        return '🌊';
      case 'flood':
        return '🌊';
      case 'high_waves':
        return '🌊';
      case 'storm_surge':
        return '⛈️';
      case 'abnormal_sea_behavior':
        return '❓';
      default:
        return '⚠️';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MapPin className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading map data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Interactive Map Dashboard</h1>
        <p className="text-muted-foreground">
          View and analyze ocean hazard reports across different locations
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Hazard Type</label>
              <Select value={filters.hazard_type} onValueChange={(value) => setFilters({...filters, hazard_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hazardTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={filters.time_range} onValueChange={(value) => setFilters({...filters, time_range: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Placeholder */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Interactive Map</CardTitle>
            <CardDescription>Real-time hazard locations and status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96">
              <MapComponent 
                reports={filteredReports}
                selectedReport={selectedReport}
                onReportSelect={setSelectedReport}
                center={[25.7617, -80.1918]} // Miami Beach
                zoom={6}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Click on a report to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No reports match your filters</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedReport?.id === report.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getHazardIcon(report.hazard_type)}</span>
                        <div>
                          <h4 className="font-medium capitalize">
                            {report.hazard_type.replace('_', ' ')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {report.location_name || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                          </p>
                        </div>
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
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Report Details */}
      {selectedReport && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Report Details</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Hazard Type</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getHazardIcon(selectedReport.hazard_type)}</span>
                    <span className="capitalize">{selectedReport.hazard_type.replace('_', ' ')}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Status</h4>
                  {getStatusBadge(selectedReport.status)}
                </div>

                <div>
                  <h4 className="font-medium mb-1">Location</h4>
                  <p className="text-sm">
                    {selectedReport.location_name || 'No location name provided'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Reported By</h4>
                  <p className="text-sm">{selectedReport.profiles?.name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>

                {selectedReport.media_url && (
                  <div>
                    <h4 className="font-medium mb-1">Media Evidence</h4>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">Media viewer coming soon</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapView;