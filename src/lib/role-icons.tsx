import { createElement } from "react";
import {
  Stethoscope,
  Gavel,
  School,
  Calculator,
  Briefcase,
  ClipboardList,
  Newspaper,
  PiggyBank,
  Ruler,
  FlaskConical,
  Laptop,
  Mic,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Icon per profession page, keyed by role slug. Mirrors category-icons.tsx.
const MAP: Record<string, LucideIcon> = {
  doctors: Stethoscope,
  lawyers: Gavel,
  teachers: School,
  accountants: Calculator,
  consultants: Briefcase,
  "project-managers": ClipboardList,
  journalists: Newspaper,
  "financial-advisors": PiggyBank,
  architects: Ruler,
  researchers: FlaskConical,
  freelancers: Laptop,
  podcasters: Mic,
};

export function roleIcon(slug: string): LucideIcon {
  return MAP[slug] ?? Sparkles;
}

/**
 * The same lookup as a component.
 *
 * Assigning `const Icon = roleIcon(slug)` in a component body trips
 * react-hooks/static-components — the rule reads it as defining a component
 * during render. Resolving through createElement here keeps the call sites clean
 * and the lookup in one place.
 */
export function RoleIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  return createElement(roleIcon(slug), { className });
}
