import { storage } from "./storage.js";
import { InsertNewsArticle } from "@shared/schema.js";

const sampleArticles: InsertNewsArticle[] = [
  {
    title: "OpenAI Releases GPT-5 with Revolutionary Multimodal Capabilities",
    summary: "OpenAI announces GPT-5, featuring unprecedented multimodal understanding across text, images, audio, and video with significant improvements in reasoning and factual accuracy.",
    content: "OpenAI has officially unveiled GPT-5, marking a significant leap forward in artificial intelligence capabilities. The new model demonstrates remarkable improvements in multimodal understanding, seamlessly processing and generating content across text, images, audio, and video formats. Key enhancements include a 40% improvement in reasoning tasks, reduced hallucinations through enhanced factual grounding, and the ability to maintain context across much longer conversations. The model also introduces novel capabilities in code generation, scientific reasoning, and creative problem-solving. Industry experts are calling this release a potential inflection point for AI adoption across enterprise applications.",
    url: "https://openai.com/gpt5",
    source: "OpenAI",
    sourceUrl: "https://openai.com/gpt5",
    category: "releases",
    region: "global",
    confidence: "0.92",
    pros: ["Revolutionary multimodal capabilities", "Significant reduction in hallucinations", "Enhanced reasoning abilities"],
    cons: ["High computational requirements", "Potential for increased deepfake creation", "Regulatory concerns"],
    publishedAt: new Date(),
    isBreaking: true,
    impactScore: "8.5",
    developmentImpact: "Revolutionary advancement in multimodal AI capabilities",
    toolsImpact: ["ChatGPT", "API integrations", "Enterprise AI tools"],
    marketImpact: "Potential paradigm shift in AI adoption across industries",
    timeToImpact: "immediate",
    disruptionLevel: "revolutionary"
  },
  {
    title: "Meta Introduces Llama 3.1 with 405B Parameters",
    summary: "Meta's latest large language model Llama 3.1 sets new benchmarks in open-source AI with 405 billion parameters and improved multilingual capabilities.",
    content: "Meta has released Llama 3.1, featuring an unprecedented 405 billion parameters that establish new performance standards for open-source language models. The model demonstrates significant improvements in multilingual understanding, code generation, and mathematical reasoning. Unlike previous versions, Llama 3.1 supports context lengths up to 128K tokens and shows enhanced performance on complex reasoning tasks. The release includes multiple model sizes (8B, 70B, and 405B parameters) to accommodate different computational requirements. Meta emphasizes the model's commitment to open-source AI development and responsible deployment practices.",
    url: "https://ai.meta.com/llama",
    source: "Meta AI",
    sourceUrl: "https://ai.meta.com/llama",
    category: "releases",
    region: "global",
    confidence: "0.89",
    pros: ["Open-source availability", "Multiple model sizes", "Enhanced multilingual support"],
    cons: ["Massive computational requirements", "Potential misuse concerns", "Training data transparency issues"],
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isBreaking: false,
    impactScore: "7.8",
    developmentImpact: "Major advancement in open-source AI capabilities",
    toolsImpact: ["Llama models", "Open-source AI frameworks", "Research platforms"],
    marketImpact: "Increased accessibility of advanced AI capabilities",
    timeToImpact: "short-term",
    disruptionLevel: "high"
  },
  {
    title: "Google DeepMind Achieves Breakthrough in Protein Folding with AlphaFold 3",
    summary: "DeepMind's AlphaFold 3 demonstrates unprecedented accuracy in predicting protein-DNA and protein-RNA interactions, revolutionizing drug discovery.",
    content: "Google DeepMind has announced AlphaFold 3, representing a quantum leap in computational biology. The system achieves remarkable accuracy in predicting how proteins interact with DNA, RNA, and other biomolecules. This breakthrough promises to accelerate drug discovery by enabling researchers to understand complex biological processes at the molecular level. AlphaFold 3 demonstrates 95% accuracy in protein-protein interaction predictions and 87% accuracy for protein-DNA complexes. Pharmaceutical companies are already integrating these capabilities into their research pipelines, potentially reducing drug development timelines from decades to years.",
    url: "https://deepmind.google/alphafold",
    source: "DeepMind",
    sourceUrl: "https://deepmind.google/alphafold",
    category: "research",
    region: "global",
    confidence: "0.94",
    pros: ["Revolutionary drug discovery potential", "Open scientific collaboration", "High prediction accuracy"],
    cons: ["Complex implementation requirements", "Limited to specific protein types", "Computational intensity"],
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isBreaking: false,
    impactScore: "9.2",
    developmentImpact: "Revolutionary breakthrough in computational biology and drug discovery",
    toolsImpact: ["AlphaFold", "Drug discovery platforms", "Molecular modeling tools"],
    marketImpact: "Transformation of pharmaceutical research and development",
    timeToImpact: "short-term",
    disruptionLevel: "revolutionary"
  },
  {
    title: "Anthropic Raises $4 Billion from Amazon in Strategic Partnership",
    summary: "Anthropic secures major funding round led by Amazon, focusing on enterprise AI safety and responsible deployment at scale.",
    content: "Anthropic has completed a $4 billion funding round led by Amazon, marking one of the largest AI investments in 2024. The partnership focuses on developing enterprise-grade AI safety solutions and responsible deployment frameworks. Amazon will integrate Anthropic's Constitutional AI techniques into AWS services, providing customers with safer and more reliable AI systems. The funding will accelerate research into AI alignment, interpretability, and robustness. Anthropic plans to expand its team by 300% and establish new research centers focused on AI safety. The partnership emphasizes building AI systems that are helpful, harmless, and honest.",
    url: "https://anthropic.com/funding",
    source: "Anthropic",
    sourceUrl: "https://anthropic.com/funding",
    category: "startups",
    region: "global",
    confidence: "0.91",
    pros: ["Major funding for AI safety research", "Enterprise AI safety focus", "Amazon cloud integration"],
    cons: ["Concentration of AI power", "Potential vendor lock-in", "Regulatory scrutiny"],
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    isBreaking: false,
    impactScore: "7.5",
    developmentImpact: "Significant advancement in AI safety and enterprise deployment",
    toolsImpact: ["Claude", "AWS AI services", "Constitutional AI frameworks"],
    marketImpact: "Strengthened focus on AI safety in enterprise markets",
    timeToImpact: "short-term",
    disruptionLevel: "high"
  },
  {
    title: "EU Passes Comprehensive AI Act with Global Implications",
    summary: "European Union enacts groundbreaking AI legislation establishing safety standards, transparency requirements, and governance frameworks for AI systems.",
    content: "The European Union has officially passed the AI Act, the world's first comprehensive legislation regulating artificial intelligence systems. The act establishes risk-based classifications for AI applications, with stricter requirements for high-risk systems in healthcare, finance, and law enforcement. Key provisions include mandatory transparency disclosures for foundation models, prohibited uses of AI for social scoring and real-time biometric surveillance, and substantial penalties for non-compliance. The legislation affects any AI system deployed within EU borders, creating global compliance requirements for technology companies. Implementation begins in 2025 with full enforcement by 2027.",
    url: "https://ec.europa.eu/ai-act",
    source: "European Commission",
    sourceUrl: "https://ec.europa.eu/ai-act",
    category: "research",
    region: "global",
    confidence: "0.96",
    pros: ["Clear regulatory framework", "Consumer protection", "Global standard setting"],
    cons: ["Implementation complexity", "Potential innovation barriers", "Compliance costs"],
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    isBreaking: false,
    impactScore: "8.8",
    developmentImpact: "Establishes global standards for AI governance and safety",
    toolsImpact: ["All AI systems", "Foundation models", "Enterprise AI platforms"],
    marketImpact: "Comprehensive regulatory framework affecting global AI deployment",
    timeToImpact: "long-term",
    disruptionLevel: "high"
  },
  {
    title: "NVIDIA Unveils H200 GPU with 141GB HBM3e Memory for AI Training",
    summary: "NVIDIA launches H200 Tensor Core GPU featuring massive memory capacity and bandwidth optimizations for large-scale AI model training.",
    content: "NVIDIA has introduced the H200 Tensor Core GPU, designed specifically for training and inference of large language models. The chip features 141GB of HBM3e memory with 4.8TB/s of memory bandwidth, representing a 40% increase over the previous H100 architecture. The H200 delivers up to 30% better performance on large language model inference workloads while maintaining the same power envelope. Data centers can achieve 2x better performance per dollar on AI training tasks. Major cloud providers including Microsoft Azure, Google Cloud, and AWS are already deploying H200-based instances for enterprise customers.",
    url: "https://nvidia.com/h200",
    source: "NVIDIA",
    sourceUrl: "https://nvidia.com/h200",
    category: "tools",
    region: "global",
    confidence: "0.88",
    pros: ["Massive memory capacity", "Improved performance per watt", "Broad cloud availability"],
    cons: ["Extremely high cost", "Supply chain constraints", "Power requirements"],
    publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    isBreaking: false,
    impactScore: "6.8",
    developmentImpact: "Significant advancement in AI training infrastructure",
    toolsImpact: ["AI training platforms", "Cloud computing services", "Large language models"],
    marketImpact: "Enhanced capabilities for large-scale AI development",
    timeToImpact: "immediate",
    disruptionLevel: "moderate"
  }
];

export async function seedData() {
  console.log("Seeding sample news data...");
  
  try {
    // Add null safety checks for the storage object
    if (!storage) {
      throw new Error("Storage service not available");
    }

    // Validate sample articles before seeding
    const validArticles = sampleArticles.filter(article => {
      if (!article.title || !article.summary || !article.url || !article.source) {
        console.warn(`Skipping invalid article: ${article.title || 'Unknown'}`);
        return false;
      }
      return true;
    });

    if (validArticles.length === 0) {
      throw new Error("No valid articles to seed");
    }

    const articles = await storage.createNewsArticles(validArticles);
    console.log(`Successfully seeded ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error("Error seeding data:", error);
    // Don't re-throw the error to prevent application crashes
    return [];
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData();
}