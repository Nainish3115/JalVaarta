import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  Filter,
  AlertTriangle,
  Calendar,
  MapPin
} from 'lucide-react';

interface SocialPost {
  id: string;
  source: string;
  content: string;
  hazard_type: string | null;
  sentiment: 'positive' | 'negative' | 'neutral';
  location_name: string | null;
  created_at: string;
}

interface ExportPostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: SocialPost[];
}

export const ExportPostsDialog: React.FC<ExportPostsDialogProps> = ({
  open,
  onOpenChange,
  posts
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [filters, setFilters] = useState({
    hazardType: 'all',
    sentiment: 'all',
    timeRange: '24h',
    includeCriticalOnly: true,
    includeLocation: true
  });
  const [exportFormat, setExportFormat] = useState('json');

  const getFilteredPosts = () => {
    let filtered = [...posts];

    // Filter by hazard type
    if (filters.hazardType !== 'all') {
      filtered = filtered.filter(post => post.hazard_type === filters.hazardType);
    }

    // Filter by sentiment
    if (filters.sentiment !== 'all') {
      filtered = filtered.filter(post => post.sentiment === filters.sentiment);
    }

    // Filter by time range
    const now = new Date();
    const timeRangeHours = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
      'all': Infinity
    }[filters.timeRange] || 24;

    if (timeRangeHours !== Infinity) {
      const cutoff = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);
      filtered = filtered.filter(post => new Date(post.created_at) >= cutoff);
    }

    // Filter critical only
    if (filters.includeCriticalOnly) {
      filtered = filtered.filter(post => 
        post.hazard_type && post.sentiment === 'negative'
      );
    }

    return filtered;
  };

  const exportPosts = async () => {
    setIsExporting(true);
    setExportProgress(0);

    const filteredPosts = getFilteredPosts();
    
    // Simulate export progress
    for (let i = 0; i <= 100; i += 10) {
      setExportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      filters_applied: filters,
      total_posts: filteredPosts.length,
      posts: filteredPosts.map(post => ({
        id: post.id,
        source: post.source,
        content: post.content,
        hazard_type: post.hazard_type,
        sentiment: post.sentiment,
        location: filters.includeLocation ? post.location_name : null,
        created_at: post.created_at,
        risk_score: post.hazard_type && post.sentiment === 'negative' ? 'HIGH' : 
                   post.hazard_type ? 'MEDIUM' : 'LOW'
      }))
    };

    let blob: Blob;
    let fileName: string;
    let mimeType: string;

    switch (exportFormat) {
      case 'csv':
        const csvHeader = 'ID,Source,Content,Hazard Type,Sentiment,Location,Created At,Risk Score\n';
        const csvContent = exportData.posts.map(post => 
          `"${post.id}","${post.source}","${post.content.replace(/"/g, '""')}","${post.hazard_type || ''}","${post.sentiment}","${post.location || ''}","${post.created_at}","${post.risk_score}"`
        ).join('\n');
        blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
        fileName = `critical-posts-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
      
      case 'txt':
        const txtContent = exportData.posts.map(post => 
          `=== POST ${post.id} ===\n` +
          `Source: ${post.source}\n` +
          `Hazard: ${post.hazard_type || 'None'}\n` +
          `Sentiment: ${post.sentiment}\n` +
          `Location: ${post.location || 'Unknown'}\n` +
          `Risk: ${post.risk_score}\n` +
          `Time: ${post.created_at}\n` +
          `Content: ${post.content}\n\n`
        ).join('');
        blob = new Blob([txtContent], { type: 'text/plain' });
        fileName = `critical-posts-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
        break;
      
      default: // json
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        fileName = `critical-posts-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `${filteredPosts.length} critical posts exported successfully.`,
    });

    setIsExporting(false);
    onOpenChange(false);
  };

  const filteredCount = getFilteredPosts().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Critical Posts
          </DialogTitle>
          <DialogDescription>
            Export social media posts based on your filter criteria for further analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Format</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (Structured Data)</SelectItem>
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                  <SelectItem value="txt">Text (Human Readable)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Filter className="h-4 w-4 mr-2" />
                Filter Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hazard Type</Label>
                  <Select value={filters.hazardType} onValueChange={(value) => 
                    setFilters({...filters, hazardType: value})
                  }>
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
                  <Label>Sentiment</Label>
                  <Select value={filters.sentiment} onValueChange={(value) => 
                    setFilters({...filters, sentiment: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="negative">Negative (Critical)</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Time Range</Label>
                <Select value={filters.timeRange} onValueChange={(value) => 
                  setFilters({...filters, timeRange: value})
                }>
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

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="critical-only"
                    checked={filters.includeCriticalOnly}
                    onCheckedChange={(checked) => 
                      setFilters({...filters, includeCriticalOnly: !!checked})
                    }
                  />
                  <Label htmlFor="critical-only" className="text-sm">
                    Critical posts only (hazard + negative sentiment)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-location"
                    checked={filters.includeLocation}
                    onCheckedChange={(checked) => 
                      setFilters({...filters, includeLocation: !!checked})
                    }
                  />
                  <Label htmlFor="include-location" className="text-sm">
                    Include location information
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Posts to export:</span>
                  <span className="text-lg font-bold text-primary">{filteredCount}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on current filter settings
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Progress */}
          {isExporting && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Exporting posts...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isExporting}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={exportPosts}
              disabled={isExporting || filteredCount === 0}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : `Export ${filteredCount} Posts`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};