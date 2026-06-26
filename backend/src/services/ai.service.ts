import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({
  apiKey: env.openai.apiKey,
});

export class AIService {
  static async extractClauses(text: string) {
    const prompt = `
You are a legal AI assistant. Your ONLY job is to identify and extract clauses from the provided agreement text.
Return the result as structured JSON.
Do not assign outcomes. Do not determine risk. Do not suggest wording. Do not summarize.

Expected JSON Structure:
{
  "clauses": [
    {
      "identifier": "string (e.g. '1.1', 'Termination')",
      "title": "string (e.g. 'Payment Terms')",
      "text": "string (the full text of the clause)"
    }
  ]
}

Agreement Text:
${text}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);
      if (!parsed.clauses || !Array.isArray(parsed.clauses)) {
        throw new Error("Malformed JSON response from OpenAI");
      }

      return parsed.clauses as Array<{ identifier: string; title: string; text: string }>;
    } catch (error) {
      console.error("OpenAI Extraction Error:", error);
      throw new Error("Failed to extract clauses using AI");
    }
  }
}
