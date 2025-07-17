import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar,
  RefreshCw,
  Play,
  CheckCircle,
  AlertCircle,
  Settings,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface CollectorStatus {
  isRunning: boolean;
  lastRunTime: Date | null;
  nextScheduledRun: Date | null;
}

export default function AutomationSettings() {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(true);
  const [openaiStatus, setOpenaiStatus] = useState<"idle" | "running" | "completed">("idle");

  const { data: status, isLoading: statusLoading } = useQuery<CollectorStatus>({
    queryKey: ["/api/collector/status"],
    refetchInterval: openaiStatus === "running" ? 2000 : 30000, // Poll faster when running
  });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/collector/trigger"),
    onSuccess: (data: any) => {
      toast({
        title: "Manual collection started",
        description: data.message || "Collection process has been initiated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/collector/status"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to trigger manual collection",
        variant: "destructive",
      });
    },
  });

  const openaiMutation = useMutation({
    mutationFn: () => {
      setOpenaiStatus("running");
      return apiRequest("POST", "/api/collector/openai");
    },
    onSuccess: (data: any) => {
      setOpenaiStatus("completed");
      toast({
        title: "OpenAI search completed!",
        description: `Successfully added ${data.articlesAdded || 0} new AI articles to your collection`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      // Reset status after 5 seconds
      setTimeout(() => setOpenaiStatus("idle"), 5000);
    },
    onError: (error: any) => {
      setOpenaiStatus("idle");
      toast({
        title: "Error",
        description: error.message || "Failed to run OpenAI search",
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: Date | string | null) => {
    if (!date) return "Never";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM dd, yyyy 'at' h:mm a");
  };

  const getTimeUntilNext = (nextRun: Date | string | null) => {
    if (!nextRun) return "";
    const dateObj = typeof nextRun === "string" ? new Date(nextRun) : nextRun;
    const now = new Date();
    const diff = dateObj.getTime() - now.getTime();
    
    if (diff < 0) return "Overdue";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading automation settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Automation Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure automated daily news collection for AI/ML and startup content
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Daily Collection Status
            </CardTitle>
            <CardDescription>
              Automatically collects and analyzes AI/ML news every day at 3:00 AM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-collect" className="text-base">
                Enable Automatic Collection
              </Label>
              <Switch
                id="auto-collect"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Current Status
                </div>
                <div className="flex items-center gap-2">
                  {status?.isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="font-medium">Running</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Idle</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Last Run
                </div>
                <p className="font-medium">
                  {status?.lastRunTime ? formatTime(status.lastRunTime) : "Never"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Next Run
                </div>
                <p className="font-medium">
                  {status?.nextScheduledRun ? formatTime(status.nextScheduledRun) : "Not scheduled"}
                </p>
                {status?.nextScheduledRun && (
                  <p className="text-sm text-muted-foreground">
                    {getTimeUntilNext(status.nextScheduledRun)}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              {/* OpenAI Search Status */}
              {openaiStatus !== "idle" && (
                <div className={`p-4 rounded-lg border ${
                  openaiStatus === "running" ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" : 
                  "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                }`}>
                  <div className="flex items-center gap-3">
                    {openaiStatus === "running" ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                        <div className="space-y-1">
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            OpenAI is searching the internet...
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            This may take up to 1 minute while AI searches for the latest news
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="space-y-1">
                          <p className="font-medium text-green-900 dark:text-green-100">
                            Search completed successfully!
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            New articles have been added to your collection
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => triggerMutation.mutate()}
                  disabled={status?.isRunning || triggerMutation.isPending || openaiStatus === "running"}
                  className="w-full sm:w-auto"
                >
                  {triggerMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Starting collection...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Full Collection
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => openaiMutation.mutate()}
                  disabled={status?.isRunning || openaiMutation.isPending || openaiStatus === "running"}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  {openaiStatus === "running" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      AI is searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Run OpenAI Search Only
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Full Collection:</strong> Runs all RSS sources + OpenAI search<br />
                <strong>OpenAI Search:</strong> Uses AI to find fresh news from the internet
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What Gets Collected Card */}
        <Card>
          <CardHeader>
            <CardTitle>What Gets Collected Daily</CardTitle>
            <CardDescription>
              The automated collector gathers comprehensive AI/ML and startup intelligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  News & Articles
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                  <li>• AI/ML developments and breakthroughs</li>
                  <li>• Startup funding announcements</li>
                  <li>• New AI tools and products</li>
                  <li>• Research papers and findings</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-green-500" />
                  Market Intelligence
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                  <li>• Company growth metrics</li>
                  <li>• Technology adoption trends</li>
                  <li>• Investor activity patterns</li>
                  <li>• Market predictions and alerts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources Card */}
        <Card>
          <CardHeader>
            <CardTitle>Active Data Sources</CardTitle>
            <CardDescription>
              Content is collected from these verified sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">54 RSS Feeds</Badge>
              <Badge variant="secondary">NewsData.io API</Badge>
              <Badge variant="secondary">Alpha Vantage Financial</Badge>
              <Badge variant="secondary">OpenAI Analysis</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Collection Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Schedule</CardTitle>
            <CardDescription>
              Daily collection runs automatically at these times
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Daily at 3:00 AM</p>
                    <p className="text-sm text-muted-foreground">
                      Collects news from the past 24 hours
                    </p>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}