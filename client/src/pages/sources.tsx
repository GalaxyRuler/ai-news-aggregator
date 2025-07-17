import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Globe, Rss, Search, Filter, ChevronLeft, ChevronRight, Settings, TrendingUp, Zap, Lock, Unlock, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types for the components
interface NewsSource {
  id: number;
  name: string;
  url: string;
  type: 'rss' | 'api';
  purpose: 'dashboard' | 'market-intelligence' | 'both';
  region: string;
  category: string;
  isActive: boolean;
  isVerified: boolean;
  lastFetched: string | null;
  apiKey?: string;
  description?: string;
}

interface ApiStatus {
  apiKeyValid: boolean;
  status: string;
  usage?: {
    searches_remaining: number;
    searches_used: number;
    searches_limit: number;
  };
}

interface AutomationStatus {
  isEnabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  status: string;
}

interface MarketDataSource {
  name: string;
  type: string;
  url: string;
  requiresAuth: boolean;
  description: string;
  dataTypes: string[];
  region?: string;
}

interface MarketDataSources {
  totalSources: number;
  configuredCount: number;
  allSources: MarketDataSource[];
}

interface MarketIntelligenceSource {
  id: number;
  name: string;
  type: string;
  url: string;
  apiEndpoint?: string;
  requiresAuth: boolean;
  description?: string;
  dataTypes?: string[];
  region?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InsertMarketIntelligenceSource {
  name: string;
  type: string;
  url: string;
  apiEndpoint?: string;
  requiresAuth: boolean;
  description?: string;
  dataTypes?: string[];
  region?: string;
  isActive: boolean;
}

function MarketIntelligenceTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<MarketIntelligenceSource | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dataSources, isLoading: sourcesLoading } = useQuery<MarketDataSources>({
    queryKey: ['/api/market/data-sources']
  });

  const { data: managedSources, isLoading: managedLoading } = useQuery<MarketIntelligenceSource[]>({
    queryKey: ['/api/market-intelligence-sources']
  });

  const createMutation = useMutation({
    mutationFn: (newSource: InsertMarketIntelligenceSource) => 
      apiRequest('POST', '/api/market-intelligence-sources', newSource),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/market-intelligence-sources'] });
      toast({ title: 'Success', description: 'Market intelligence source added successfully' });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add market intelligence source', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number, updates: Partial<InsertMarketIntelligenceSource> }) => 
      apiRequest('PATCH', `/api/market-intelligence-sources/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/market-intelligence-sources'] });
      toast({ title: 'Success', description: 'Market intelligence source updated successfully' });
      setEditingSource(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update market intelligence source', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/market-intelligence-sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/market-intelligence-sources'] });
      toast({ title: 'Success', description: 'Market intelligence source deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete market intelligence source', variant: 'destructive' });
    }
  });

  const importStandardSource = (source: MarketDataSource) => {
    const importData: InsertMarketIntelligenceSource = {
      name: source.name,
      type: source.type,
      url: source.url,
      requiresAuth: source.requiresAuth,
      description: source.description,
      dataTypes: source.dataTypes,
      region: source.region,
      isActive: true
    };
    createMutation.mutate(importData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Market Intelligence Platforms</h2>
          <p className="text-muted-foreground">Manage all your market intelligence sources with full edit/delete control</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sourcesLoading ? "..." : dataSources?.totalSources || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Market intelligence platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configured</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sourcesLoading ? "..." : dataSources?.configuredCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              With API keys configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Sources</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sourcesLoading ? "..." : 
                dataSources?.allSources.filter(s => !s.requiresAuth).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              No authentication required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sourcesLoading ? "..." : 
                new Set(dataSources?.allSources.map(s => s.region).filter(Boolean)).size || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Geographic coverage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Managed Market Intelligence Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Your Market Intelligence Sources</CardTitle>
          <CardDescription>Sources you can fully control - add, edit, and remove</CardDescription>
        </CardHeader>
        <CardContent>
          {managedLoading ? (
            <div>Loading managed sources...</div>
          ) : (
            <div className="space-y-3">
              {(managedSources || []).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No custom market intelligence sources yet.</p>
                  <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="mt-2">
                    Add Your First Source
                  </Button>
                </div>
              ) : (
                managedSources?.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{source.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {source.type}
                        </Badge>
                        {source.region && (
                          <Badge variant="outline" className="text-xs">
                            {source.region}
                          </Badge>
                        )}
                        {source.requiresAuth ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-4 w-4 text-green-600" />
                        )}
                        {!source.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(source.dataTypes || []).slice(0, 3).map(type => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSource(source)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(source.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Standard Funding & Analytics Platforms</CardTitle>
            <CardDescription>Import these to make them editable</CardDescription>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div>Loading sources...</div>
            ) : (
              <div className="space-y-3">
                {(dataSources?.allSources || [])
                  .filter(s => s.type === 'funding' || s.type === 'analytics')
                  .filter(source => !managedSources?.some(ms => ms.name === source.name))
                  .map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{source.name}</h4>
                          {source.requiresAuth ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(source.dataTypes || []).slice(0, 3).map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-accent rounded-md transition-colors"
                          title="Visit website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => importStandardSource(source)}
                          title="Import to edit/manage this source"
                          disabled={createMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                {(dataSources?.allSources || [])
                  .filter(s => s.type === 'funding' || s.type === 'analytics')
                  .filter(source => !managedSources?.some(ms => ms.name === source.name)).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    All funding & analytics sources are now being managed
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Standard News & Regional Sources</CardTitle>
            <CardDescription>Import these to make them editable</CardDescription>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div>Loading sources...</div>
            ) : (
              <div className="space-y-3">
                {(dataSources?.allSources || [])
                  .filter(s => s.type === 'news' || s.type === 'regional')
                  .filter(source => !managedSources?.some(ms => ms.name === source.name))
                  .map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{source.name}</h4>
                          {source.region && (
                            <Badge variant="secondary" className="text-xs">
                              {source.region}
                            </Badge>
                          )}
                          {source.requiresAuth ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(source.dataTypes || []).slice(0, 3).map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-accent rounded-md transition-colors"
                          title="Visit website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => importStandardSource(source)}
                          title="Import to edit/manage this source"
                          disabled={createMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                {(dataSources?.allSources || [])
                  .filter(s => s.type === 'news' || s.type === 'regional')
                  .filter(source => !managedSources?.some(ms => ms.name === source.name)).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    All news & regional sources are now being managed
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {dataSources && dataSources.configuredCount === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Keys Required</AlertTitle>
          <AlertDescription>
            To enable real-time data from these platforms, you'll need to configure API keys for services like Crunchbase and Dealroom. 
            Many platforms offer free tier access for developers.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Market Intelligence Source Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Market Intelligence Source</DialogTitle>
            <DialogDescription>
              Add a new market intelligence platform or data source
            </DialogDescription>
          </DialogHeader>
          <MarketIntelligenceSourceForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setIsAddDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Market Intelligence Source Dialog */}
      <Dialog open={!!editingSource} onOpenChange={() => setEditingSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Market Intelligence Source</DialogTitle>
            <DialogDescription>
              Update the market intelligence source information
            </DialogDescription>
          </DialogHeader>
          {editingSource && (
            <MarketIntelligenceSourceForm
              initialData={editingSource}
              onSubmit={(data) => updateMutation.mutate({ id: editingSource.id, updates: data })}
              onCancel={() => setEditingSource(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataSourcesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Sources</h1>
        <p className="text-muted-foreground">
          Manage RSS feeds, APIs, market intelligence platforms, and automation
        </p>
      </div>

      <Tabs defaultValue="feeds" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feeds">RSS Feeds</TabsTrigger>
          <TabsTrigger value="apis">APIs</TabsTrigger>
          <TabsTrigger value="market">Market Intelligence</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="feeds" className="mt-6">
          <RSSFeedsTab />
        </TabsContent>

        <TabsContent value="apis" className="mt-6">
          <APIsTab />
        </TabsContent>

        <TabsContent value="market" className="mt-6">
          <MarketIntelligenceTab />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <AutomationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RSSFeedsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const itemsPerPage = 10;

  const { data: sources = [], isLoading } = useQuery<NewsSource[]>({
    queryKey: ['/api/news-sources'],
  });

  const filteredSources = sources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         source.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || source.type === filterType;
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "active" && source.isActive) ||
                         (filterStatus === "inactive" && !source.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSources = filteredSources.slice(startIndex, startIndex + itemsPerPage);

  const addSourceMutation = useMutation({
    mutationFn: async (newSource: Omit<NewsSource, 'id' | 'isVerified' | 'lastFetched'>) => {
      const response = await apiRequest('POST', '/api/news-sources', newSource);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
      setIsAddDialogOpen(false);
      toast({
        title: "Source added successfully",
        description: "The news source has been added to your collection.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NewsSource> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/news-sources/${id}`, updates);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
      setIsEditDialogOpen(false);
      setEditingSource(null);
      toast({
        title: "Source updated successfully",
        description: "The news source has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/news-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
      toast({
        title: "Source deleted successfully",
        description: "The news source has been removed from your collection.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddSource = (data: any) => {
    const newSource = {
      name: data.name,
      url: data.url,
      type: data.type as 'rss' | 'api',
      purpose: data.purpose as 'dashboard' | 'market-intelligence' | 'both',
      region: data.region,
      category: data.category,
      isActive: data.isActive,
      apiKey: data.apiKey,
      description: data.description,
    };
    addSourceMutation.mutate(newSource);
  };

  const handleUpdateSource = (data: any) => {
    if (!editingSource) return;
    
    const updates = {
      id: editingSource.id,
      name: data.name,
      url: data.url,
      type: data.type as 'rss' | 'api',
      purpose: data.purpose as 'dashboard' | 'market-intelligence' | 'both',
      region: data.region,
      category: data.category,
      isActive: data.isActive,
      apiKey: data.apiKey,
      description: data.description,
    };
    updateSourceMutation.mutate(updates);
  };

  const handleDeleteSource = (id: number) => {
    if (window.confirm("Are you sure you want to delete this source?")) {
      deleteSourceMutation.mutate(id);
    }
  };

  const handleEditSource = (source: NewsSource) => {
    setEditingSource(source);
    setIsEditDialogOpen(true);
  };

  const toggleSourceStatus = (source: NewsSource) => {
    updateSourceMutation.mutate({
      id: source.id,
      isActive: !source.isActive,
    });
  };

  const rssCount = sources.filter(s => s.type === 'rss').length;
  const apiCount = sources.filter(s => s.type === 'api').length;
  const activeCount = sources.filter(s => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">RSS Feeds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rssCount}</div>
            <p className="text-xs text-muted-foreground">News sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">APIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiCount}</div>
            <p className="text-xs text-muted-foreground">Data APIs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="rss">RSS</SelectItem>
              <SelectItem value="api">API</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <AddSourceDialog onSubmit={handleAddSource} onCancel={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading sources...</div>
        ) : paginatedSources.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No sources found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          paginatedSources.map((source) => (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {source.type === 'rss' ? (
                          <Rss className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Globe className="h-4 w-4 text-blue-500" />
                        )}
                        <h3 className="font-medium">{source.name}</h3>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={source.isActive ? "default" : "secondary"}>
                          {source.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{source.type.toUpperCase()}</Badge>
                        <Badge variant="outline">{source.category}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{source.url}</p>
                    {source.description && (
                      <p className="text-xs text-muted-foreground">{source.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.isActive}
                      onCheckedChange={() => toggleSourceStatus(source)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSource(source)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {editingSource && (
            <EditSourceDialog
              source={editingSource}
              onSubmit={handleUpdateSource}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingSource(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function APIsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serpApiStatus, isLoading: serpApiLoading } = useQuery<ApiStatus>({
    queryKey: ['/api/serpapi/status'],
  });

  const collectNewsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/serpapi/collect-news');
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      queryClient.invalidateQueries({ queryKey: ['/api/news-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/company-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market/funding-dashboard'] });
      toast({
        title: "SerpAPI Collection Complete!",
        description: `Processed ${data.articlesCollected || 0} articles (${data.articlesStored || 0} new), extracted ${data.companiesExtracted || 0} companies and ${data.fundingEventsExtracted || 0} funding events`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to collect news",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const collectTrendsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/serpapi/collect-trends');
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/market/technology-trends'] });
      toast({
        title: "Trends Collection Complete!",
        description: data.message || `Collected ${data.trendsCollected || 0} technology trends from Google Trends`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to collect trends",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SerpAPI Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              SerpAPI Status
            </CardTitle>
            <CardDescription>
              Google News and Trends data collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serpApiLoading ? (
              <div className="text-center py-4">Loading status...</div>
            ) : serpApiStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Status:</span>
                  <Badge variant={serpApiStatus.apiKeyValid ? "default" : "destructive"}>
                    {serpApiStatus.status}
                  </Badge>
                </div>
                {serpApiStatus.usage && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Searches Used:</span>
                      <span>{serpApiStatus.usage.searches_used}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Searches Remaining:</span>
                      <span>{serpApiStatus.usage.searches_remaining}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Monthly Limit:</span>
                      <span>{serpApiStatus.usage.searches_limit}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => collectNewsMutation.mutate()}
                    disabled={collectNewsMutation.isPending}
                  >
                    {collectNewsMutation.isPending ? "Collecting..." : "Collect News"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => collectTrendsMutation.mutate()}
                    disabled={collectTrendsMutation.isPending}
                  >
                    {collectTrendsMutation.isPending ? "Collecting..." : "Collect Trends"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Unable to load SerpAPI status
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other APIs placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-500" />
              Other APIs
            </CardTitle>
            <CardDescription>
              Additional data sources and integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4 text-muted-foreground">
              <p>Additional API integrations will be available here.</p>
              <p className="text-sm">Configure NewsAPI, Alpha Vantage, and other services.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AutomationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: automationStatus, isLoading: automationLoading } = useQuery<AutomationStatus>({
    queryKey: ['/api/automation/status'],
  });

  const triggerCollectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/collector/trigger');
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      queryClient.invalidateQueries({ queryKey: ['/api/automation/status'] });
      toast({
        title: "Collection triggered successfully",
        description: `Collected ${data.articlesCollected || 0} articles from all sources`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to trigger collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-500" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure automated data collection schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {automationLoading ? (
            <div className="text-center py-4">Loading automation status...</div>
          ) : automationStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {automationStatus.status}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Run</Label>
                  <p className="text-sm text-muted-foreground">
                    {automationStatus.lastRun ? new Date(automationStatus.lastRun).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Next Run</Label>
                  <p className="text-sm text-muted-foreground">
                    {automationStatus.nextRun ? new Date(automationStatus.nextRun).toLocaleString() : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Automation</Label>
                  <p className="text-sm text-muted-foreground">
                    {automationStatus.isEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={() => triggerCollectionMutation.mutate()}
                  disabled={triggerCollectionMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {triggerCollectionMutation.isPending ? "Collecting..." : "Trigger Collection Now"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Unable to load automation status
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function AddSourceDialog({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'rss',
    purpose: 'dashboard',
    region: 'Global',
    category: 'General',
    isActive: true,
    apiKey: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add New Source</DialogTitle>
        <DialogDescription>
          Add a new RSS feed or API source to your collection.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="url" className="text-right">URL</Label>
          <Input
            id="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as 'rss' | 'api' })}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select source type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rss">RSS Feed</SelectItem>
              <SelectItem value="api">API</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="purpose" className="text-right">Purpose</Label>
          <Select value={formData.purpose} onValueChange={(value) => setFormData({ ...formData, purpose: value as 'dashboard' | 'market-intelligence' | 'both' })}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="market-intelligence">Market Intelligence</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="isActive" className="text-right">Active</Label>
          <Switch 
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Add Source
          </Button>
        </div>
      </div>
    </form>
  );
}

// Market Intelligence Source Form Component
function MarketIntelligenceSourceForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  initialData?: MarketIntelligenceSource; 
  onSubmit: (data: InsertMarketIntelligenceSource) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<InsertMarketIntelligenceSource>({
    name: initialData?.name || '',
    type: initialData?.type || 'funding',
    url: initialData?.url || '',
    apiEndpoint: initialData?.apiEndpoint || '',
    requiresAuth: initialData?.requiresAuth || false,
    description: initialData?.description || '',
    dataTypes: initialData?.dataTypes || [],
    region: initialData?.region || '',
    isActive: initialData?.isActive ?? true,
  });

  const [dataTypesInput, setDataTypesInput] = useState(
    initialData?.dataTypes?.join(', ') || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      dataTypes: dataTypesInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="col-span-3"
          placeholder="e.g., Custom Crunchbase"
          required
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="url" className="text-right">URL</Label>
        <Input
          id="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="col-span-3"
          placeholder="https://example.com"
          type="url"
          required
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="type" className="text-right">Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select source type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="funding">Funding</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="regional">Regional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="apiEndpoint" className="text-right">API Endpoint</Label>
        <Input
          id="apiEndpoint"
          value={formData.apiEndpoint}
          onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
          className="col-span-3"
          placeholder="https://api.example.com/v1"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="region" className="text-right">Region</Label>
        <Input
          id="region"
          value={formData.region}
          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          className="col-span-3"
          placeholder="e.g., Global, MENA, Asia-Pacific"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="dataTypes" className="text-right">Data Types</Label>
        <Input
          id="dataTypes"
          value={dataTypesInput}
          onChange={(e) => setDataTypesInput(e.target.value)}
          className="col-span-3"
          placeholder="funding, startups, investments (comma-separated)"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="col-span-3"
          placeholder="Brief description of the source"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="requiresAuth" className="text-right">Requires Auth</Label>
        <div className="col-span-3 flex items-center space-x-2">
          <Switch 
            id="requiresAuth"
            checked={formData.requiresAuth}
            onCheckedChange={(checked) => setFormData({ ...formData, requiresAuth: checked })}
          />
          <Label htmlFor="requiresAuth" className="text-sm text-muted-foreground">
            Requires API key or authentication
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="isActive" className="text-right">Active</Label>
        <div className="col-span-3 flex items-center space-x-2">
          <Switch 
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label htmlFor="isActive" className="text-sm text-muted-foreground">
            Enable this source
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update Source" : "Add Source"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default DataSourcesPage;
