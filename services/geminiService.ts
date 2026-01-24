import { GoogleGenAI } from "@google/genai";
import { Sale, Product } from '../types';

export const generateBusinessInsight = async (sales: Sale[], products: Product[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare data summary to save tokens
    const today = new Date().setHours(0,0,0,0);
    const todaySales = sales.filter(s => s.timestamp >= today);
    const lowStock = products.filter(p => p.stock < 10).map(p => p.name);
    
    const summary = {
      totalRevenue: sales.reduce((acc, s) => acc + s.total, 0),
      todayRevenue: todaySales.reduce((acc, s) => acc + s.total, 0),
      totalTransactions: sales.length,
      lowStockItems: lowStock,
    };

    const prompt = `
      As a retail business analyst for easyPOS, analyze this sales summary data:
      ${JSON.stringify(summary)}

      Provide a concise 3-bullet point executive summary.
      1. Comment on sales performance.
      2. Flag urgent inventory issues.
      3. Suggest one actionable marketing or operational tip.
      
      Keep it professional and encouraging. Do not use markdown formatting like bolding, just plain text with bullet points.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights available at this moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights. Please check your internet connection or API configuration.";
  }
};
