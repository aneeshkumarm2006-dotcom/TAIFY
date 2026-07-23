import { cn } from "@/lib/utils";

export function LogoTile({
  mark,
  color,
  size = "md",
  className,
}: {
  mark: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = {
    sm: "h-9 w-9 text-[15px] rounded-[10px]",
    md: "h-10 w-10 text-[17px] rounded-[11px]",
    lg: "h-14 w-14 text-[22px] rounded-[14px]",
  }[size];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center font-extrabold tracking-tight text-white",
        dims,
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {mark}
    </span>
  );
}
