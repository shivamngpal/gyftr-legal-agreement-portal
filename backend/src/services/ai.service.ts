import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({
  apiKey: env.openai.apiKey,
});

export class AIService {
  static async extractClauses(text: string) {
    const prompt = `
You are a legal AI assistant. Extract all clauses from the provided agreement text and return structured JSON.

EXTRACTION RULES — follow exactly:
1. Extract only TOP-LEVEL sections/articles (e.g. "1. Definitions", "Article 2 – Payment Terms", "CLAUSE 5 – TERMINATION").
2. Do NOT create separate entries for sub-clauses (1.1, 1.2, a), b), i), ii), etc.). Include them in the parent section's "text" field verbatim.
3. "identifier" = the raw section/article number or label as it appears in the document (e.g. "1", "2", "Article 3", "Clause IV").
4. "title" = the section heading in plain English (e.g. "Definitions", "Scope of Services", "Termination"). Extract it from the document; do not invent it.
5. "text" = the complete verbatim text of the section, including all sub-clauses, exactly as written in the document.
6. Preserve the order clauses appear in the document.
7. Every clause MUST have a non-empty "identifier" and a non-empty "title".

Return ONLY this JSON — no explanation, no markdown:
{
  "clauses": [
    {
      "identifier": "1",
      "title": "Definitions",
      "text": "1. Definitions\\n1.1 \\"Affiliate\\" means ...\\n1.2 \\"Business Day\\" means ..."
    },
    {
      "identifier": "2",
      "title": "Scope of Services",
      "text": "2. Scope of Services\\n2.1 Gyftr shall provide ..."
    }
  ]
}

Agreement Text:
${text}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
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
