import { analyzeNewsArticle } from "./services/openai.js";

async function testAnalysis() {
  console.log("Testing OpenAI analysis with a known AI article...");
  
  const testTitle = "Gemini 2.5: Updates to our family of thinking models";
  const testContent = "Google DeepMind announces major updates to Gemini 2.5, their latest family of AI models with enhanced reasoning capabilities. The new models feature improved performance on complex tasks and better understanding of context.";
  
  try {
    const result = await analyzeNewsArticle(testTitle, testContent);
    console.log("Analysis result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Analysis failed:", error);
  }
}

testAnalysis();