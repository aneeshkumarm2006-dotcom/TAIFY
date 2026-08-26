import {
  Bot,
  Code2,
  Image as ImageIcon,
  Clapperboard,
  AudioLines,
  Microscope,
  PenTool,
  GraduationCap,
  Zap,
  BarChart3,
  PenLine,
  Megaphone,
  Building2,
  ShoppingBag,
  TrendingUp,
  Headphones,
  Scale,
  Landmark,
  UserCheck,
  Share2,
  Shirt,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

/**
 * Keyed by category **id**, not by public slug, so renaming a category for SEO
 * can never silently drop its icon back to the generic sparkle.
 */
const MAP: Record<string, LucideIcon> = {
  chatbot: Bot,
  coding: Code2,
  image: ImageIcon,
  video: Clapperboard,
  audio: AudioLines,
  research: Microscope,
  design: PenTool,
  education: GraduationCap,
  productivity: Zap,
  data: BarChart3,
  writing: PenLine,
  marketing: Megaphone,
  "real-estate": Building2,
  ecommerce: ShoppingBag,
  fashion: Shirt,
  health: Stethoscope,
  sales: TrendingUp,
  support: Headphones,
  legal: Scale,
  finance: Landmark,
  hr: UserCheck,
  social: Share2,
};

export function categoryIcon(id: string): LucideIcon {
  return MAP[id] ?? Sparkles;
}
