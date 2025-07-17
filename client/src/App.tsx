import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import DataSourcesPage from "@/pages/sources";
import AnalyticsPage from "@/pages/analytics";
import MarketIntelligencePage from "@/pages/market-intelligence";
import ContentDiscoveryPage from "@/pages/content-discovery";
import WeeklyReportPage from "@/pages/weekly-report";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, refetch } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => refetch()} />;
  }

  // Show app if authenticated
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/sources" component={DataSourcesPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/market-intelligence" component={MarketIntelligencePage} />
        <Route path="/content-discovery" component={ContentDiscoveryPage} />
        <Route path="/weekly-report" component={WeeklyReportPage} />
        
        {/* Redirects for old paths */}
        <Route path="/source-management">{() => <Redirect to="/sources" />}</Route>
        <Route path="/data-insights">{() => <Redirect to="/analytics" />}</Route>
        <Route path="/automation">{() => <Redirect to="/sources" />}</Route>
        <Route path="/serpapi">{() => <Redirect to="/sources" />}</Route>
        <Route path="/database">{() => <Redirect to="/weekly-report" />}</Route>
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ai-news-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
