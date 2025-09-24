import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Thermometer,
  BarChart3,
  Download,
  Layers,
  Filter,
  TrendingUp
} from 'lucide-react';

interface SocialPost {
  id: string;
  source: string;
  content: string;
  hazard_type: string | null;
  sentiment: 'positive' | 'negative' | 'neutral';
  location_name: string | null;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

interface HeatmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: SocialPost[];
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  count: number;
  location: string;
  hazards: string[];
}

export const HeatmapDialog: React.FC<HeatmapDialogProps> = ({
  open,
  onOpenChange,
  posts
}) => {
  const { toast } = useToast();
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [selectedHazard, setSelectedHazard] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [intensityMetric, setIntensityMetric] = useState('count');
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock coordinates for locations (in real app, you'd have a geocoding service)
  const locationCoordinates: { [key: string]: [number, number] } = {
    'mumbai': [19.0760, 72.8777],
    'chennai': [13.0827, 80.2707],
    'kolkata': [22.5726, 88.3639],
    'kochi': [9.9312, 76.2673],
    'visakhapatnam': [17.6868, 83.2185],
    'gujarat': [23.0225, 72.5714],
    'odisha': [20.9517, 85.0985],
    'kerala': [10.8505, 76.2711],
    'tamil nadu': [11.1271, 78.6569],
    'west bengal': [22.9868, 87.8550],
    'andhra pradesh': [15.9129, 79.7400],
    'karnataka': [15.3173, 75.7139],
    'goa': [15.2993, 74.1240],
    'maharashtra': [19.7515, 75.7139],
    'bay of bengal': [15.0000, 90.0000],
    'arabian sea': [16.0000, 68.0000],
    'indian ocean': [10.0000, 75.0000]
  };

  useEffect(() => {
    if (open) {
      generateHeatmapData();
    }
  }, [open, posts, selectedHazard, timeRange, intensityMetric]);

  const generateHeatmapData = () => {
    setIsGenerating(true);
    
    // Filter posts based on criteria
    let filteredPosts = [...posts];
    
    // Filter by hazard type
    if (selectedHazard !== 'all') {
      filteredPosts = filteredPosts.filter(post => post.hazard_type === selectedHazard);
    }

    // Filter by time range
    const now = new Date();
    const timeRangeHours = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
      'all': Infinity
    }[timeRange] || 24;

    if (timeRangeHours !== Infinity) {
      const cutoff = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);
      filteredPosts = filteredPosts.filter(post => new Date(post.created_at) >= cutoff);
    }

    // Group posts by location
    const locationGroups: { [key: string]: SocialPost[] } = {};
    
    filteredPosts.forEach(post => {
      if (post.location_name) {
        const location = post.location_name.toLowerCase();
        if (!locationGroups[location]) {
          locationGroups[location] = [];
        }
        locationGroups[location].push(post);
      }
    });

    // Generate heatmap points
    const heatmapPoints: HeatmapPoint[] = [];
    
    Object.entries(locationGroups).forEach(([location, locationPosts]) => {
      const coords = locationCoordinates[location];
      if (coords) {
        const hazardTypes = [...new Set(locationPosts.map(p => p.hazard_type).filter(Boolean))];
        const negativeCount = locationPosts.filter(p => p.sentiment === 'negative').length;
        const totalCount = locationPosts.length;
        
        let intensity = 0;
        switch (intensityMetric) {
          case 'count':
            intensity = totalCount;
            break;
          case 'negative_ratio':
            intensity = totalCount > 0 ? (negativeCount / totalCount) * 100 : 0;
            break;
          case 'hazard_diversity':
            intensity = hazardTypes.length;
            break;
          default:
            intensity = totalCount;
        }

        heatmapPoints.push({
          lat: coords[0],
          lng: coords[1],
          intensity,
          count: totalCount,
          location: location,
          hazards: hazardTypes as string[]
        });
      }
    });

    // Sort by intensity for better visualization
    heatmapPoints.sort((a, b) => b.intensity - a.intensity);
    
    setTimeout(() => {
      setHeatmapData(heatmapPoints);
      setIsGenerating(false);
    }, 1000);
  };

  const exportHeatmapData = () => {
    const exportData = {
      generated_at: new Date().toISOString(),
      filters: {
        hazard_type: selectedHazard,
        time_range: timeRange,
        intensity_metric: intensityMetric
      },
      heatmap_points: heatmapData,
      summary: {
        total_locations: heatmapData.length,
        max_intensity: Math.max(...heatmapData.map(p => p.intensity)),
        total_posts: heatmapData.reduce((sum, p) => sum + p.count, 0)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Heatmap Data Exported",
      description: "Geolocation heatmap data has been downloaded.",
    });
  };

  const getIntensityColor = (intensity: number, maxIntensity: number) => {
    const ratio = intensity / maxIntensity;
    if (ratio >= 0.8) return 'bg-red-500';
    if (ratio >= 0.6) return 'bg-orange-500';
    if (ratio >= 0.4) return 'bg-yellow-500';
    if (ratio >= 0.2) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const maxIntensity = Math.max(...heatmapData.map(p => p.intensity), 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Geolocation Heatmap
          </DialogTitle>
          <DialogDescription>
            Visualize the geographic distribution and intensity of ocean hazard reports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Filter className="h-4 w-4 mr-2" />
                Heatmap Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hazard Type</Label>
                  <Select value={selectedHazard} onValueChange={setSelectedHazard}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="tsunami">Tsunami</SelectItem>
                      <SelectItem value="cyclone">Cyclone</SelectItem>
                      <SelectItem value="storm_surge">Storm Surge</SelectItem>
                      <SelectItem value="high_waves">High Waves</SelectItem>
                      <SelectItem value="coastal_erosion">Coastal Erosion</SelectItem>
                      <SelectItem value="oil_spill">Oil Spill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time Range</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="6h">Last 6 Hours</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Intensity Metric</Label>
                  <Select value={intensityMetric} onValueChange={setIntensityMetric}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Post Count</SelectItem>
                      <SelectItem value="negative_ratio">Negative Ratio</SelectItem>
                      <SelectItem value="hazard_diversity">Hazard Diversity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={generateHeatmapData} 
                disabled={isGenerating}
                className="mt-4 w-full"
              >
                <Thermometer className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating Heatmap...' : 'Update Heatmap'}
              </Button>
            </CardContent>
          </Card>

          {/* Heatmap Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Heatmap Visualization
                </span>
                <Badge variant="secondary">
                  {heatmapData.length} locations
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <Thermometer className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
                    <p>Generating heatmap...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Intensity Scale:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">Low</span>
                      <div className="flex space-x-1">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                      </div>
                      <span className="text-xs">High</span>
                    </div>
                  </div>

                  {/* Heatmap Points List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {heatmapData.map((point, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getIntensityColor(point.intensity, maxIntensity)}`}></div>
                            <span className="font-medium capitalize">{point.location}</span>
                          </div>
                          <Badge variant="outline">
                            {Math.round(point.intensity)} {intensityMetric === 'negative_ratio' ? '%' : ''}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Posts: {point.count}</div>
                          <div>Coordinates: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}</div>
                          {point.hazards.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {point.hazards.map(hazard => (
                                <Badge key={hazard} variant="secondary" className="text-xs">
                                  {hazard.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {heatmapData.length === 0 && (
                    <div className="h-32 flex items-center justify-center text-muted-foreground">
                      No location data available for the selected filters
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <BarChart3 className="h-4 w-4 mr-2" />
                Heatmap Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{heatmapData.length}</div>
                  <div className="text-sm text-muted-foreground">Locations</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {heatmapData.reduce((sum, p) => sum + p.count, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Posts</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-orange-500">
                    {Math.round(maxIntensity)}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Intensity</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-accent">
                    {heatmapData.length > 0 ? Math.round(heatmapData.reduce((sum, p) => sum + p.intensity, 0) / heatmapData.length) : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Intensity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={exportHeatmapData}
              className="flex-1"
              disabled={heatmapData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Heatmap Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};