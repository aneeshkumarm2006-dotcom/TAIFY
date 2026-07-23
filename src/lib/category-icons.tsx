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
  Sparkles,
  type LucideIcon,
} from "lucide-react";

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
};

export function categoryIcon(slug: string): LucideIcon {
  return MAP[slug] ?? Sparkles;
}
