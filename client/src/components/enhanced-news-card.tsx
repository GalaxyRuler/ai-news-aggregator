import { useState, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VerificationBadge } from "./verification-badge";
import { 
  ExternalLink, 
  Calendar, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Share2,
  Bookmark
} from "lucide-react";

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string | null;
  category: string;
  confidence: string;
  region: string;
  source: string;
  sourceUrl: string;
  url: string;
  pros: string[];
  cons: string[];
  publishedAt: Date;
  createdAt: Date;
  isBreaking: boolean;
  // Impact Factor Analysis
  impactScore: string;
  developmentImpact: string;
  toolsImpact: string[];
  marketImpact: string;
  timeToImpact: string;
  disruptionLevel: string;
}

interface EnhancedNewsCardProps {
  article: NewsArticle;
  onShare?: (article: NewsArticle) => void;
  onSave?: (article: NewsArticle) => void;
}

const getConfidenceExplanation = (confidence: number) => {
  if (confidence >= 0.8) {
    return {
      level: "High",
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      icon: CheckCircle,
      explanation: "Multiple reliable sources, verified facts, consistent reporting across publications"
    };
  } else if (confidence >= 0.6) {
    return {
      level: "Medium",
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      icon: AlertCircle,
      explanation: "Some verification needed, limited sources, or developing story"
    };
  } else {
    return {
      level: "Low",
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      icon: TrendingDown,
      explanation: "Unverified claims, single source, or speculative content"
    };
  }
};

const getCategoryColor = (category: string) => {
  const colors = {
    startups: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    research: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    "use-cases": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    releases: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    tools: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"
  };
  return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
};

function EnhancedNewsCardComponent({ article, onShare, onSave }: EnhancedNewsCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const confidenceScore = parseFloat(article.confidence);
  const confidenceInfo = getConfidenceExplanation(confidenceScore);
  const ConfidenceIcon = confidenceInfo.icon;





  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-white dark:bg-gray-800 w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {article.isBreaking && (
                <Badge variant="destructive" className="animate-pulse">
                  🔴 BREAKING
                </Badge>
              )}
              <Badge className={getCategoryColor(article.category)}>
                {article.category.toUpperCase()}
              </Badge>
              <Badge className={confidenceInfo.color}>
                <ConfidenceIcon className="w-3 h-3 mr-1" />
                {confidenceInfo.level} Confidence
              </Badge>
              <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                <Globe className="w-3 h-3 mr-1" />
                {article.source}
              </Badge>
            </div>
            
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {article.title}
            </CardTitle>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTimeAgo(article.publishedAt)}
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {article.region}
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                {confidenceScore.toFixed(0)}% confidence
              </div>
            </div>
            
            <div className="mb-3">
              <VerificationBadge sourceUrls={[article.sourceUrl]} />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare?.(article)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave?.(article)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border-l-4 border-blue-500">
          <strong className="text-gray-900 dark:text-gray-100 block mb-1">Summary:</strong>
          {article.summary || "No summary available"}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
            >
              {showDetails ? "Hide Details" : "Show Analysis"}
            </Button>
            
            {article.sourceUrl && article.sourceUrl !== '#ai-generated-content' && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
              >
                <a 
                  href={article.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Read Original
                </a>
              </Button>
            )}
            
            {article.sourceUrl === '#ai-generated-content' && (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950"
              >
                <span className="w-3 h-3 mr-1">🤖</span>
                AI Generated
              </Button>
            )}
          </div>
          
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
            <span className="text-gray-500 dark:text-gray-400">Source:</span> {article.sourceUrl ? (
              <a 
                href={article.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline font-semibold ml-1"
              >
                {article.source}
              </a>
            ) : (
              <span className="font-semibold ml-1">{article.source}</span>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Confidence Explanation */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <ConfidenceIcon className="w-4 h-4" />
                Why {confidenceInfo.level} Confidence?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {confidenceInfo.explanation}
              </p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${confidenceScore}%` }}
                />
              </div>
            </div>

            {/* Pros and Cons Analysis */}
            {((article.pros || []).length > 0 || (article.cons || []).length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(article.pros || []).length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Positive Aspects
                    </h4>
                    <ul className="space-y-1">
                      {(article.pros || []).map((pro, index) => (
                        <li key={index} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(article.cons || []).length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Concerns & Risks
                    </h4>
                    <ul className="space-y-1">
                      {(article.cons || []).map((con, index) => (
                        <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Impact Factor Analysis */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Impact Factor Analysis
              </h4>
              
              {/* Impact Score */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overall Impact Score
                  </span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {parseFloat(article.impactScore).toFixed(1)}/10.0
                  </span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(parseFloat(article.impactScore) / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Development Impact */}
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  AI/ML Development Impact
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {article.developmentImpact}
                </p>
              </div>

              {/* Tools Impact */}
              {(article.toolsImpact || []).length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Affected AI Tools & Services
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {(article.toolsImpact || []).map((tool, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Market Impact */}
              <div className="mb-3">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Market Impact
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {article.marketImpact}
                </p>
              </div>

              {/* Time to Impact & Disruption Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Time to Impact
                  </h5>
                  <Badge 
                    className={`text-xs ${
                      article.timeToImpact === 'immediate' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      article.timeToImpact === 'short-term' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}
                  >
                    {article.timeToImpact.replace('-', ' ')}
                  </Badge>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Disruption Level
                  </h5>
                  <Badge 
                    className={`text-xs ${
                      article.disruptionLevel === 'revolutionary' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      article.disruptionLevel === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      article.disruptionLevel === 'moderate' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {article.disruptionLevel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Read Original Button */}
            {article.url && article.url !== '#ai-generated-content' && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Read Original Article
                </Button>
              </div>
            )}
            
            {article.url === '#ai-generated-content' && (
              <div className="mt-4">
                <div className="w-full bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                  <span className="text-purple-700 dark:text-purple-300 text-sm">
                    🤖 This is an AI-generated summary of current trends
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize the component to prevent duplicate renders
export const EnhancedNewsCard = memo(EnhancedNewsCardComponent);