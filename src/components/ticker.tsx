import { Sparkles } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";

/** Auto-scrolling announcement bar. Controlled from /admin/settings. */
export function Ticker({ settings }: { settings: SiteSettings }) {
  if (!settings.tickerEnabled || settings.tickerMessages.length === 0) return null;

  // Duplicate the messages so the marquee loops seamlessly.
  const items = [...settings.tickerMessages, ...settings.tickerMessages];

  return (
    <div className="ticker group overflow-hidden bg-ink text-ground">
      <div
        className="ticker-track flex w-max items-center"
        style={{ animationDuration: `${settings.tickerSpeed}s` }}
      >
        {items.map((msg, i) => (
          <span
            key={i}
            className="mono inline-flex items-center gap-2.5 whitespace-nowrap px-6 py-2 text-[12px]"
          >
            <Sparkles className="h-3 w-3 text-accent" />
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
