import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Cpu, 
  Users, 
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AccumulatedInsights {
  companyGrowthMetrics: CompanyGrowthMetric[];
  technologyAdoptionCurves: TechnologyAdoptionCurve[];
  investorPatterns: InvestorPattern[];
  marketTrendIndicators: MarketTrendIndicator[];
  emergingThemes: EmergingTheme[];
}

interface CompanyGrowthMetric {
  company: string;
  firstMentionDate: string;
  totalMentions: number;
  mentionGrowthRate: number;
  fundingHistory: Array<{
    date: string;
    amount: string;
    round: string;
  }>;
  sentimentTrend: number[];
  keyMilestones: string[];
}

interface TechnologyAdoptionCurve {
  technology: string;
  firstAppearance: string;
  adoptionPhase: 'emerging' | 'growing' | 'mainstream' | 'declining';
  monthlyMentions: Array<[string, number]>;
  industryAdoption: Array<[string, number]>;
}

interface InvestorPattern {
  investor: string;
  totalInvestments: number;
  averageInvestmentSize: number;
  preferredStages: string[];
  sectorFocus: string[];
  coInvestors: Array<[string, number]>;
  successRate: number;
}

interface MarketTrendIndicator {
  indicator: string;
  value: number;
  trend: 'rising' | 'stable' | 'declining';
  confidence: number;
  lastUpdated: string;
}

interface EmergingTheme {
  theme: string;
  firstDetected: string;
  growthRate: number;
  relatedArticles: number;
  potentialImpact: 'high' | 'medium' | 'low';
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function DataInsights() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const { data: insights, isLoading } = useQuery<AccumulatedInsights>({
    queryKey: ["/api/market/accumulated-insights"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Building insights from accumulated data...</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return <div>No data available</div>;
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'emerging':
        return 'bg-blue-500';
      case 'growing':
        return 'bg-green-500';
      case 'mainstream':
        return 'bg-purple-500';
      case 'declining':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Data Insights</h1>
        <p className="text-muted-foreground mt-2">
          Accumulated market intelligence built over time from {insights.companyGrowthMetrics.length} companies 
          and {insights.technologyAdoptionCurves.length} technologies
        </p>
      </div>

      {/* Market Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        {insights.marketTrendIndicators.map((indicator) => (
          <Card key={indicator.indicator}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{indicator.indicator}</CardTitle>
              {getTrendIcon(indicator.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {indicator.indicator.includes('Sentiment') || indicator.indicator.includes('Rate') 
                  ? `${indicator.value.toFixed(1)}%` 
                  : indicator.value.toFixed(0)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={indicator.confidence * 100} className="h-2" />
                <span className="text-xs text-muted-foreground">
                  {(indicator.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Company Growth</TabsTrigger>
          <TabsTrigger value="technologies">Technology Adoption</TabsTrigger>
          <TabsTrigger value="investors">Investor Patterns</TabsTrigger>
          <TabsTrigger value="themes">Emerging Themes</TabsTrigger>
        </TabsList>

        {/* Company Growth Tab */}
        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Growing Companies</CardTitle>
              <CardDescription>
                Companies with highest mention growth rates over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.companyGrowthMetrics
                  .sort((a, b) => b.mentionGrowthRate - a.mentionGrowthRate)
                  .slice(0, 10)
                  .map((company) => (
                    <div
                      key={company.company}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => setSelectedCompany(company.company)}
                    >
                      <div className="flex items-center gap-4">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{company.company}</p>
                          <p className="text-sm text-muted-foreground">
                            {company.totalMentions} mentions since {new Date(company.firstMentionDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-green-600">
                            +{company.mentionGrowthRate.toFixed(1)}%/mo
                          </span>
                        </div>
                        {company.fundingHistory.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {company.fundingHistory.length} funding rounds
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {selectedCompany && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedCompany} - Detailed Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.companyGrowthMetrics
                    .find(c => c.company === selectedCompany)
                    ?.keyMilestones.map((milestone, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full" />
                        <p className="text-sm">{milestone}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Technology Adoption Tab */}
        <TabsContent value="technologies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Technology Adoption Phases</CardTitle>
                <CardDescription>
                  Distribution of technologies by adoption stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.technologyAdoptionCurves.map((tech) => (
                    <div
                      key={tech.technology}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => setSelectedTech(tech.technology)}
                    >
                      <div className="flex items-center gap-3">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tech.technology}</span>
                      </div>
                      <Badge className={getPhaseColor(tech.adoptionPhase)}>
                        {tech.adoptionPhase}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedTech && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedTech} - Monthly Mentions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={insights.technologyAdoptionCurves
                        .find(t => t.technology === selectedTech)
                        ?.monthlyMentions.map(([month, count]) => ({
                          month,
                          mentions: count
                        }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="mentions"
                        stroke="#6366f1"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Investor Patterns Tab */}
        <TabsContent value="investors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Active Investors</CardTitle>
              <CardDescription>
                Investors with highest number of investments and success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.investorPatterns
                  .sort((a, b) => b.totalInvestments - a.totalInvestments)
                  .slice(0, 10)
                  .map((investor) => (
                    <div
                      key={investor.investor}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{investor.investor}</p>
                          <p className="text-sm text-muted-foreground">
                            Focus: {investor.sectorFocus.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{investor.totalInvestments} investments</p>
                        <p className="text-sm text-muted-foreground">
                          {investor.successRate.toFixed(1)}% success rate
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emerging Themes Tab */}
        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emerging Market Themes</CardTitle>
              <CardDescription>
                New themes detected with high growth potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {insights.emergingThemes
                  .sort((a, b) => b.growthRate - a.growthRate)
                  .map((theme) => (
                    <Card key={theme.theme}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{theme.theme}</CardTitle>
                          <Badge
                            variant={
                              theme.potentialImpact === 'high'
                                ? 'destructive'
                                : theme.potentialImpact === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {theme.potentialImpact} impact
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Growth Rate</span>
                            <span className="font-medium">
                              {theme.growthRate.toFixed(1)} articles/month
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Related Articles</span>
                            <span className="font-medium">{theme.relatedArticles}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">First Detected</span>
                            <span className="font-medium">
                              {new Date(theme.firstDetected).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}