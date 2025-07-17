import { InsertNewsArticle } from "@shared/schema.js";

/**
 * Removes duplicate articles based on URL and title similarity
 * Uses fuzzy matching to catch articles with minor title variations
 */
export function removeDuplicateArticles(articles: InsertNewsArticle[]): InsertNewsArticle[] {
  const unique: InsertNewsArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  
  for (const article of articles) {
    // Check for exact URL duplicates first
    if (article.sourceUrl && seenUrls.has(article.sourceUrl)) {
      continue;
    }
    
    // Create normalized title for similarity detection
    const normalizedTitle = article.title.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
    
    // Check for title similarity (allows for minor variations)
    const titleWords = normalizedTitle.split(' ').filter(word => word.length > 2);
    const titleKey = titleWords.slice(0, 8).join(' '); // Use first 8 meaningful words
    
    // Skip if we've seen this URL or very similar title
    if (seenTitles.has(titleKey)) {
      console.log(`Skipping duplicate: ${article.title.substring(0, 60)}...`);
      continue;
    }
    
    // Check for fuzzy title matches (70% word overlap)
    let isDuplicate = false;
    for (const existingKey of seenTitles) {
      const existingWords = existingKey.split(' ');
      const commonWords = titleWords.filter(word => existingWords.includes(word));
      const similarity = commonWords.length / Math.max(titleWords.length, existingWords.length);
      
      if (similarity > 0.7) {
        console.log(`Skipping similar article (${Math.round(similarity * 100)}% match): ${article.title.substring(0, 60)}...`);
        isDuplicate = true;
        break;
      }
    }
    
    if (isDuplicate) {
      continue;
    }
    
    // Add to unique collection
    unique.push(article);
    if (article.sourceUrl) {
      seenUrls.add(article.sourceUrl);
    }
    seenTitles.add(titleKey);
  }
  
  return unique;
}

/**
 * Filters out articles with RSS feed URLs as source URLs
 * Ensures only proper article URLs are kept
 */
export function filterValidArticleUrls(articles: InsertNewsArticle[]): InsertNewsArticle[] {
  return articles.filter(article => {
    if (!article.sourceUrl) return false;
    
    const url = article.sourceUrl;
    const hasValidUrl = url.startsWith('http') && 
      !url.includes('/rss') && 
      !url.includes('/feed') && 
      !url.includes('.rss') && 
      !url.includes('.xml') &&
      !url.includes('feeds.') &&
      !url.includes('category/');
    
    if (!hasValidUrl) {
      console.log(`Filtering out article with RSS/feed URL: ${article.title.substring(0, 50)}...`);
      return false;
    }
    
    return true;
  });
}