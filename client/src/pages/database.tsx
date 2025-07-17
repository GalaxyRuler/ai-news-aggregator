import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, RefreshCw, TrendingUp, Calendar, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string | null;
  category: string;
  confidence: string;
  regions: string[];
  sources: string[];
  pros: string[];
  cons: string[];
  publishedAt: Date;
  createdAt: Date;
  isBreaking: boolean;
  sourceUrls: string[];
}

interface NewsSource {
  id: number;
  name: string;
  type: string;
  url: string | null;
  apiKey: string | null;
  isActive: boolean;
  regions: string[];
  categories: string[];
  createdAt: Date;
  lastFetch: Date | null;
}

interface NewsSummary {
  totalArticles: number;
  highConfidence: number;
  breakingNews: number;
  categoryBreakdown: Record<string, number>;
}

export default function DatabasePage() {
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading: articlesLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
  });

  const { data: sources = [], isLoading: sourcesLoading } = useQuery<NewsSource[]>({
    queryKey: ["/api/news-sources"],
  });

  const { data: summary } = useQuery<NewsSummary>({
    queryKey: ["/api/news-summary"],
  });

  const collectNewsMutation = useMutation({
    mutationFn: () => apiRequest("/api/collect-news", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news-summary"] });
    },
  });

  if (articlesLoading || sourcesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Database Management</h1>
          </div>
          <div className="text-center py-12">Loading database information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Database Management</h1>
              <p className="text-gray-600 dark:text-gray-300">PostgreSQL database with persistent storage</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => collectNewsMutation.mutate()}
              disabled={collectNewsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {collectNewsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Collect News
            </Button>
          </div>
        </div>

        {/* Database Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalArticles || 0}</div>
              <p className="text-xs text-muted-foreground">Stored in PostgreSQL</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">RSS Sources</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sources.length}</div>
              <p className="text-xs text-muted-foreground">Active news sources</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.highConfidence || 0}</div>
              <p className="text-xs text-muted-foreground">AI-verified articles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground">Recent articles</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="articles">Articles Database</TabsTrigger>
            <TabsTrigger value="sources">RSS Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Articles</CardTitle>
                <CardDescription>
                  Latest AI news articles stored in PostgreSQL database with comprehensive analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articles.slice(0, 10).map((article) => (
                    <div key={article.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{article.summary}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge variant="secondary">{article.category}</Badge>
                            <span>•</span>
                            <span>Confidence: {(parseFloat(article.confidence) * 100).toFixed(0)}%</span>
                            <span>•</span>
                            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>RSS News Sources</CardTitle>
                <CardDescription>
                  All {sources.length} comprehensive AI/ML news sources configured for data collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources.map((source) => (
                    <div key={source.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{source.name}</h3>
                        <Badge variant={source.isActive ? "default" : "secondary"}>
                          {source.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{source.type.toUpperCase()}</p>
                      <div className="flex flex-wrap gap-1">
                        {source.categories.map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}