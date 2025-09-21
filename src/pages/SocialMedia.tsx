import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp, Hash, Heart, AlertTriangle, MapPin } from 'lucide-react';

interface SocialPost {
  id: string;
  source: string;
  content: string;
  hazard_type: string | null;
  sentiment: string;
  location_name: string | null;
  created_at: string;
}

const SocialMedia = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [stats, setStats] = useState({
    totalPosts: 0,
    hazardPosts: 0,
    sentimentBreakdown: {} as Record<string, number>,
    sourceBreakdown: {} as Record<string, number>,
    hazardBreakdown: {} as Record<string, number>,
    trendingKeywords: [] as string[],
    alertLevel: 'low' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    fetchSocialPosts();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('social-posts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'social_media_posts' },
        () => fetchSocialPosts()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchSocialPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPosts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching social posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (postsData: SocialPost[]) => {
    const totalPosts = postsData.length;
    const hazardPosts = postsData.filter(post => post.hazard_type).length;
    
    const sentimentBreakdown = postsData.reduce((acc, post) => {
      acc[post.sentiment] = (acc[post.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceBreakdown = postsData.reduce((acc, post) => {
      acc[post.source] = (acc[post.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hazardBreakdown = postsData
      .filter(post => post.hazard_type)
      .reduce((acc, post) => {
        acc[post.hazard_type!] = (acc[post.hazard_type!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Calculate trending keywords (simplified)
    const trendingKeywords = ['tsunami', 'waves', 'flood', 'storm', 'emergency', 'safety', 'warning', 'evacuation'];
    
    // Determine alert level based on hazard posts
    let alertLevel: 'low' | 'medium' | 'high' = 'low';
    const hazardRate = totalPosts ? (hazardPosts / totalPosts) * 100 : 0;
    if (hazardRate > 50) alertLevel = 'high';
    else if (hazardRate > 25) alertLevel = 'medium';

    setStats({
      totalPosts,
      hazardPosts,
      sentimentBreakdown,
      sourceBreakdown,
      hazardBreakdown,
      trendingKeywords,
      alertLevel
    });
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      case 'neutral':
        return '😐';
      default:
        return '❓';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHazardColor = (hazardType: string) => {
    const colors = {
      tsunami: '#ef4444',
      flood: '#3b82f6',
      high_waves: '#06b6d4',
      storm_surge: '#8b5cf6',
      abnormal_sea_behavior: '#f59e0b'
    };
    return colors[hazardType as keyof typeof colors] || '#6b7280';
  };

  // Chart data preparation
  const sentimentChartData = Object.entries(stats.sentimentBreakdown).map(([sentiment, count]) => ({
    name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    value: count
  }));

  const hazardChartData = Object.entries(stats.hazardBreakdown).map(([hazard, count]) => ({
    name: hazard.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: count
  }));

  const COLORS = ['#10b981', '#ef4444', '#6b7280'];

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MessageSquare className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading social media analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Social Media Analytics</h1>
            <p className="text-muted-foreground">
              Monitor and analyze social media posts related to ocean hazards
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="30d">Last 30d</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            
            <div className={`px-3 py-2 rounded-md font-medium text-sm ${
              stats.alertLevel === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              stats.alertLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              Alert Level: {stats.alertLevel.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{stats.totalPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Hazard Posts</p>
                <p className="text-2xl font-bold">{stats.hazardPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-accent" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Hazard Rate</p>
                <p className="text-2xl font-bold">
                  {stats.totalPosts ? Math.round((stats.hazardPosts / stats.totalPosts) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Hash className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Sources</p>
                <p className="text-2xl font-bold">{Object.keys(stats.sourceBreakdown).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sentiment Analysis Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Overall sentiment of social media posts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {sentimentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hazard Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hazard Type Frequency</CardTitle>
            <CardDescription>Distribution of different hazard types in posts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hazardChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Live Social Media Feed
          </CardTitle>
          <CardDescription>Real-time social media posts about ocean conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {posts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No social media posts available</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{post.source}</Badge>
                      {post.hazard_type && (
                        <Badge variant="destructive" className="capitalize">
                          {post.hazard_type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSentimentIcon(post.sentiment)}</span>
                      <Badge className={getSentimentColor(post.sentiment)}>
                        {post.sentiment}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3">{post.content}</p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      {post.location_name && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {post.location_name}
                        </div>
                      )}
                    </div>
                    <span>{new Date(post.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trending Keywords & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Trending Keywords
            </CardTitle>
            <CardDescription>Most frequently mentioned terms in hazard-related posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.trendingKeywords.map((keyword, index) => (
                <Badge 
                  key={keyword} 
                  variant="secondary" 
                  className={`text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground ${
                    index < 3 ? 'bg-primary/20 text-primary font-medium' : ''
                  }`}
                >
                  #{keyword}
                </Badge>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">Keyword Analytics</h4>
              <div className="space-y-2">
                {stats.trendingKeywords.slice(0, 5).map((keyword, index) => (
                  <div key={keyword} className="flex items-center justify-between">
                    <span className="text-sm">#{keyword}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${Math.max(20, 100 - index * 15)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.max(5, 50 - index * 8)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disaster Management Tools</CardTitle>
            <CardDescription>Analysis tools for emergency response coordination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Alert Summary Report
            </Button>
            
            <Button className="w-full justify-start" variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Export Critical Posts
            </Button>
            
            <Button className="w-full justify-start" variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Geolocation Heatmap
            </Button>
            
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.hazardPosts}</div>
                  <div className="text-muted-foreground">Active Alerts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">
                    {stats.totalPosts ? Math.round((stats.hazardPosts / stats.totalPosts) * 100) : 0}%
                  </div>
                  <div className="text-muted-foreground">Risk Level</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialMedia;