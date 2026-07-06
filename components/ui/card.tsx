import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "sm" | "md" | "lg";
};

const PADDING = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

export function Card({ padding = "md", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900",
        PADDING[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
