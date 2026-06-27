type PlayButtonProps = {
  size?: "sm" | "md";
};

export function PlayButton({ size = "md" }: PlayButtonProps) {
  return (
    <div
      className={
        size === "sm"
          ? "flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl transition-all duration-300 ease-out group-hover:scale-110"
          : "flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl transition-all duration-300 ease-out group-hover:scale-110"
      }
      aria-hidden
    >
      <span className={size === "sm" ? "ml-0.5 text-sm text-white" : "ml-1 text-lg text-white"}>
        ▶
      </span>
    </div>
  );
}
