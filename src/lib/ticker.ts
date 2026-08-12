/**
 * Announcement-ticker copy helpers.
 *
 * Separate from lib/settings.ts because that module is `server-only` (it opens
 * the settings collection) while the admin form documenting this token is a
 * client component.
 */

/**
 * `{tools}` expands to the live catalog count wherever it appears in a ticker
 * message. The banner had been advertising "31+ AI tools" against a catalog of
 * 218 since the number was typed by hand and never revisited — a placeholder is
 * the only version of this that cannot go stale.
 */
export const TOOL_COUNT_TOKEN = "{tools}";

/**
 * Substitute the live catalog count into ticker copy.
 *
 * Also rewrites a hard-typed total in the "31+ AI tools" shape, so a message
 * saved from the admin before the placeholder existed — or by someone who types
 * the number out of habit — still shows the real figure rather than drifting.
 */
export function fillToolCount(message: string, total: number): string {
  return message
    .split(TOOL_COUNT_TOKEN)
    .join(String(total))
    .replace(/\b[\d,]+\+(?= AI tools\b)/gi, `${total}+`);
}
