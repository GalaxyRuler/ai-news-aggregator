import { memo, useCallback, useMemo } from 'react';
import { EnhancedNewsCard } from './enhanced-news-card';
import { NewsArticle } from '@shared/schema';
import { VirtualScroll } from './virtual-scroll';

interface OptimizedNewsListProps {
  articles: NewsArticle[];
  onShare?: (article: NewsArticle) => void;
  onSave?: (article: NewsArticle) => void;
  virtualScrolling?: boolean;
}

// Memoize individual news cards to prevent unnecessary re-renders
const MemoizedNewsCard = memo(({ 
  article, 
  onShare, 
  onSave 
}: { 
  article: NewsArticle; 
  onShare?: (article: NewsArticle) => void;
  onSave?: (article: NewsArticle) => void;
}) => (
  <EnhancedNewsCard 
    article={article} 
    onShare={onShare} 
    onSave={onSave} 
  />
), (prevProps, nextProps) => {
  // Only re-render if article ID changes
  return prevProps.article.id === nextProps.article.id;
});

export function OptimizedNewsList({ 
  articles, 
  onShare, 
  onSave,
  virtualScrolling = false 
}: OptimizedNewsListProps) {
  
  // Memoize callbacks to prevent child re-renders
  const handleShare = useCallback((article: NewsArticle) => {
    onShare?.(article);
  }, [onShare]);
  
  const handleSave = useCallback((article: NewsArticle) => {
    onSave?.(article);
  }, [onSave]);
  
  // Group articles by category for better performance
  const groupedArticles = useMemo(() => {
    return articles.reduce((acc, article) => {
      const category = article.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(article);
      return acc;
    }, {} as Record<string, NewsArticle[]>);
  }, [articles]);
  
  const renderArticle = useCallback((article: NewsArticle) => (
    <MemoizedNewsCard
      key={article.id}
      article={article}
      onShare={handleShare}
      onSave={handleSave}
    />
  ), [handleShare, handleSave]);
  
  if (virtualScrolling && articles.length > 20) {
    // Use virtual scrolling for large lists
    return (
      <VirtualScroll
        items={articles}
        itemHeight={300} // Approximate height of news card
        containerHeight={window.innerHeight - 200} // Adjust based on your layout
        renderItem={(article) => renderArticle(article)}
      />
    );
  }
  
  // Regular rendering for smaller lists
  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <MemoizedNewsCard
          key={article.id}
          article={article}
          onShare={handleShare}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}