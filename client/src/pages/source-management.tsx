import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Trash2, 
  Plus, 
  Edit, 
  Check, 
  X, 
  Globe, 
  Rss, 
  Database, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewsSource {
  id: number;
  name: string;
  type: 'rss' | 'api';
  url: string;
  apiKey?: string;
  isActive: boolean;
  purpose: 'dashboard' | 'market-intelligence' | 'both';
  regions: string[];
  categories: string[];
  createdAt: string;
  lastFetch?: string;
}

interface NewSourceForm {
  name: string;
  type: 'rss' | 'api';
  url: string;
  apiKey: string;
  purpose: 'dashboard' | 'market-intelligence' | 'both';
  regions: string[];
  categories: string[];
}

const defaultRegions = ['global', 'north-america', 'europe', 'asia', 'mena', 'africa', 'latin-america'];
const defaultCategories = ['ai', 'technology', 'startups', 'research', 'funding', 'tools', 'use-cases'];

export default function SourceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [editingSource, setEditingSource] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rss' | 'api'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [newSource, setNewSource] = useState<NewSourceForm>({
    name: '',
    type: 'rss',
    url: '',
    apiKey: '',
    purpose: 'both',
    regions: ['global'],
    categories: ['ai', 'technology']
  });

  const [editFormData, setEditFormData] = useState<NewSourceForm>({
    name: '',
    type: 'rss',
    url: '',
    apiKey: '',
    purpose: 'both',
    regions: [],
    categories: []
  });

  // Fetch news sources
  const { data: sources = [], isLoading } = useQuery<NewsSource[]>({
    queryKey: ['/api/news-sources'],
  });

  // Filter and search sources
  const filteredSources = sources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         source.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || source.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' ? source.isActive : !source.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group sources by type
  const groupedSources = filteredSources.reduce((acc, source) => {
    const key = source.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(source);
    return acc;
  }, {} as Record<string, NewsSource[]>);

  // Pagination
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Add source mutation
  const addSourceMutation = useMutation({
    mutationFn: async (source: NewSourceForm) => {
      return await apiRequest('POST', '/api/news-sources', source);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
      toast({ title: "Source added successfully" });
      setIsAddingSource(false);
      setNewSource({
        name: '',
        type: 'rss',
        url: '',
        apiKey: '',
        purpose: 'both',
        regions: ['global'],
        categories: ['ai', 'technology']
      });
    },
    onError: () => {
      toast({ title: "Failed to add source", variant: "destructive" });
    }
  });

  // Delete source mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/news-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
      toast({ title: "Source deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete source", variant: "destructive" });
    }
  });

  // Toggle source active status mutation
  const toggleSourceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/news-sources/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
    },
    onError: () => {
      toast({ title: "Failed to update source", variant: "destructive" });
    }
  });

  // Update source mutation
  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewSourceForm> }) => {
      return await apiRequest('PATCH', `/api/news-sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-sources'] });
      toast({ title: "Source updated successfully" });
      setEditingSource(null);
    },
    onError: () => {
      toast({ title: "Failed to update source", variant: "destructive" });
    }
  });

  const handleAddSource = () => {
    addSourceMutation.mutate(newSource);
  };

  const handleEditSource = (source: NewsSource) => {
    setEditingSource(source.id);
    setEditFormData({
      name: source.name,
      type: source.type,
      url: source.url,
      apiKey: source.apiKey || '',
      purpose: source.purpose || 'both',
      regions: source.regions,
      categories: source.categories
    });
  };

  const handleUpdateSource = () => {
    if (editingSource) {
      updateSourceMutation.mutate({ id: editingSource, data: editFormData });
    }
  };

  const handleRegionToggle = (region: string) => {
    setNewSource(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setNewSource(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'rss':
        return <Rss className="h-5 w-5 text-orange-500" />;
      case 'api':
        return <Database className="h-5 w-5 text-blue-500" />;
      default:
        return <Globe className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading sources...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">News Source Management</h1>
          <p className="text-muted-foreground">Manage RSS feeds and API sources for news collection</p>
        </div>
        <Button onClick={() => setIsAddingSource(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sources by name or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rss">RSS Feeds</SelectItem>
                <SelectItem value="api">API Sources</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedSources.length} of {filteredSources.length} sources
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{sources.filter(s => s.type === 'rss').length} RSS</Badge>
              <Badge variant="secondary">{sources.filter(s => s.type === 'api').length} APIs</Badge>
              <Badge variant="secondary">{sources.filter(s => s.isActive).length} Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Source Form */}
      {isAddingSource && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New News Source</CardTitle>
            <CardDescription>Configure a new RSS feed or API source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Source Name</Label>
                <Input
                  id="name"
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., TechCrunch AI"
                />
              </div>
              <div>
                <Label htmlFor="type">Source Type</Label>
                <Select value={newSource.type} onValueChange={(value: 'rss' | 'api') => 
                  setNewSource(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rss">RSS Feed</SelectItem>
                    <SelectItem value="api">API Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="url">Source URL</Label>
              <Input
                id="url"
                value={newSource.url}
                onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                placeholder={newSource.type === 'rss' ? 'https://example.com/feed.xml' : 'https://api.example.com/v1/news'}
              />
            </div>

            {newSource.type === 'api' && (
              <div>
                <Label htmlFor="apiKey">API Key (Optional)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={newSource.apiKey}
                  onChange={(e) => setNewSource(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Leave empty to use environment variables"
                />
              </div>
            )}

            <div>
              <Label htmlFor="purpose">Source Purpose</Label>
              <Select 
                value={newSource.purpose} 
                onValueChange={(value: 'dashboard' | 'market-intelligence' | 'both') => 
                  setNewSource(prev => ({ ...prev, purpose: value }))
                }
              >
                <SelectTrigger id="purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard Only</SelectItem>
                  <SelectItem value="market-intelligence">Market Intelligence Only</SelectItem>
                  <SelectItem value="both">Both Dashboard & Market Intelligence</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground mt-1">
                Choose where this source will be used for news collection
              </div>
            </div>

            <div>
              <Label>Regions</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {defaultRegions.map(region => (
                  <Badge
                    key={region}
                    variant={newSource.regions.includes(region) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleRegionToggle(region)}
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {defaultCategories.map(category => (
                  <Badge
                    key={category}
                    variant={newSource.categories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleCategoryToggle(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddSource} disabled={!newSource.name || !newSource.url}>
                <Check className="h-4 w-4 mr-2" />
                Add Source
              </Button>
              <Button variant="outline" onClick={() => setIsAddingSource(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources List */}
      <div className="space-y-4">
        {paginatedSources.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                {filteredSources.length === 0 
                  ? "No sources found matching your filters" 
                  : "No sources to display"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Display sources */}
            {paginatedSources.map((source: NewsSource) => (
              <Card key={source.id}>
                <CardContent className="pt-6">
                  {editingSource === source.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`edit-name-${source.id}`}>Source Name</Label>
                          <Input
                            id={`edit-name-${source.id}`}
                            value={editFormData.name}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-type-${source.id}`}>Source Type</Label>
                          <Select 
                            value={editFormData.type} 
                            onValueChange={(value: 'rss' | 'api') => 
                              setEditFormData(prev => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger id={`edit-type-${source.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rss">RSS Feed</SelectItem>
                              <SelectItem value="api">API Source</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`edit-url-${source.id}`}>Source URL</Label>
                        <Input
                          id={`edit-url-${source.id}`}
                          value={editFormData.url}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                          placeholder={editFormData.type === 'rss' ? 'https://example.com/feed.xml' : 'https://api.example.com/v1/news'}
                        />
                      </div>

                      {editFormData.type === 'api' && (
                        <div>
                          <Label htmlFor={`edit-apiKey-${source.id}`}>API Key</Label>
                          <Input
                            id={`edit-apiKey-${source.id}`}
                            type="password"
                            value={editFormData.apiKey}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Leave empty to keep existing or use environment variables"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor={`edit-purpose-${source.id}`}>Source Purpose</Label>
                        <Select 
                          value={editFormData.purpose} 
                          onValueChange={(value: 'dashboard' | 'market-intelligence' | 'both') => 
                            setEditFormData(prev => ({ ...prev, purpose: value }))
                          }
                        >
                          <SelectTrigger id={`edit-purpose-${source.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dashboard">Dashboard Only</SelectItem>
                            <SelectItem value="market-intelligence">Market Intelligence Only</SelectItem>
                            <SelectItem value="both">Both Dashboard & Market Intelligence</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={handleUpdateSource}
                          disabled={!editFormData.name || !editFormData.url}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSource(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getSourceIcon(source.type)}
                          <div>
                            <h3 className="font-semibold">{source.name}</h3>
                            <p className="text-sm text-muted-foreground">{source.url}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{source.type.toUpperCase()}</Badge>
                              <Badge 
                                variant={source.purpose === 'both' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {source.purpose === 'dashboard' ? 'Dashboard' : 
                                 source.purpose === 'market-intelligence' ? 'Market Intel' : 
                                 'Both'}
                              </Badge>
                              {source.regions.map(region => (
                                <Badge key={region} variant="secondary" className="text-xs">
                                  {region}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${source.id}`} className="text-sm">Active</Label>
                            <Switch
                              id={`active-${source.id}`}
                              checked={source.isActive}
                              onCheckedChange={(checked) => 
                                toggleSourceMutation.mutate({ id: source.id, isActive: checked })
                              }
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSource(source)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSourceMutation.mutate(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {source.lastFetch && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last fetch: {new Date(source.lastFetch).toLocaleString()}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {sources.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No sources configured</h3>
            <p className="text-muted-foreground mb-4">Add your first news source to start collecting articles</p>
            <Button onClick={() => setIsAddingSource(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Source
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}