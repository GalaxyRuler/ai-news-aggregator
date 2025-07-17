import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Newspaper,
  BarChart3,
  Database,
  FileText,
  Brain,
  Search,
  Menu,
  X,
  ChevronLeft,
  TrendingUp,
  Sparkles,
  Globe,
  Settings,
  Moon,
  Sun,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: "News Dashboard",
    href: "/",
    icon: Home,
    description: "AI news overview & feed"
  },
  {
    title: "Data Sources",
    href: "/sources",
    icon: Globe,
    description: "RSS feeds, APIs & automation"
  },
  {
    title: "Market Intelligence",
    href: "/market-intelligence",
    icon: TrendingUp,
    description: "Funding, companies & predictions"
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Trends & historical insights"
  },
  {
    title: "Content Discovery",
    href: "/content-discovery",
    icon: Search,
    description: "Smart search & clustering"
  },
  {
    title: "Reports",
    href: "/weekly-report",
    icon: FileText,
    description: "Weekly summaries & database"
  }
];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r bg-card transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo Section */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">AI News Hub</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(!sidebarOpen && "mx-auto")}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start transition-all",
                        !sidebarOpen && "justify-center px-2"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4",
                        sidebarOpen && "mr-3"
                      )} />
                      {sidebarOpen && (
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{item.title}</span>
                          {!isActive && (
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          )}
                        </div>
                      )}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "w-full justify-start",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            {theme === "dark" ? (
              <Sun className={cn("h-4 w-4", sidebarOpen && "mr-3")} />
            ) : (
              <Moon className={cn("h-4 w-4", sidebarOpen && "mr-3")} />
            )}
            {sidebarOpen && <span>Toggle theme</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">AI News Hub</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden">
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-lg">
              <div className="h-16 border-b flex items-center px-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">AI News Hub</span>
                </div>
              </div>
              <nav className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon className="h-4 w-4 mr-3" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{item.title}</span>
                          {!isActive && (
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          )}
                        </div>
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className={cn(
          "min-h-full",
          "lg:ml-0", // Desktop doesn't need margin as sidebar handles it
          "pt-16 lg:pt-0" // Mobile needs padding for fixed header
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}