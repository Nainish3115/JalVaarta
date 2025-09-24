import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Download,
  FileText,
  Users,
  Activity
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

interface AlertSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: SocialPost[];
  stats: any;
}

export const AlertSummaryDialog: React.FC<AlertSummaryDialogProps> = ({
  open,
  onOpenChange,
  posts,
  stats
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async () => {
    setIsGenerating(true);
    
    // Simulate API call for generating report
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Alert Summary Generated",
      description: "Your alert summary report has been generated successfully.",
    });
    
    setIsGenerating(false);
  };

  const exportReport = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      summary: {
        total_posts: stats.totalPosts,
        hazard_posts: stats.hazardPosts,
        alert_level: stats.alertLevel,
        risk_percentage: stats.totalPosts ? Math.round((stats.hazardPosts / stats.totalPosts) * 100) : 0
      },
      breakdown: {
        by_sentiment: stats.sentimentBreakdown,
        by_hazard_type: stats.hazardBreakdown,
        by_source: stats.sourceBreakdown
      },
      trending_keywords: stats.trendingKeywords,
      critical_posts: posts.filter(post => 
        post.hazard_type && post.sentiment === 'negative'
      ).slice(0, 10)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-summary-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Alert summary report has been downloaded.",
    });
  };

  const getRiskLevel = () => {
    const riskPercentage = stats.totalPosts ? Math.round((stats.hazardPosts / stats.totalPosts) * 100) : 0;
    if (riskPercentage >= 70) return { level: 'HIGH', color: 'bg-red-500', textColor: 'text-red-500' };
    if (riskPercentage >= 40) return { level: 'MEDIUM', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
    return { level: 'LOW', color: 'bg-green-500', textColor: 'text-green-500' };
  };

  const risk = getRiskLevel();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Alert Summary Report
          </DialogTitle>
          <DialogDescription>
            Comprehensive analysis of current ocean hazard alerts from social media monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Level Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Current Alert Level
                </span>
                <Badge className={`${risk.color} text-white`}>
                  {risk.level} RISK
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalPosts}</div>
                  <div className="text-sm text-muted-foreground">Total Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{stats.hazardPosts}</div>
                  <div className="text-sm text-muted-foreground">Hazard Alerts</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${risk.textColor}`}>
                    {stats.totalPosts ? Math.round((stats.hazardPosts / stats.totalPosts) * 100) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Risk Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{stats.sourceBreakdown?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Sources</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Risk Level</span>
                  <span className={risk.textColor}>{risk.level}</span>
                </div>
                <Progress 
                  value={stats.totalPosts ? (stats.hazardPosts / stats.totalPosts) * 100 : 0} 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-medium mb-2">Top Hazard Types</h4>
                  <div className="space-y-2">
                    {stats.hazardBreakdown?.slice(0, 3).map((hazard: any, index: number) => (
                      <div key={hazard.type} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{hazard.type?.replace('_', ' ')}</span>
                        <span className="font-medium">{hazard.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Trending Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {stats.trendingKeywords?.slice(0, 6).map((keyword: string) => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        #{keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Posts Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Critical Posts (Top 3)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {posts
                  .filter(post => post.hazard_type && post.sentiment === 'negative')
                  .slice(0, 3)
                  .map((post, index) => (
                    <div key={post.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive" className="text-xs">
                            {post.hazard_type?.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{post.source}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      {post.location_name && (
                        <div className="flex items-center mt-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {post.location_name}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={generateReport} 
              disabled={isGenerating}
              className="flex-1"
            >
              <Activity className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Full Report'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportReport}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};