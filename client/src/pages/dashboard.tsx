import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Brain, RefreshCw, Filter, Settings, Clock, BarChart3, Calendar, Database, Sparkles, TrendingUp, Search, Activity, AlertCircle, Globe } from "lucide-react";
import { EnhancedNewsCard } from "@/components/enhanced-news-card";
import { FilterSidebar } from "@/components/filter-sidebar";
import { CategoryTabs } from "@/components/category-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/use-debounce";
import type { NewsArticle } from "@shared/schema";
import type { NewsFilter, NewsSummary } from "@/lib/types";

export default function Dashboard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<NewsFilter>({
    category: "all",
    confidence: 0.5,
    dateRange: "week",
    regions: ["global", "mena", "far-asia", "north-america"],
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState("latest");
  
  // Debounce search input
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch news articles with debouncing
  const { data: rawArticles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/news", debouncedFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: debouncedFilters.category,
        confidence: debouncedFilters.confidence.toString(),
        dateRange: debouncedFilters.dateRange,
        regions: debouncedFilters.regions.join(","),
        ...(debouncedFilters.search && { search: debouncedFilters.search }),
      });
      
      const response = await fetch(`/api/news?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch news articles");
      }
      
      return await response.json();
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (v5 uses gcTime instead of cacheTime)
  });

  const articles = rawArticles;

  // Fetch news summary
  const { data: summary = {} } = useQuery({
    queryKey: ["/api/news-summary"],
    queryFn: async () => {
      const response = await fetch("/api/news-summary", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch news summary");
      }
      
      return await response.json();
    },
  });

  // Comprehensive refresh from all sources
  const refreshNewsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/refresh-news");
      return response.json();
    },
    onSuccess: (data) => {
      // Force refetch all news queries including filtered ones
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news-summary"] });
      // Also refetch current filtered view
      queryClient.refetchQueries({ queryKey: ["/api/news", debouncedFilters] });
      toast({
        title: "All Sources Updated",
        description: `Collected ${data.articlesAdded} articles from RSS feeds, APIs, and other sources`,
      });
    },
    onError: (error) => {
      toast({
        title: "Collection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleShare = (article: NewsArticle) => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${article.title}\n\n${article.summary}\n\n${window.location.href}`);
      toast({
        title: "Copied to clipboard",
        description: "Article details copied to clipboard",
      });
    }
  };

  const handleSave = (article: NewsArticle) => {
    // In a real app, this would save to user's saved articles
    toast({
      title: "Article Saved",
      description: "Article saved to your reading list",
    });
  };

  const formatLastUpdated = () => {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Integrated Header with Filters */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Title and Stats */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">AI News Intelligence Hub</h1>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  {summary?.totalArticles || 0} Articles
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {summary?.highConfidence || 0} High Impact
                </Badge>
                {(summary?.breakingNews || 0) > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {summary?.breakingNews} Breaking
                  </Badge>
                )}
              </div>
            </div>

            {/* Right: Compact Filters */}
            <div className="lg:w-96 bg-white dark:bg-gray-800 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="flex-1 min-w-32">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={filters.search || ""}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-7 h-7 text-xs"
                    />
                    <Search className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                  </div>
                </div>

                {/* Date Range */}
                <div className="w-20">
                  <Select value={filters.dateRange} onValueChange={(value: "24h" | "48h" | "week") => setFilters({ ...filters, dateRange: value })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24h</SelectItem>
                      <SelectItem value="48h">48h</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Confidence */}
                <div className="flex items-center space-x-2 min-w-28">
                  <span className="text-xs text-gray-600 whitespace-nowrap">Conf: {filters.confidence}%</span>
                  <Slider
                    value={[filters.confidence]}
                    onValueChange={(value) => setFilters({ ...filters, confidence: value[0] })}
                    max={100}
                    min={0}
                    step={5}
                    className="w-16"
                  />
                </div>

                {/* Refresh All Sources Button */}
                <div className="hidden lg:block">
                  <Button
                    onClick={() => refreshNewsMutation.mutate()}
                    disabled={refreshNewsMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${refreshNewsMutation.isPending ? 'animate-spin' : ''}`} />
                    Refresh All
                  </Button>
                </div>

                {/* Mobile Filters Toggle */}
                <div className="lg:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="h-7 text-xs"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    More
                  </Button>
                </div>
              </div>

              {/* Mobile Expanded Filters */}
              {showMobileFilters && (
                <div className="lg:hidden mt-3 pt-3 border-t">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Regions</Label>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: "global", label: "Global" },
                          { id: "mena", label: "MENA" },
                          { id: "far-asia", label: "Asia" },
                          { id: "north-america", label: "NA" },
                        ].map((region) => (
                          <div key={region.id} className="flex items-center space-x-1">
                            <Checkbox
                              id={region.id}
                              checked={filters.regions.includes(region.id)}
                              onCheckedChange={(checked) => {
                                const newRegions = checked
                                  ? [...filters.regions, region.id]
                                  : filters.regions.filter(r => r !== region.id);
                                setFilters({ ...filters, regions: newRegions });
                              }}
                              className="h-3 w-3"
                            />
                            <Label htmlFor={region.id} className="text-xs cursor-pointer">
                              {region.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {summary && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Total:</span>
                          <span className="font-medium">{summary.totalArticles}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="w-full">
          {/* Main Content */}
          <main className="w-full max-w-none overflow-hidden">
            {/* Category Tabs */}
            <CategoryTabs
              activeCategory={filters.category}
              onCategoryChange={(category) => setFilters({ ...filters, category })}
              summary={summary}
            />

            {/* Compact AI Features Section */}
            <div className="bg-gradient-to-r from-green-50 to-purple-50 dark:from-green-900/20 dark:to-purple-900/20 rounded-lg p-3 mb-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-green-600" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">AI Intelligence Features</h2>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">New</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Link href="/market-intelligence">
                  <div className="bg-white dark:bg-gray-800 rounded p-2 border border-green-200 dark:border-green-700 hover:shadow transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Market Intelligence</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Funding, companies & trends</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/content-discovery">
                  <div className="bg-white dark:bg-gray-800 rounded p-2 border border-purple-200 dark:border-purple-700 hover:shadow transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-purple-600" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Content Discovery</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Search & trending topics</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* News Grid */}
            <div className="space-y-3 w-full max-w-full">
              {articlesLoading ? (
                // Loading skeletons
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-6 w-full mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                ))
              ) : articles.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters or refresh the data to get new articles.
                  </p>
                  <Button
                    onClick={() => refreshNewsMutation.mutate()}
                    disabled={refreshNewsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshNewsMutation.isPending ? "animate-spin" : ""}`} />
                    Refresh News
                  </Button>
                </div>
              ) : (
                articles.map((article) => (
                  <EnhancedNewsCard
                    key={article.id}
                    article={article}
                    onShare={handleShare}
                    onSave={handleSave}
                  />
                ))
              )}
            </div>

            {/* Load More */}
            {articles.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  Showing {articles.length} of {summary?.totalArticles || articles.length} articles
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
        >
          <Filter className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
