import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Twitter, Search, AlertTriangle } from 'lucide-react';

interface TweetAuthor {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author: TweetAuthor | null;
}

const SocialMediaPage = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [query, setQuery] = useState('cyclone alert OR tsunami');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search query.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('twitter-search', {
        body: { q: query },
      });

      if (error) throw error;

      setTweets(data?.tweets || []);
    } catch (err: any) {
      setError("Failed to fetch tweets. Check the console for details.");
      console.error("Supabase function error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Twitter className="h-6 w-6 mr-3 text-blue-500" />
            Live Twitter Search
          </CardTitle>
          <CardDescription>
            Search for real-time posts from Twitter about ocean hazards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex w-full max-w-sm items-center space-x-2 mb-6">
            <Input 
              type="text" 
              placeholder="e.g., storm surge"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button type="submit" onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Display Area */}
          {isLoading && (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
              <p>Searching for tweets...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Error: {error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {tweets.length > 0 ? (
                tweets.map((tweet) => (
                  <div key={tweet.id} className="p-4 border rounded-lg flex items-start space-x-4">
                    <Avatar>
                      <AvatarImage src={tweet.author?.profile_image_url} alt={tweet.author?.name} />
                      <AvatarFallback>{tweet.author?.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold">{tweet.author?.name}</span>
                        <span className="text-sm text-muted-foreground">@{tweet.author?.username}</span>
                      </div>
                      <p className="text-sm mb-2">{tweet.text}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tweet.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No results found. Try a different search.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaPage;
