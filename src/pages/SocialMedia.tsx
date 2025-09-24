import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, AlertTriangle, Twitter } from "lucide-react";

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  lang?: string;
}

const SocialMediaPage = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTweets();
  }, []);

  const fetchTweets = async () => {
    setIsLoading(true);

    const { data, error } = await supabase.functions.invoke<Tweet[]>(
      "fetch_tweets",
    );

    if (error) {
      setError("Failed to fetch tweets from the server.");
      console.error("Supabase function error:", error);
    } else {
      setTweets(data || []);
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MessageSquare className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Fetching latest global reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Twitter className="h-6 w-6 mr-3 text-blue-500" />
            Global Coastal Hazard Feed
          </CardTitle>
          <CardDescription>
            Real-time posts from social media around the world.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <div key={tweet.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary">Twitter</Badge>
                      {tweet.created_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(tweet.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{tweet.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No recent reports found matching the keywords.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaPage;
