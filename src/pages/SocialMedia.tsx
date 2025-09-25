// src/pages/SocialMedia.tsx
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

const SocialMediaPage: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [query, setQuery] = useState('cyclone alert OR tsunami');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always stringify body and send Content-Type
      const res = await supabase.functions.invoke('twitter-search', {
        body: JSON.stringify({ q: query }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Debug: log the raw response for diagnosing shape
      console.log('raw invoke response:', res);

      // Handle multiple possible response shapes:
      // - supabase-js sometimes returns { data, error }
      // - sometimes it returns a fetch-like Response that needs res.json()
      let payload: any = null;

      if (res && typeof res === 'object' && 'error' in res && (res as any).error) {
        // supabase-style error object
        throw (res as any).error;
      }

      if (res && typeof res === 'object' && 'data' in res) {
        // supabase returned { data, error }
        payload = (res as any).data;
      } else if (res && typeof (res as any).json === 'function') {
        // fetch Response-like object
        payload = await (res as any).json();
      } else {
        // fallback: use res as-is
        payload = res;
      }

      console.log('parsed payload from function:', payload);

      // Defensive parsing: ensure tweets is an array
      const tweetsFromFn = Array.isArray(payload?.tweets) ? payload.tweets : [];

      // Optional: map/normalize tweet shape if needed
      const normalizedTweets: Tweet[] = tweetsFromFn.map((t: any) => ({
        id: String(t.id ?? t.tweet_id ?? Math.random().toString(36).slice(2)),
        text: t.text ?? t.body ?? '',
        created_at: t.created_at ?? t.timestamp ?? new Date().toISOString(),
        author: t.author
          ? {
              id: String(t.author.id ?? t.author_id ?? ''),
              username: t.author.username ?? t.author?.handle ?? 'unknown',
              name: t.author.name ?? t.author?.full_name ?? 'Unknown',
              profile_image_url: t.author.profile_image_url ?? t.author?.avatar ?? '',
            }
          : null,
      }));

      setTweets(normalizedTweets);
    } catch (err: any) {
      console.error('Supabase function error:', err);
      setError(
        err?.message
          ? `Failed to fetch tweets: ${err.message}`
          : 'Failed to fetch tweets. Check the console for details.'
      );
      setTweets([]); // clear old results on error
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === 'Enter' && handleSearch()
              }
              aria-label="Search query"
            />
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              aria-label="Search tweets"
            >
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
                tweets.map((tweet: Tweet) => (
                  <div
                    key={tweet.id}
                    className="p-4 border rounded-lg flex items-start space-x-4"
                  >
                    <Avatar>
                      <AvatarImage
                        src={tweet.author?.profile_image_url}
                        alt={tweet.author?.name}
                      />
                      <AvatarFallback>
                        {tweet.author?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold">
                          {tweet.author?.name ?? 'Unknown'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          @{tweet.author?.username ?? 'unknown'}
                        </span>
                      </div>

                      <p className="text-sm mb-2">{tweet.text}</p>

                      <span className="text-xs text-muted-foreground">
                        {tweet.created_at
                          ? new Date(tweet.created_at).toLocaleString()
                          : 'Unknown time'}
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
