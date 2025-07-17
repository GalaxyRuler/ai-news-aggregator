import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TranslationResult {
  originalTitle: string;
  translatedTitle: string;
  wasTranslated: boolean;
  detectedLanguage: string;
}

/**
 * Translates non-English news titles to English using OpenAI GPT-4o
 */
export async function translateTitleToEnglish(title: string): Promise<TranslationResult> {
  try {
    // Skip if title is too short or appears to be English already
    if (title.length < 5 || isLikelyEnglish(title)) {
      return {
        originalTitle: title,
        translatedTitle: title,
        wasTranslated: false,
        detectedLanguage: 'en'
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a news title translator. Analyze the given title and:
1. Detect if it's in English or another language
2. If it's not in English, translate it to clear, natural English
3. Preserve the meaning and context for AI/tech news
4. Return JSON in this exact format: {"detectedLanguage": "language_code", "translatedTitle": "translated text", "wasTranslated": true/false}

Language codes: en=English, zh=Chinese, ja=Japanese, ko=Korean, es=Spanish, fr=French, de=German, ar=Arabic, etc.`
        },
        {
          role: "user",
          content: title
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      originalTitle: title,
      translatedTitle: result.translatedTitle || title,
      wasTranslated: result.wasTranslated || false,
      detectedLanguage: result.detectedLanguage || 'unknown'
    };

  } catch (error) {
    console.error("Translation error:", error);
    // Return original title if translation fails
    return {
      originalTitle: title,
      translatedTitle: title,
      wasTranslated: false,
      detectedLanguage: 'unknown'
    };
  }
}

/**
 * Simple heuristic to check if text is likely English
 */
function isLikelyEnglish(text: string): boolean {
  // Check for common English words and patterns
  const englishPatterns = [
    /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i,
    /\b(AI|artificial intelligence|machine learning|ML|tech|technology)\b/i,
    /^[a-zA-Z0-9\s\-.,!?()'"]+$/  // Only ASCII characters
  ];
  
  // Check for non-Latin scripts (Chinese, Japanese, Arabic, etc.)
  const nonLatinPattern = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\u0600-\u06ff\u0590-\u05ff]/;
  
  if (nonLatinPattern.test(text)) {
    return false; // Definitely not English
  }
  
  // Check if it matches English patterns
  return englishPatterns.some(pattern => pattern.test(text));
}

/**
 * Batch translate multiple titles efficiently
 */
export async function translateTitles(titles: string[]): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize);
    const batchPromises = batch.map(title => translateTitleToEnglish(title));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < titles.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}