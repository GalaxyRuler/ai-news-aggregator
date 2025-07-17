import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles, Network, TrendingUp, Link as LinkIcon, Brain } from "lucide-react";
import { EnhancedNewsCard } from "@/components/enhanced-news-card";
import { useDebounce } from "@/hooks/use-debounce";

interface SemanticSearchResult {
  article: any;
  relevanceScore: number;
  explanation: string;
}

interface ArticleCluster {
  id: number;
  title: string;
  description: string;
  articles: any[];
  keywords: string[];
  clusterType: string;
}

interface TrendingTopic {
  name: string;
  description: string;
  frequency: number;
  trendType: string;
}

export default function ContentDiscovery() {
  const { toast } = useToast();
  const [semanticQuery, setSemanticQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedQuery = useDebounce(semanticQuery, 500);

  // Fetch article clusters
  const { data: clusters = [], isLoading: clustersLoading } = useQuery({
    queryKey: ["/api/discover/clusters"],
    queryFn: async () => {
      const response = await fetch("/api/discover/clusters?limit=8");
      if (!response.ok) throw new Error("Failed to fetch clusters");
      return response.json() as ArticleCluster[];
    },
  });

  // Fetch trending topics
  const { data: trendingTopics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["/api/discover/trending"],
    queryFn: async () => {
      const response = await fetch("/api/discover/trending");
      if (!response.ok) throw new Error("Failed to fetch trending topics");
      return response.json() as TrendingTopic[];
    },
  });

  // Semantic search function
  const performSemanticSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/semantic?q=${encodeURIComponent(query)}&limit=8`);
      if (!response.ok) throw new Error("Search failed");
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      toast({ 
        title: "Search failed", 
        description: "Unable to perform semantic search",
        variant: "destructive" 
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSemanticSearch(debouncedQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-8 w-8 text-purple-600" />
        <h1 className="text-3xl font-bold">Enhanced Content Discovery</h1>
      </div>

      <Tabs defaultValue="semantic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="semantic">Semantic Search</TabsTrigger>
          <TabsTrigger value="clusters">Article Clusters</TabsTrigger>
          <TabsTrigger value="trending">Trending Topics</TabsTrigger>
          <TabsTrigger value="similar">Similar Articles</TabsTrigger>
        </TabsList>

        <TabsContent value="semantic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>AI-Powered Semantic Search</span>
              </CardTitle>
              <CardDescription>
                Search by meaning, not just keywords. Ask questions like "find articles about AI safety concerns" or "what's new in computer vision"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ask about AI developments, companies, or technologies..."
                    value={semanticQuery}
                    onChange={(e) => setSemanticQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 animate-pulse text-purple-600" />
                      <p>AI is analyzing your query...</p>
                    </div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">
                      Found {searchResults.length} relevant articles
                    </h3>
                    {searchResults.map((result, index) => (
                      <div key={result.article.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">
                            Relevance: {(result.relevanceScore * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant="outline">AI Match</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          <strong>Why this matches:</strong> {result.explanation}
                        </p>
                        <EnhancedNewsCard article={result.article} />
                      </div>
                    ))}
                  </div>
                )}

                {semanticQuery && !isSearching && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No articles found matching your search. Try different keywords or phrases.
                    </p>
                  </div>
                )}

                {!semanticQuery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Example searches:</h4>
                      <div className="space-y-1">
                        {[
                          "AI safety and alignment research",
                          "Large language model developments", 
                          "Computer vision breakthroughs",
                          "AI startups getting funding",
                          "Ethical AI and bias discussions"
                        ].map((example) => (
                          <Button
                            key={example}
                            variant="ghost"
                            size="sm"
                            className="justify-start h-auto p-2 text-left"
                            onClick={() => setSemanticQuery(example)}
                          >
                            "{example}"
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">How it works:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• AI understands context and meaning</li>
                        <li>• Finds articles by concepts, not just words</li>
                        <li>• Explains why articles are relevant</li>
                        <li>• Ranks results by semantic similarity</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clusters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Related Article Clusters</span>
              </CardTitle>
              <CardDescription>
                Discover articles grouped by storylines, topics, and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clustersLoading ? (
                <div className="text-center py-8">Loading article clusters...</div>
              ) : clusters.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {clusters.map((cluster) => (
                    <div key={cluster.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{cluster.title}</h3>
                        <Badge variant="outline">{cluster.clusterType}</Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {cluster.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {cluster.keywords.slice(0, 5).map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {cluster.articles.length} related articles
                          </span>
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {cluster.articles.slice(0, 3).map((article) => (
                            <div key={article.id} className="text-sm border rounded p-2">
                              <p className="font-medium line-clamp-2">{article.title}</p>
                              <p className="text-muted-foreground text-xs mt-1">
                                {new Date(article.publishedAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                          {cluster.articles.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{cluster.articles.length - 3} more articles
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No article clusters available. Clusters are created automatically as articles are processed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Trending AI Topics</span>
              </CardTitle>
              <CardDescription>
                Hot topics and emerging themes in AI this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topicsLoading ? (
                <div className="text-center py-8">Loading trending topics...</div>
              ) : trendingTopics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendingTopics.map((topic, index) => (
                    <div key={topic.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <Badge className={
                          topic.trendType === 'technology' ? 'bg-blue-500' :
                          topic.trendType === 'company' ? 'bg-green-500' :
                          topic.trendType === 'research' ? 'bg-purple-500' : 'bg-orange-500'
                        }>
                          {topic.trendType}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold mb-2">{topic.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {topic.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Mentioned {topic.frequency} times
                        </span>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No trending topics available. Trends are analyzed from recent article patterns.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="similar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LinkIcon className="h-5 w-5" />
                <span>Similar Article Discovery</span>
              </CardTitle>
              <CardDescription>
                Click on any article in the app to see similar articles using AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <LinkIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Find Similar Articles</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  When reading any article, look for the "Similar Articles" section to discover related content
                  using AI-powered similarity analysis.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div className="text-center">
                    <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Brain className="h-6 w-6 text-blue-600" />
                    </div>
                    <h4 className="font-medium mb-2">AI Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Advanced algorithms find articles with similar topics, themes, and concepts
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-6 w-6 text-green-600" />
                    </div>
                    <h4 className="font-medium mb-2">Smart Matching</h4>
                    <p className="text-sm text-muted-foreground">
                      Goes beyond keywords to understand content meaning and context
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}