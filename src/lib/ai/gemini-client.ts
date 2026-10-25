import * as dotenv from "dotenv";

dotenv.config();

export interface LLMMessage {
  role: "user" | "model" | "system";
  content: string;
}

export interface GenerateStructuredOptions {
  systemPrompt?: string;
  userPrompt: string;
  schema?: Record<string, unknown>; // JSON schema
  temperature?: number;
  maxTokens?: number;
}

export class GeminiClient {
  private apiKey: string;
  private primaryModel = "gemini-flash-latest";
  private fallbackModel = "gemini-pro-latest";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateStructured<T>(options: GenerateStructuredOptions): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error("Gemini API key is not configured in .env (GEMINI_API_KEY)");
    }

    // Try primary model first, fall back if needed
    try {
      return await this.callGeminiApi<T>(this.primaryModel, options);
    } catch (err: unknown) {
      console.warn(`[GeminiClient] Primary model ${this.primaryModel} failed, trying fallback ${this.fallbackModel}:`, err);
      return await this.callGeminiApi<T>(this.fallbackModel, options);
    }
  }

  private async callGeminiApi<T>(
    model: string,
    options: GenerateStructuredOptions
  ): Promise<T> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (options.userPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: options.userPrompt }],
      });
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.1, // low temperature for strictly factual outputs
        maxOutputTokens: options.maxTokens ?? 3000,
        responseMimeType: "application/json",
      },
    };

    if (options.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error("No text output returned from Gemini API");
    }

    try {
      const parsed = JSON.parse(textOutput) as T;
      return parsed;
    } catch {
      throw new Error(`Failed to parse Gemini JSON output: ${textOutput}`);
    }
  }
}

export const geminiClient = new GeminiClient();
