import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, BarChart3, PieChart, Activity, Globe, Brain } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface NewsAnalytics {
  dailyTrends: Array<{
    date: string;
    totalArticles: number;
    highConfidence: number;
    avgConfidence: number;
    breakingNews: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
    avgConfidence: number;
  }>;
  confidenceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  sourceAnalytics: Array<{
    source: string;
    articleCount: number;
    avgConfidence: number;
    regions: string[];
  }>;
  regionalDistribution: Array<{
    region: string;
    count: number;
    percentage: number;
  }>;
  weeklyComparison: {
    thisWeek: number;
    lastWeek: number;
    change: number;
    changePercentage: number;
  };
  totalStats: {
    totalArticles: number;
    averageConfidence: number;
    totalSources: number;
    breakingNewsCount: number;
  };
}

const COLORS = {
  startups: "#8b5cf6",
  research: "#06b6d4", 
  "use-cases": "#10b981",
  releases: "#f59e0b",
  tools: "#ef4444"
};

const CONFIDENCE_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"];

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<NewsAnalytics>({
    queryKey: ["/api/analytics"],
  });

  const { data: accumulatedInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/market/accumulated-insights"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No analytics data available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Analytics & Historical Insights</h1>
          <Badge variant="secondary" className="ml-auto">
            Live Data
          </Badge>
        </div>
        
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="analytics">Current Analytics</TabsTrigger>
            <TabsTrigger value="insights">Historical Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsTab analytics={analytics} />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsTab 
              accumulatedInsights={accumulatedInsights} 
              insightsLoading={insightsLoading} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: NewsAnalytics }) {
  return (
    <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalStats.totalArticles.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.weeklyComparison.change > 0 ? "+" : ""}{analytics.weeklyComparison.change} from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalStats.averageConfidence.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Quality score across all articles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalStats.totalSources}</div>
              <p className="text-xs text-muted-foreground">
                Verified news sources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Breaking News</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalStats.breakingNewsCount}</div>
              <p className="text-xs text-muted-foreground">
                High-impact stories this week
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Daily Trends</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="confidence">Quality</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Article Trends</CardTitle>
                <CardDescription>
                  Track the volume and quality of AI news articles over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'totalArticles' ? 'Total Articles' : 
                        name === 'highConfidence' ? 'High Confidence' :
                        name === 'breakingNews' ? 'Breaking News' : name
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalArticles"
                      stackId="1"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                      name="Total Articles"
                    />
                    <Area
                      type="monotone"
                      dataKey="highConfidence"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.8}
                      name="High Confidence"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Confidence Trend</CardTitle>
                <CardDescription>
                  Daily average confidence scores showing content quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Average Confidence']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgConfidence"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of AI news by category type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={analytics.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        label={(entry: any) => `${entry.category}: ${entry.percentage.toFixed(1)}%`}
                      >
                        {analytics.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.category as keyof typeof COLORS] || "#8884d8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name) => [value, 'Articles']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>
                    Average confidence score by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.categoryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Avg Confidence']} />
                      <Bar dataKey="avgConfidence" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>
                  Detailed statistics for each news category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.categoryBreakdown.map((category) => (
                    <div key={category.category} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold capitalize">{category.category}</h3>
                        <Badge 
                          variant="secondary" 
                          style={{ backgroundColor: COLORS[category.category as keyof typeof COLORS] + '20' }}
                        >
                          {category.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {category.count} articles
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {category.avgConfidence.toFixed(1)}% avg confidence
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confidence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Score Distribution</CardTitle>
                <CardDescription>
                  Quality assessment distribution across all articles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.confidenceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number, name) => [value, name === 'count' ? 'Articles' : 'Percentage']} />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Distribution</CardTitle>
                <CardDescription>
                  Percentage breakdown of articles by confidence range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.confidenceDistribution.map((range, index) => (
                    <div key={range.range} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{range.range}</h3>
                        <Badge 
                          variant="secondary"
                          style={{ backgroundColor: CONFIDENCE_COLORS[index] + '20' }}
                        >
                          {range.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {range.count} articles
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Source Performance</CardTitle>
                <CardDescription>
                  Article count and quality by news source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.sourceAnalytics.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="source" 
                      tick={{ fontSize: 11 }} 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'articleCount' ? value : `${value.toFixed(1)}%`,
                        name === 'articleCount' ? 'Articles' : 'Avg Confidence'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="articleCount" fill="#8b5cf6" name="Article Count" />
                    <Bar dataKey="avgConfidence" fill="#10b981" name="Avg Confidence" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
                <CardDescription>
                  News coverage by geographic region
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analytics.regionalDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={(entry: any) => `${entry.region}: ${entry.percentage.toFixed(1)}%`}
                    >
                      {analytics.regionalDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CONFIDENCE_COLORS[index % CONFIDENCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Articles']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}

function InsightsTab({ accumulatedInsights, insightsLoading }: { 
  accumulatedInsights: any; 
  insightsLoading: boolean; 
}) {
  if (insightsLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading historical insights...</p>
      </div>
    );
  }

  if (!accumulatedInsights) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Historical Data Yet</h3>
          <p className="text-muted-foreground">
            Historical insights will be available once we accumulate more data over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Company Growth Trends
            </CardTitle>
            <CardDescription>
              Accumulated intelligence on company development patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accumulatedInsights.companyGrowth?.slice(0, 5).map((company: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{company.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {company.mentions} mentions this period
                    </p>
                  </div>
                  <Badge variant={company.trend === 'up' ? 'default' : 'secondary'}>
                    {company.growth}% growth
                  </Badge>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No company growth data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Technology Adoption
            </CardTitle>
            <CardDescription>
              Historical patterns in AI technology adoption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accumulatedInsights.technologyAdoption?.slice(0, 5).map((tech: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{tech.technology}</h4>
                    <p className="text-sm text-muted-foreground">
                      {tech.adoptionStage} stage
                    </p>
                  </div>
                  <Badge variant="outline">
                    {tech.adoptionRate}% rate
                  </Badge>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No technology adoption data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Market Indicators
          </CardTitle>
          <CardDescription>
            Key metrics showing market trends and sentiment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {accumulatedInsights.marketIndicators?.map((indicator: any, index: number) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {indicator.value}
                </div>
                <div className="text-sm font-medium">{indicator.name}</div>
                <div className="text-xs text-muted-foreground">
                  {indicator.trend}
                </div>
              </div>
            )) || (
              <div className="col-span-full text-center py-4 text-muted-foreground">
                No market indicators available yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}