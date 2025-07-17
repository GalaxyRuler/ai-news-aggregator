import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Globe, TrendingUp, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface SerpApiStatus {
  apiKeyValid: boolean;
  status: string;
  message: string;
}

export default function SerpApiDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loadingState, setLoadingState] = useState<{
    news: boolean;
    trends: boolean;
    funding: boolean;
  }>({
    news: false,
    trends: false,
    funding: false
  });

  // Check SerpAPI status
  const { data: status, isLoading: statusLoading } = useQuery<SerpApiStatus>({
    queryKey: ["/api/serpapi/status"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Collect news mutation
  const collectNewsMutation = useMutation({
    mutationFn: () => {
      setLoadingState(prev => ({ ...prev, news: true }));
      return apiRequest("POST", "/api/serpapi/collect-news");
    },
    onSuccess: (data: any) => {
      setLoadingState(prev => ({ ...prev, news: false }));
      toast({
        title: "News Collection Complete!",
        description: `Successfully collected ${data.articlesCollected || 0} articles from Google News`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/news-summary"] });
    },
    onError: (error: any) => {
      setLoadingState(prev => ({ ...prev, news: false }));
      toast({
        title: "Error",
        description: error.message || "Failed to collect news from SerpAPI",
        variant: "destructive",
      });
    },
  });

  // Collect trends mutation
  const collectTrendsMutation = useMutation({
    mutationFn: () => {
      setLoadingState(prev => ({ ...prev, trends: true }));
      return apiRequest("POST", "/api/serpapi/collect-trends");
    },
    onSuccess: (data: any) => {
      setLoadingState(prev => ({ ...prev, trends: false }));
      toast({
        title: "Trends Collection Complete!",
        description: `Successfully collected ${data.trendsCollected || 0} trending topics from Google Trends`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/market/technology-adoption"] });
    },
    onError: (error: any) => {
      setLoadingState(prev => ({ ...prev, trends: false }));
      toast({
        title: "Error",
        description: error.message || "Failed to collect trends from SerpAPI",
        variant: "destructive",
      });
    },
  });

  // Collect funding mutation
  const collectFundingMutation = useMutation({
    mutationFn: () => {
      setLoadingState(prev => ({ ...prev, funding: true }));
      return apiRequest("POST", "/api/serpapi/collect-funding");
    },
    onSuccess: (data: any) => {
      setLoadingState(prev => ({ ...prev, funding: false }));
      toast({
        title: "Funding Data Collection Complete!",
        description: `Successfully collected ${data.companiesCollected || 0} companies and ${data.fundingCollected || 0} funding events`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/market/funding-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market/company-growth"] });
    },
    onError: (error: any) => {
      setLoadingState(prev => ({ ...prev, funding: false }));
      toast({
        title: "Error",
        description: error.message || "Failed to collect funding data from SerpAPI",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SerpAPI Data Collection</h1>
        <p className="text-muted-foreground">
          Collect targeted AI/ML news and trend data from Google News and Google Trends with enhanced search queries
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API Status
            {statusLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status?.apiKeyValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardTitle>
          <CardDescription>Current SerpAPI connection status</CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking API status...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={status?.apiKeyValid ? "default" : "destructive"}>
                  {status?.apiKeyValid ? "Connected" : "Disconnected"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {status?.message || "Unable to determine status"}
                </span>
              </div>
              {!status?.apiKeyValid && (
                <p className="text-sm text-muted-foreground mt-2">
                  If you haven't added your SerpAPI key yet, please add it through the environment variables or contact support.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collection Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* News Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Google News
            </CardTitle>
            <CardDescription>
              Collect targeted AI/ML news from Google News with enhanced search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              • Targeted queries: OpenAI, ChatGPT, GPT-4, Claude AI, Google Gemini
              • AI breakthrough and research news
              • Startup funding and venture capital coverage
              • Automatic relevance filtering (50%+ AI relevance)
              • Translation support for non-English articles
              • Impact analysis and categorization
            </div>
            <Button
              onClick={() => collectNewsMutation.mutate()}
              disabled={loadingState.news || !status?.apiKeyValid}
              className="w-full"
            >
              {loadingState.news ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Collecting News...
                </>
              ) : (
                "Collect AI News"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Trends Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Google Trends
            </CardTitle>
            <CardDescription>
              Track AI trends with specific technology focus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              • Specific AI tools: ChatGPT, OpenAI, Claude AI, GPT-4, Google Gemini
              • Machine learning and AI research trends
              • Technology adoption patterns and search volumes
              • 12-month trend analysis and comparisons
              • Emerging AI technologies and breakthrough detection
            </div>
            <Button
              onClick={() => collectTrendsMutation.mutate()}
              disabled={loadingState.trends || !status?.apiKeyValid}
              className="w-full"
            >
              {loadingState.trends ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Collecting Trends...
                </>
              ) : (
                "Collect Trends"
              )}
            </Button>
          </CardContent>
        </Card>


      </div>

      {/* Usage Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Information</CardTitle>
          <CardDescription>Important details about SerpAPI integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">API Limits</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Free plan: 100 searches/month</li>
                <li>• Paid plans: 5,000+ searches/month</li>
                <li>• Rate limit: Varies by plan</li>
                <li>• Cached results don't count toward quota</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Quality</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Real-time data from Google</li>
                <li>• No fabricated or mock content</li>
                <li>• Automatic relevance filtering</li>
                <li>• Comprehensive metadata extraction</li>
              </ul>
            </div>
          </div>
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> SerpAPI provides authentic, real-time data from Google Search and Google Trends. 
              All collected articles and trends are from legitimate sources and automatically processed for AI/ML relevance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}