import "server-only";
import { settingsCollection } from "@/lib/db/mongo";
import { TOOL_COUNT_TOKEN } from "@/lib/ticker";

export interface SiteSettings {
  tickerEnabled: boolean;
  tickerMessages: string[];
  tickerSpeed: number; // seconds per full loop
}

export const DEFAULT_SETTINGS: SiteSettings = {
  tickerEnabled: true,
  tickerMessages: [
    "🚀 New - AI Match finds your perfect tool in seconds",
    `✅ ${TOOL_COUNT_TOKEN}+ AI tools, verified daily with honest pricing`,
    "📈 Read the blog: Best AI Tools for Maths, Science & Coding",
    "🛠️ Submit your AI tool - free basic listing",
  ],
  tickerSpeed: 30,
};


export async function getSiteSettings(): Promise<SiteSettings> {
  const col = await settingsCollection();
  if (!col) return DEFAULT_SETTINGS;
  const doc = (await col.findOne({ key: "site" })) as Partial<SiteSettings> | null;
  if (!doc) return DEFAULT_SETTINGS;
  return {
    tickerEnabled: doc.tickerEnabled ?? DEFAULT_SETTINGS.tickerEnabled,
    tickerMessages:
      Array.isArray(doc.tickerMessages) && doc.tickerMessages.length
        ? doc.tickerMessages
        : DEFAULT_SETTINGS.tickerMessages,
    tickerSpeed: doc.tickerSpeed ?? DEFAULT_SETTINGS.tickerSpeed,
  };
}
