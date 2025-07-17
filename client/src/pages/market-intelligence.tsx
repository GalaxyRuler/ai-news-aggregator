import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TrendingUp, 
  DollarSign, 
  Building, 
  Rocket, 
  Users, 
  BarChart3,
  Target,
  Award,
  MapPin,
  AlertCircle,
  Lightbulb,
  Brain,
  Zap,
  Eye,
  Globe,
  Lock,
  Unlock,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface FundingData {
  totalFundingEvents: number;
  fundingByRound: Record<string, number>;
  topInvestors: Array<[string, number]>;
  recentEvents: Array<{
    companyName: string;
    fundingAmount: string;
    fundingRound: string;
    investors: string[];
    location: string;
  }>;
}

interface CompanyData {
  totalMentions: number;
  uniqueCompanies: number;
  topCompanies: Array<[string, any]>;
  mentionTypes: Record<string, number>;
}

interface TechData {
  totalTrends: number;
  emergingTech: number;
  trendingTechnologies: Array<{
    name: string;
    category: string;
    mentions: number;
    sentiment: number;
    trend: string;
  }>;
}

interface MarketData {
  predictions: Array<{
    type: string;
    company?: string;
    technology?: string;
    prediction: string;
    probability: number;
    timeframe: string;
    reasoning: string;
    indicators: string[];
  }>;
  opportunities: Array<{
    opportunity: string;
    category: string;
    potentialImpact: string;
    difficulty: string;
    timeToMarket: string;
    requiredCapabilities: string[];
    potentialPartners: string[];
    estimatedMarketSize: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    actionItems: string[];
    relatedCompanies: string[];
    timestamp: Date;
  }>;
}

interface DataSourcesData {
  totalSources: number;
  configuredCount: number;
  allSources: Array<{
    name: string;
    type: string;
    url: string;
    region?: string;
    apiEndpoint?: string;
    requiresAuth: boolean;
    description: string;
    dataTypes: string[];
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function MarketIntelligencePage() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const { data: fundingData = null, isLoading: fundingLoading, refetch: refetchFunding } = useQuery<FundingData>({
    queryKey: ['/api/market/funding-dashboard', timeframe],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const { data: companyData = null, isLoading: companyLoading } = useQuery<CompanyData>({
    queryKey: ['/api/market/company-mentions', timeframe],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const { data: techData = null, isLoading: techLoading } = useQuery<TechData>({
    queryKey: ['/api/market/technology-trends'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const { data: marketData = null, isLoading: marketLoading } = useQuery<MarketData>({
    queryKey: ['/api/market/predictions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const { data: dataSources = null, isLoading: sourcesLoading } = useQuery<DataSourcesData>({
    queryKey: ['/api/market/data-sources'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const { data: opportunitiesData = null, isLoading: opportunitiesLoading } = useQuery<{ opportunities: Array<any> }>({
    queryKey: ['/api/market/opportunities'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  const { data: alertsData = null, isLoading: alertsLoading } = useQuery<{ alerts: Array<any> }>({
    queryKey: ['/api/market/alerts'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });



  const processArticles = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/market/process-articles', { method: 'POST' });
      const result = await response.json();
      console.log('Processing result:', result);
      // Force refresh all queries by invalidating cache
      queryClient.invalidateQueries({ queryKey: ['/api/market/funding-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/company-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/technology-trends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/alerts'] });
      refetchFunding();
    } catch (error) {
      console.error('Error processing articles:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const seedMarketData = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('/api/market/seed', { method: 'POST' });
      const result = await response.json();
      console.log('Seeding result:', result);
      // Force refresh all queries by invalidating cache
      queryClient.invalidateQueries({ queryKey: ['/api/market/funding-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/company-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/technology-trends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/alerts'] });
      refetchFunding();
    } catch (error) {
      console.error('Error seeding market data:', error);
    } finally {
      setIsSeeding(false);
    }
  };



  const fundingByRoundData = fundingData?.fundingByRound ? 
    Object.entries(fundingData.fundingByRound).map(([round, count]) => ({
      round,
      count
    })) : [];

  const topInvestorsData = fundingData?.topInvestors?.slice(0, 10).map(([name, count]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    investments: count
  })) || [];

  const companyMentionsData = (companyData?.topCompanies || []).slice(0, 8).map(([name, data]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    mentions: data.count,
    sentiment: data.sentiment
  }));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered insights into startup funding, market trends, and competitive intelligence
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 lg:mt-0">
          <Select value={timeframe} onValueChange={(value: 'week' | 'month' | 'quarter') => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={processArticles} 
            variant="outline" 
            size="sm"
            disabled={isProcessing || isSeeding}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Processing Articles...' : 'Process Articles'}
          </Button>
          <Button 
            onClick={seedMarketData} 
            variant="outline" 
            size="sm"
            disabled={isProcessing || isSeeding}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Loading Sample Data...' : 'Seed Sample Data'}
          </Button>
        </div>
      </div>

      {!fundingData && !companyData && !techData && !marketData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Market Intelligence Data</AlertTitle>
          <AlertDescription>
            Click "Process Articles" to extract market intelligence from existing news articles, 
            or "Seed Sample Data" to populate with comprehensive test data for exploring the platform.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
          <TabsTrigger value="funding">Funding</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="technologies">Technologies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Funding Events</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fundingLoading ? "..." : fundingData?.totalFundingEvents || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Companies Tracked</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {companyLoading ? "..." : companyData?.uniqueCompanies || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tech Trends</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {techLoading ? "..." : techData?.totalTrends || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Predictions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marketLoading ? "..." : marketData?.predictions?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid gap-6">
            {marketLoading ? (
              <div>Loading predictions...</div>
            ) : (
              (marketData?.predictions || []).map((prediction, index) => (
                <Card key={`prediction-${index}-${prediction.type}-${prediction.probability}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        {prediction.type === 'funding' ? 'Funding Prediction' : 
                         prediction.type === 'acquisition' ? 'Acquisition Prediction' :
                         prediction.type === 'ipo' ? 'IPO Prediction' : 'Technology Adoption'}
                      </CardTitle>
                      <Badge variant={prediction.probability * 100 > 70 ? "default" : "secondary"}>
                        {Math.round(prediction.probability * 100)}% confidence
                      </Badge>
                    </div>
                    <CardDescription>
                      {prediction.company && `Company: ${prediction.company}`}
                      {prediction.technology && `Technology: ${prediction.technology}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{prediction.prediction}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Reasoning</h4>
                        <p className="text-sm text-muted-foreground">{prediction.reasoning}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Key Indicators</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(prediction.indicators || []).map((indicator, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-xs mt-1">•</span>
                              {indicator}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid gap-6">
            {opportunitiesLoading ? (
              <div>Loading opportunities...</div>
            ) : (
              (opportunitiesData?.opportunities || marketData?.opportunities || []).map((opportunity, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      {opportunity.opportunity}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{opportunity.category}</Badge>
                      <Badge variant={opportunity.potentialImpact === 'high' ? "default" : "secondary"}>
                        {opportunity.potentialImpact} impact
                      </Badge>
                      <Badge variant={opportunity.difficulty === 'low' ? "default" : "secondary"}>
                        {opportunity.difficulty} difficulty
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Required Capabilities</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(Array.isArray(opportunity.requiredCapabilities) ? opportunity.requiredCapabilities : []).map((capability, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-xs mt-1">•</span>
                              {capability}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Potential Partners</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(Array.isArray(opportunity.potentialPartners) ? opportunity.potentialPartners : []).map((partner, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-xs mt-1">•</span>
                              {partner}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Time to Market: <strong>{opportunity.timeToMarket}</strong></span>
                        <span>Market Size: <strong>{opportunity.estimatedMarketSize}</strong></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6">
            {alertsLoading ? (
              <div>Loading alerts...</div>
            ) : (
              (alertsData?.alerts || marketData?.alerts || []).map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {alert.title}
                      </CardTitle>
                      <Badge variant={alert.severity === 'high' ? "destructive" : 
                                    alert.severity === 'medium' ? "default" : "secondary"}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{alert.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Action Items</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(Array.isArray(alert.actionItems) ? alert.actionItems : []).map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-xs mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Related Companies</h4>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(alert.relatedCompanies) ? alert.relatedCompanies : []).map((company, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {company}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="funding" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fundingLoading ? "..." : fundingData?.totalFundingEvents || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fundingLoading ? "..." : fundingData?.topInvestors?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funding Rounds</CardTitle>
                <Rocket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fundingLoading ? "..." : Object.keys(fundingData?.fundingByRound || {}).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Funding by Round</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={fundingByRoundData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Investors</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topInvestorsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="investments" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Funding Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(fundingData?.recentEvents || []).map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.companyName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.fundingRound} • {event.location || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{event.fundingAmount}</div>
                      <p className="text-sm text-muted-foreground">
                        {(event.investors || []).slice(0, 2).join(', ')}
                        {(event.investors || []).length > 2 && ` +${(event.investors || []).length - 2} more`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Companies Tracked</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {companyLoading ? "..." : companyData?.uniqueCompanies || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {companyLoading ? "..." : companyData?.totalMentions || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mention Types</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {companyLoading ? "..." : Object.keys(companyData?.mentionTypes || {}).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Mentions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={companyMentionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="mentions" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mention Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(companyData?.mentionTypes || {}).map(([type, count]) => ({
                        name: type,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(companyData?.mentionTypes || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="technologies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trends</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {techLoading ? "..." : techData?.totalTrends || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emerging Tech</CardTitle>
                <Rocket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {techLoading ? "..." : techData?.emergingTech || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {techLoading ? "..." : 
                    new Set(techData?.trendingTechnologies?.map(t => t.category)).size || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trending Technologies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {techData?.trendingTechnologies?.filter((tech, index, arr) => 
                  arr.findIndex(t => t.name === tech.name) === index
                ).map((tech, index) => (
                  <div key={`${tech.name}-${tech.category}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{tech.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {tech.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {tech.mentions} mentions
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline"
                        className={`${
                          tech.trend === 'growing' ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700' :
                          tech.trend === 'rising' ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700' :
                          tech.trend === 'stable' ? 'bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-700' :
                          tech.trend === 'declining' ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700' :
                          tech.trend === 'emerging' ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700' :
                          'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-700'
                        }`}
                      >
                        {tech.trend}
                      </Badge>
                      <div className="text-sm mt-1">
                        <span className="text-muted-foreground">Sentiment: </span>
                        <span className={`font-medium ${
                          tech.sentiment >= 0.7 ? 'text-green-600 dark:text-green-400' :
                          tech.sentiment >= 0.4 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {(tech.sentiment * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
