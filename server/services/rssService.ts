import { InsertNewsArticle } from "@shared/schema.js";
import { analyzeNewsArticle } from "./openai.js";
import { translateTitleToEnglish } from "./translationService.js";
import { cacheService } from "./cacheService.js";

function decodeHtmlEntities(text: string): string {
  let decoded = text;
  
  // Common HTML entities
  decoded = decoded.replace(/&amp;/g, '&');
  decoded = decoded.replace(/&lt;/g, '<');
  decoded = decoded.replace(/&gt;/g, '>');
  decoded = decoded.replace(/&quot;/g, '"');
  decoded = decoded.replace(/&apos;/g, "'");
  decoded = decoded.replace(/&#39;/g, "'");
  decoded = decoded.replace(/&nbsp;/g, ' ');
  
  // Common punctuation entities
  decoded = decoded.replace(/&#8211;/g, '–'); // en dash
  decoded = decoded.replace(/&#8212;/g, '—'); // em dash
  decoded = decoded.replace(/&#8216;/g, "'"); // left single quote
  decoded = decoded.replace(/&#8217;/g, "'"); // right single quote
  decoded = decoded.replace(/&#8220;/g, '"'); // left double quote
  decoded = decoded.replace(/&#8221;/g, '"'); // right double quote
  decoded = decoded.replace(/&#8230;/g, '…'); // ellipsis
  decoded = decoded.replace(/&mdash;/g, '—');
  decoded = decoded.replace(/&ndash;/g, '–');
  decoded = decoded.replace(/&ldquo;/g, '"');
  decoded = decoded.replace(/&rdquo;/g, '"');
  decoded = decoded.replace(/&lsquo;/g, "'");
  decoded = decoded.replace(/&rsquo;/g, "'");
  decoded = decoded.replace(/&hellip;/g, '…');
  
  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });
  
  // Handle hex entities
  decoded = decoded.replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
}

async function fetchFullArticleContent(url: string): Promise<string | null> {
  try {
    console.log(`Fetching full content from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Extract text content from HTML using simple regex patterns
    // Remove script and style tags
    let cleanedHtml = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<style[^>]*>.*?<\/style>/gi, '');
    
    // Extract content from common article containers
    const articlePatterns = [
      /<article[^>]*>(.*?)<\/article>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<main[^>]*>(.*?)<\/main>/gi,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>(.*?)<\/div>/gi
    ];

    let extractedContent = '';
    for (const pattern of articlePatterns) {
      const matches = cleanedHtml.match(pattern);
      if (matches && matches[0]) {
        extractedContent = matches[0];
        break;
      }
    }

    if (!extractedContent) {
      // Fallback: extract content from body
      const bodyMatch = cleanedHtml.match(/<body[^>]*>(.*?)<\/body>/gi);
      extractedContent = bodyMatch ? bodyMatch[0] : cleanedHtml;
    }

    // Remove HTML tags and clean up text
    let textContent = extractedContent.replace(/<[^>]*>/g, ' ');
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Decode HTML entities
    textContent = decodeHtmlEntities(textContent);
    
    // Limit content length for AI analysis (keep first 4000 characters)
    const maxLength = 4000;
    if (textContent.length > maxLength) {
      textContent = textContent.substring(0, maxLength) + '...';
    }

    console.log(`Extracted ${textContent.length} characters from ${url}`);
    return textContent.length > 100 ? textContent : null;
    
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return null;
  }
}

interface RSSItem {
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  source?: string;
}

export async function fetchRSSFeed(url: string, sourceName: string): Promise<InsertNewsArticle[]> {
  try {
    console.log(`Fetching RSS feed from ${sourceName}: ${url}`);
    
    // For RSS feeds, we'll make HTTP requests and parse XML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI-News-Aggregator/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      console.log(`RSS feed ${sourceName} returned ${response.status}, skipping`);
      return [];
    }

    const xmlText = await response.text();
    const articles = parseRSSXML(xmlText, sourceName);
    
    console.log(`Found ${articles.length} articles from ${sourceName}`);
    
    // Process each article
    const processedArticles: InsertNewsArticle[] = [];
    for (const item of articles.slice(0, 3)) { // Limit to 3 articles per source
      try {
        const processedArticle = await processRSSItem(item, sourceName);
        if (processedArticle) {
          processedArticles.push(processedArticle);
        }
      } catch (error) {
        console.error(`Failed to process article from ${sourceName}:`, error);
      }
    }
    
    return processedArticles;
  } catch (error) {
    console.error(`Failed to fetch RSS from ${sourceName}:`, error);
    return [];
  }
}

function parseRSSXML(xmlText: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  try {
    // Parse individual <item> or <entry> elements for proper RSS/Atom feeds
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || 
                       xmlText.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
    
    console.log(`Found ${itemMatches.length} items in ${sourceName} RSS feed`);
    
    for (let i = 0; i < Math.min(itemMatches.length, 5); i++) {
      const itemXml = itemMatches[i];
      
      // Extract title
      const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() : '';
      
      // Extract link - handle various RSS formats
      let link = '';
      const linkMatch = itemXml.match(/<link[^>]*>(.*?)<\/link>/i) || 
                       itemXml.match(/<link[^>]*href=["'](.*?)["'][^>]*>/i) ||
                       itemXml.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i);
      
      if (linkMatch) {
        link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        // Clean up any remaining XML artifacts
        link = link.replace(/^[^h]*?(https?:\/\/)/, '$1');
        link = link.split(' ')[0]; // Take first URL if multiple
      }
      
      // Extract description/content
      const descMatch = itemXml.match(/<description[^>]*>(.*?)<\/description>/i) ||
                       itemXml.match(/<content[^>]*>(.*?)<\/content>/i) ||
                       itemXml.match(/<summary[^>]*>(.*?)<\/summary>/i);
      const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() : '';
      
      // Extract publication date
      const dateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i) ||
                       itemXml.match(/<published[^>]*>(.*?)<\/published>/i) ||
                       itemXml.match(/<updated[^>]*>(.*?)<\/updated>/i);
      const pubDate = dateMatch ? dateMatch[1].trim() : '';
      
      // Only add if we have both title and a valid HTTP link that's not an RSS feed
      const isValidArticleLink = title && link && link.startsWith('http') && 
        !link.includes('/rss') && 
        !link.includes('/feed') && 
        !link.includes('.rss') && 
        !link.includes('.xml') &&
        !link.includes('feeds.') &&
        !link.includes('/category/') &&
        !link.endsWith('/rss/current') &&
        !link.match(/feeds?\./);

      if (isValidArticleLink) {
        items.push({
          title: decodeHtmlEntities(title),
          description: decodeHtmlEntities(description),
          link,
          pubDate,
          source: sourceName
        });
        console.log(`Parsed article: ${title.substring(0, 50)}... -> ${link}`);
      } else {
        console.log(`Skipping invalid/RSS item from ${sourceName}: title="${title?.substring(0, 30)}" link="${link}"`);
      }
    }
  } catch (error) {
    console.error(`Failed to parse RSS XML from ${sourceName}:`, error);
  }
  
  console.log(`Successfully parsed ${items.length} articles from ${sourceName}`);
  return items;
}

async function processRSSItem(item: RSSItem, sourceName: string): Promise<InsertNewsArticle | null> {
  try {
    if (!item.title || !item.link) {
      return null;
    }

    // Check if article has already been processed
    if (cacheService.isArticleProcessed(item.link)) {
      console.log(`Skipping already processed article: ${item.title.substring(0, 50)}...`);
      return null;
    }

    // Decode HTML entities in title and description
    const cleanTitle = decodeHtmlEntities(item.title);
    const cleanDescription = item.description ? decodeHtmlEntities(item.description) : '';

    // Translate non-English titles to English
    const translationResult = await translateTitleToEnglish(cleanTitle);
    const finalTitle = translationResult.translatedTitle;
    
    if (translationResult.wasTranslated) {
      console.log(`Translated title from ${translationResult.detectedLanguage}: "${cleanTitle}" → "${finalTitle}"`);
    }

    // Try to fetch full article content, but don't fail if it doesn't work
    const fullContent = await fetchFullArticleContent(item.link);
    
    // Build content to analyze - prioritize full content, then description, then title
    let contentToAnalyze = '';
    if (fullContent && fullContent.length > 100) {
      contentToAnalyze = fullContent;
    } else if (cleanDescription && cleanDescription.length > 50) {
      // Use RSS description if full content extraction failed
      contentToAnalyze = `${finalTitle}. ${cleanDescription}`;
      console.log(`Using RSS description for analysis (full content extraction failed)`);
    } else {
      // Last resort - just use the title
      contentToAnalyze = finalTitle;
      console.log(`Using only title for analysis (no content available)`);
    }
    
    // Check if we have cached analysis for this article
    let analysis = cacheService.getCachedArticleAnalysis(item.link);
    
    if (!analysis) {
      // Use AI to analyze the article content
      const { analyzeNewsArticle } = await import("./openai.js");
      
      try {
        analysis = await analyzeNewsArticle(finalTitle, contentToAnalyze);
        // Cache the analysis result
        cacheService.cacheArticleAnalysis(item.link, analysis);
      } catch (error) {
        console.error(`OpenAI analysis error for "${cleanTitle}":`, error);
        // Skip this article if OpenAI fails
        return null;
      }
    } else {
      console.log(`Using cached analysis for: ${cleanTitle}`);
    }

    // Log the full analysis for debugging
    console.log(`Analysis for "${cleanTitle}":`, JSON.stringify({
      isAIRelated: analysis.isAIRelated,
      relevanceScore: analysis.relevanceScore,
      category: analysis.category,
      confidence: analysis.confidence
    }));
    
    // Filter out non-AI related articles
    if (!analysis.isAIRelated || analysis.relevanceScore < 60) {
      console.log(`Rejecting article from ${sourceName}: "${cleanTitle}" (isAIRelated: ${analysis.isAIRelated}, relevance: ${analysis.relevanceScore})`);
      return null;
    }
    
    console.log(`Accepting AI article from ${sourceName}: "${cleanTitle}" (relevance: ${analysis.relevanceScore})`)

    return {
      title: finalTitle,
      summary: analysis.summary,
      content: contentToAnalyze,
      url: item.link,
      source: sourceName,
      sourceUrl: item.link,
      category: analysis.category,
      region: "global",
      confidence: Math.max(0, Math.min(100, Number(analysis.confidence))).toFixed(2),
      pros: analysis.pros,
      cons: analysis.cons,
      publishedAt: parseRSSDate(item.pubDate),
      isBreaking: false,
      // Impact Factor Analysis
      impactScore: analysis.impactScore.toString(),
      developmentImpact: analysis.developmentImpact,
      toolsImpact: analysis.toolsImpact,
      marketImpact: analysis.marketImpact,
      timeToImpact: analysis.timeToImpact,
      disruptionLevel: analysis.disruptionLevel,
    };
  } catch (error) {
    console.error(`Failed to process RSS item from ${sourceName}:`, error);
    // Fallback to basic processing if AI analysis fails
    return {
      title: item.title,
      summary: (item.description || item.title).substring(0, 200),
      content: item.description || item.title,
      url: item.link,
      source: sourceName,
      sourceUrl: item.link,
      category: categorizeByTitle(item.title),
      region: "global",
      confidence: "0.65",
      pros: ["RSS source"],
      cons: ["Analysis unavailable"],
      publishedAt: parseRSSDate(item.pubDate),
      isBreaking: false,
      // Default impact factor analysis
      impactScore: "3.0",
      developmentImpact: "Standard AI/tech development news with moderate relevance.",
      toolsImpact: ["General AI tools"],
      marketImpact: "Minor impact on AI market trends.",
      timeToImpact: "short-term",
      disruptionLevel: "low",
    };
  }
}

function categorizeByTitle(title: string): "startups" | "research" | "use-cases" | "releases" | "tools" {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("startup") || titleLower.includes("funding") || titleLower.includes("investment") || titleLower.includes("venture")) {
    return "startups";
  } else if (titleLower.includes("research") || titleLower.includes("study") || titleLower.includes("paper") || titleLower.includes("journal")) {
    return "research";
  } else if (titleLower.includes("release") || titleLower.includes("launch") || titleLower.includes("announce") || titleLower.includes("new")) {
    return "releases";
  } else if (titleLower.includes("tool") || titleLower.includes("platform") || titleLower.includes("software") || titleLower.includes("framework")) {
    return "tools";
  } else {
    return "use-cases";
  }
}

function parseRSSDate(dateString?: string): Date {
  if (!dateString) {
    return new Date();
  }
  
  try {
    // Try parsing various date formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (error) {
    console.error("Failed to parse RSS date:", dateString);
  }
  
  return new Date();
}