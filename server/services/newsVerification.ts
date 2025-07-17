import { InsertNewsArticle } from "@shared/schema";

interface VerificationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  verifiedUrls: string[];
}

// List of known legitimate news domains
const VERIFIED_DOMAINS = [
  'wired.com',
  'techcrunch.com',
  'nature.com',
  'mit.edu',
  'technologyreview.com',
  'stanford.edu',
  'ieee.org',
  'openai.com',
  'anthropic.com',
  'deepmind.com',
  'deepmind.google',
  'blog.google',
  'research.google',
  'ai.meta.com',
  'research.fb.com',
  'microsoft.com',
  'nvidia.com',
  'arxiv.org',
  'papers.nips.cc',
  'proceedings.mlr.press',
  'towardsdatascience.com',
  'huggingface.co',
  'paperswithcode.com',
  'venturebeat.com',
  'theverge.com',
  'arstechnica.com',
  'reuters.com',
  'bloomberg.com',
  'wsj.com',
  'nytimes.com',
  'washingtonpost.com',
  'bbc.com',
  'cnn.com',
  'forbes.com',
  'businessinsider.com',
  'aiethicslab.com',
  'ainowinstitute.org',
  'brookings.edu',
  'partnershiponai.org',
  'analyticsvidhya.com',
  'machinelearningmastery.com',
  'kdnuggets.com',
  'gigazine.net',
  'economymiddleeast.com',
  'berkeley.edu',
  'yale.edu',
  'harvard.edu',
  'cs.stanford.edu',
  'news.harvard.edu',
  'magnitt.com',
  'wamda.com',
  'tahawultech.com',
  'technode.com',
  'nikkei.com',
  'dailynewsegypt.com',
  'bensbites.co',
  'tldrnewsletter.com',
  'therundown.ai',
  'thegradient.pub',
  'ft.com',
  'berkeley.edu',
  'bair.berkeley.edu',
  'analyticsvidhya.com',
  'kdnuggets.com',
  'yale.edu',
  'harvard.edu',
  'cs.stanford.edu',
  'bensbites.co',
  'therundown.ai',
  'tldr.tech',
  // Additional AI/Tech news sources
  'machinelearningmastery.com',
  'tahawultech.com',
  'wamda.com',
  'gizmodo.com',
  'businesstoday.in',
  'indianstartupnews.com',
  'biometricupdate.com',
  'economictimes.indiatimes.com',
  'westislandblog.com',
  'kdnuggets.com',
  'analyticsvidhya.com',
  'bensbites.com',
  'tldr.tech',
  'therundown.ai',
  'technode.com',
  'dealstreetasia.com',
  'krasia.com',
  'techinasia.com',
  'e27.co',
  'nikkei.com',
  'gigazine.net',
  'magnitt.com',
  'dailynewsegypt.com',
  'berkeley.edu',
  'yale.edu',
  'harvard.edu'
];

// Suspicious patterns that indicate potential fake news
const SUSPICIOUS_PATTERNS = [
  /GPT-[5-9]/i,  // Future GPT versions that don't exist yet
  /breakthrough.*AGI/i,
  /revolutionary.*AI.*released/i,
  /AI.*takes over/i,
  /sentient.*AI/i,
  /AI.*consciousness/i,
  /world.*first.*AGI/i,
];

export async function verifyNewsArticle(article: InsertNewsArticle): Promise<VerificationResult> {
  const issues: string[] = [];
  let confidence = 1.0;
  const verifiedUrls: string[] = [];

  // 1. Check for suspicious patterns in title
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(article.title)) {
      issues.push(`Suspicious pattern detected in title: "${article.title}"`);
      confidence -= 0.3;
    }
  }

  // 2. Verify source URLs exist and are from legitimate domains
  const urlsToCheck: string[] = [];
  
  // Check both sourceUrls (array) and sourceUrl (single) for compatibility
  if ((article as any).sourceUrls && (article as any).sourceUrls.length > 0) {
    urlsToCheck.push(...(article as any).sourceUrls);
  } else if ((article as any).sourceUrl) {
    urlsToCheck.push((article as any).sourceUrl);
  } else if (article.url) {
    urlsToCheck.push(article.url);
  }

  if (urlsToCheck.length > 0) {
    for (const url of urlsToCheck) {
      const urlCheck = await verifySourceUrl(url);
      if (!urlCheck.isValid) {
        issues.push(`Invalid source URL: ${url} - ${urlCheck.reason}`);
        confidence -= 0.4;
      } else {
        verifiedUrls.push(url);
      }
    }
  } else {
    issues.push("No source URLs provided");
    confidence -= 0.2;
  }

  // 3. Check if sources match legitimate news organizations
  const sourcesToCheck: string[] = [];
  if ((article as any).sources && (article as any).sources.length > 0) {
    sourcesToCheck.push(...(article as any).sources);
  } else if (article.source) {
    sourcesToCheck.push(article.source);
  }

  for (const source of sourcesToCheck) {
    if (!isLegitimateSource(source)) {
      issues.push(`Questionable source: ${source}`);
      confidence -= 0.1;
    }
  }

  // 4. Check published date reasonableness
  const publishedDate = new Date(article.publishedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 90) {
    issues.push("Article is older than 90 days");
    confidence -= 0.1;
  }

  if (publishedDate > now) {
    issues.push("Article has future publication date");
    confidence -= 0.5;
  }

  // 5. Content quality checks
  if (article.summary && article.summary.length < 50) {
    issues.push("Summary too short for credible news");
    confidence -= 0.1;
  }

  // 6. Cross-reference with known fake news patterns
  if (containsFakeNewsIndicators(article)) {
    issues.push("Contains indicators of potential misinformation");
    confidence -= 0.3;
  }

  const isValid = confidence >= 0.5 && verifiedUrls.length > 0;

  // Add detailed logging for debugging
  console.log(`Verification for "${article.title}":`, {
    confidence: Math.max(0, confidence),
    verifiedUrls: verifiedUrls.length,
    isValid,
    issues,
    source: article.source,
    sourceUrl: (article as any).sourceUrl,
    publishedDate: article.publishedAt
  });

  return {
    isValid,
    confidence: Math.max(0, confidence),
    issues,
    verifiedUrls
  };
}

async function verifySourceUrl(url: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // Parse URL to check domain
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    
    // Check if domain is in our verified list
    const isDomainVerified = VERIFIED_DOMAINS.some(verifiedDomain => 
      domain === verifiedDomain || domain.endsWith('.' + verifiedDomain)
    );

    if (!isDomainVerified) {
      return { isValid: false, reason: `Unverified domain: ${domain}` };
    }

    // Skip URL verification for trusted domains to avoid rate limits
    // Only verify domain is in our whitelist, don't make HTTP requests
    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

function isLegitimateSource(source: string): boolean {
  const legitimateSources = [
    'Wired AI', 'TechCrunch AI', 'Nature Machine Intelligence', 'MIT Technology Review',
    'Stanford HAI', 'IEEE Spectrum', 'Google AI', 'OpenAI', 'DeepMind', 'Anthropic',
    'Microsoft Research', 'Meta AI', 'NVIDIA AI', 'Towards Data Science', 'Hugging Face',
    'Papers With Code', 'VentureBeat AI', 'AI Business News', 'McKinsey AI',
    'The Verge', 'Ars Technica', 'Reuters', 'Bloomberg', 'Wall Street Journal',
    'New York Times', 'Washington Post', 'BBC', 'CNN', 'Forbes', 'Business Insider',
    'AI Ethics Lab', 'AI Now Institute', 'Brookings AI Policy', 'Partnership on AI'
  ];
  
  if (!source || typeof source !== 'string') {
    return false;
  }
  
  return legitimateSources.some(legitSource => 
    source.toLowerCase().includes(legitSource.toLowerCase()) ||
    legitSource.toLowerCase().includes(source.toLowerCase())
  );
}

function containsFakeNewsIndicators(article: InsertNewsArticle): boolean {
  const content = `${article.title} ${article.summary}`.toLowerCase();
  
  const fakeNewsIndicators = [
    'exclusive leak',
    'insider reveals',
    'shocking truth',
    'they don\'t want you to know',
    'breaking: ai becomes sentient',
    'robots take over',
    'end of humanity',
    'ai apocalypse'
  ];

  return fakeNewsIndicators.some(indicator => content.includes(indicator));
}

export async function validateNewsBeforeInsertion(articles: InsertNewsArticle[]): Promise<InsertNewsArticle[]> {
  const validatedArticles: InsertNewsArticle[] = [];

  console.log(`Starting validation of ${articles.length} articles`);

  for (const article of articles) {
    const verification = await verifyNewsArticle(article);
    
    console.log(`Article "${article.title}" validation result:`, {
      isValid: verification.isValid,
      confidence: verification.confidence,
      issues: verification.issues
    });
    
    if (verification.isValid) {
      validatedArticles.push(article);
      console.log(`✓ Accepted article: ${article.title}`);
    } else {
      console.log(`✗ Rejected article: ${article.title} - Issues: ${verification.issues.join(', ')}`);
    }
  }

  console.log(`Validated ${validatedArticles.length} out of ${articles.length} articles`);
  return validatedArticles;
}