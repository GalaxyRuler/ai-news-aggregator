import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Lightbulb, Target, Clock, Database, FileText, Activity } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface WeeklyReport {
  id: number;
  weekStart: string;
  weekEnd: string;
  title: string;
  content: string;
  analysis: string;
  recommendations: string[];
  predictions: string[];
  keyTrends: string[];
  articlesAnalyzed: number;
  createdAt: string;
}

export default function WeeklyReportPage() {
  const { data: latestReport, isLoading: isLoadingLatest } = useQuery({
    queryKey: ["/api/weekly-reports/latest"],
  });

  const { data: allReports, isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/weekly-reports"],
  });

  const { data: newsSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/news-summary"],
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/weekly-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Failed to generate weekly report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-reports"] });
    },
  });

  const handleGenerateReport = () => {
    generateReportMutation.mutate();
  };

  if (isLoadingLatest || isLoadingAll) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">The State of AI This Week</h1>
          <p className="text-muted-foreground mt-2">
            Weekly analysis, insights, and predictions from AI news coverage
          </p>
        </div>
        <Button 
          onClick={handleGenerateReport}
          disabled={generateReportMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generateReportMutation.isPending ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate New Report"
          )}
        </Button>
      </div>

      {/* Latest Report */}
      {latestReport && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-blue-900">{latestReport.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(latestReport.weekStart), "MMM d")} - {format(new Date(latestReport.weekEnd), "MMM d, yyyy")}
                  </span>
                  <Badge variant="secondary">{latestReport.articlesAnalyzed} articles analyzed</Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Executive Summary</h3>
              <p className="text-gray-700 leading-relaxed">{latestReport.content}</p>
            </div>

            <Separator />

            {/* Key Trends */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Key Trends
              </h3>
              <div className="grid gap-2">
                {latestReport.keyTrends.map((trend, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700">{trend}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Analysis */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Detailed Analysis</h3>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{latestReport.analysis}</p>
              </div>
            </div>

            <Separator />

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Recommendations
              </h3>
              <div className="grid gap-3">
                {latestReport.recommendations.map((rec, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Predictions */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Predictions
              </h3>
              <div className="grid gap-3">
                {latestReport.predictions.map((pred, index) => (
                  <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-gray-800">{pred}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Reports */}
      {allReports && allReports.length > 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Previous Reports</h2>
          <div className="grid gap-4">
            {allReports.slice(1).map((report: WeeklyReport) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <Badge variant="outline">
                      {format(new Date(report.weekStart), "MMM d")} - {format(new Date(report.weekEnd), "MMM d")}
                    </Badge>
                  </div>
                  <CardDescription>
                    {report.articlesAnalyzed} articles analyzed • Generated {format(new Date(report.createdAt), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 line-clamp-3">{report.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!latestReport && !isLoadingLatest && (
        <Card className="text-center p-8">
          <CardContent>
            <h3 className="text-xl font-semibold mb-2">No Weekly Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first weekly AI report to get comprehensive insights from this week's news.
            </p>
            <Button onClick={handleGenerateReport} disabled={generateReportMutation.isPending}>
              {generateReportMutation.isPending ? "Generating..." : "Generate First Report"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}