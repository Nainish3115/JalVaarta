import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
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
  const [stats, setStats] = useState({
    totalPosts: 0,
    hazardPosts: 0,
    sentimentBreakdown: {} as Record<string, number>,
    sourceBreakdown: {} as Record<string, number>,
    hazardBreakdown: {} as Record<string, number>
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

    setStats({
      totalPosts,
      hazardPosts,
      sentimentBreakdown,
      sourceBreakdown,
      hazardBreakdown
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Social Media Analytics</h1>
        <p className="text-muted-foreground">
          Monitor and analyze social media posts related to ocean hazards
        </p>
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

      {/* Trending Keywords (Placeholder) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Hash className="h-5 w-5 mr-2" />
            Trending Keywords
          </CardTitle>
          <CardDescription>Most frequently mentioned terms in hazard-related posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['tsunami', 'waves', 'flood', 'storm', 'emergency', 'safety', 'warning', 'evacuation'].map((keyword) => (
              <Badge key={keyword} variant="secondary" className="text-sm">
                #{keyword}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMedia;