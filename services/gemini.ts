import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { NAYLA_SYSTEM_INSTRUCTION, ARUNA_VOICE_NAME } from "../constants";

export function getGeminiApiKey(): string {
  const metaEnvKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  return metaEnvKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "";
}

export class ArunaService {
  private ai: GoogleGenAI;
  private chat: Chat;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    this.chat = this.createChat("gemini-3.1-pro-preview");
  }

  private createChat(model: string): Chat {
    return this.ai.chats.create({
      model,
      config: {
        systemInstruction: NAYLA_SYSTEM_INSTRUCTION,
        temperature: 0.75,
        topP: 0.9,
        topK: 40,
      },
    });
  }

  async sendMessage(message: string) {
    try {
      const response = await this.chat.sendMessage({ message });
      return response.text;
    } catch (error) {
      console.warn("Primary model error, retrying with gemini-flash-latest:", error);
      this.chat = this.createChat("gemini-flash-latest");
      const fallbackResponse = await this.chat.sendMessage({ message });
      return fallbackResponse.text;
    }
  }

  async *sendMessageStream(message: string) {
    try {
      const stream = await this.chat.sendMessageStream({ message });
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      console.warn("Primary stream model error, retrying with gemini-flash-latest:", error);
      this.chat = this.createChat("gemini-flash-latest");
      const fallbackStream = await this.chat.sendMessageStream({ message });
      for await (const chunk of fallbackStream) {
        yield chunk;
      }
    }
  }

  async generateFriendlySpeech(rawText: string): Promise<string | null> {
    const cleanText = rawText
      .replace(/```[\s\S]*?```/g, " kode program ")
      .replace(/\$\$[\s\S]*?\$\$/g, " rumus matematika ")
      .replace(/\$[^$]*\$/g, " rumus ")
      .replace(/[*#_~`>]/g, "")
      .trim()
      .slice(0, 900);

    if (!cleanText) return null;

    const ttsPrompt = `Ucapkan dengan nada suara Aruna yang sangat ramah, lembut, hangat, manis, dan penuh perhatian: ${cleanText}`;

    const ttsModels = ["gemini-2.5-flash-preview-tts", "gemini-3.8-flash-lite-tts"];

    for (const modelName of ttsModels) {
      try {
        const response = await this.ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: ttsPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: ARUNA_VOICE_NAME },
              },
            },
          },
        });

        const base64Audio =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return base64Audio;
        }
      } catch (err) {
        console.warn(`TTS model ${modelName} fallback:`, err);
      }
    }

    return null;
  }
}

export const naylaService = new ArunaService();
