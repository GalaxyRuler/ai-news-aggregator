import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NewsFilter, NewsSummary } from "@/lib/types";

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: NewsFilter["category"]) => void;
  summary?: NewsSummary;
}

export function CategoryTabs({ activeCategory, onCategoryChange, summary }: CategoryTabsProps) {
  const categories = [
    { id: "all", label: "All News", count: summary?.totalArticles || 0 },
    { id: "startups", label: "Startups", count: summary?.categoryBreakdown?.startups || 0 },
    { id: "research", label: "Research", count: summary?.categoryBreakdown?.research || 0 },
    { id: "use-cases", label: "Use Cases", count: summary?.categoryBreakdown?.["use-cases"] || 0 },
    { id: "releases", label: "Releases", count: summary?.categoryBreakdown?.releases || 0 },
    { id: "tools", label: "Tools", count: summary?.categoryBreakdown?.tools || 0 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-3">
      <nav className="flex space-x-4 px-4" aria-label="Tabs">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            className={`border-b-2 py-2 px-1 text-xs font-medium rounded-none ${
              activeCategory === category.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => onCategoryChange(category.id as NewsFilter["category"])}
          >
            {category.label}
            <Badge 
              className={`ml-1 text-[10px] px-1 ${
                activeCategory === category.id 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {category.count}
            </Badge>
          </Button>
        ))}
      </nav>
    </div>
  );
}
