import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import type { NewsFilter, NewsSummary } from "@/lib/types";

interface FilterSidebarProps {
  filters: NewsFilter;
  onFiltersChange: (filters: NewsFilter) => void;
  summary?: NewsSummary;
}

export function FilterSidebar({ filters, onFiltersChange, summary }: FilterSidebarProps) {
  const updateFilter = (key: keyof NewsFilter, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleRegion = (region: string, checked: boolean) => {
    const newRegions = checked
      ? [...filters.regions, region]
      : filters.regions.filter(r => r !== region);
    updateFilter("regions", newRegions);
  };

  const regions = [
    { id: "global", label: "Global" },
    { id: "mena", label: "MENA Region" },
    { id: "far-asia", label: "Far Asia" },
    { id: "north-america", label: "North America" },
  ];

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Filters & Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">Search</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-gray-400" />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">Date Range</Label>
          <Select value={filters.dateRange} onValueChange={(value) => updateFilter("dateRange", value)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="48h">Last 48 hours</SelectItem>
              <SelectItem value="week">Last week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence Level */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">Min. Confidence: {filters.confidence}%</Label>
          <div className="px-1">
            <Slider
              value={[filters.confidence]}
              onValueChange={(value) => updateFilter("confidence", value[0])}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        {/* Source Regions */}
        <div>
          <Label className="text-xs font-medium text-gray-600 mb-1 block">Regions</Label>
          <div className="space-y-1">
            {regions.map((region) => (
              <div key={region.id} className="flex items-center space-x-1.5">
                <Checkbox
                  id={region.id}
                  checked={filters.regions.includes(region.id)}
                  onCheckedChange={(checked) => toggleRegion(region.id, checked as boolean)}
                  className="h-3 w-3"
                />
                <Label htmlFor={region.id} className="text-xs cursor-pointer">
                  {region.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Summary */}
        {summary && (
          <div className="border-t pt-3">
            <h3 className="text-xs font-medium text-gray-600 mb-2">Today's Summary</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">{summary.totalArticles}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">High Impact</span>
                <span className="font-medium text-green-600">{summary.highConfidence}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Breaking</span>
                <span className="font-medium text-red-600">{summary.breakingNews}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
