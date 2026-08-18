"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  STORY_RINGS,
  findStoryIndex,
  getStoryDurationMs,
  type StoryRing,
  type StorySlide,
} from "@/lib/stories";

type Props = {
  open: boolean;
  startRingId: string | null;
  onClose: () => void;
  onRingSeen?: (ringId: string) => void;
};

const GOLD = "#C9A84C";

function ProgressSegments({
  count,
  activeIndex,
  progress,
}: {
  count: number;
  activeIndex: number;
  progress: number;
}) {
  return (
    <div className="flex gap-1 px-3 pt-3">
      {Array.from({ length: count }, (_, i) => {
        const fill =
          i < activeIndex ? 1 : i === activeIndex ? Math.min(1, progress) : 0;
        return (
          <div
            key={i}
            className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: `${fill * 100}%`,
                boxShadow: i === activeIndex ? `0 0 8px ${GOLD}` : undefined,
                transition:
                  i === activeIndex ? "none" : "width 160ms linear",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function SlideChrome({
  ring,
  slide,
  onCta,
}: {
  ring: StoryRing;
  slide: StorySlide;
  onCta: (href: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/75 to-transparent px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-28">
      <p
        className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: GOLD }}
      >
        {ring.title}
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-white">
        {slide.headline}
      </h2>
      {slide.body ? (
        <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-white/70">
          {slide.body}
        </p>
      ) : null}
      {slide.ctaLabel && slide.ctaHref ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCta(slide.ctaHref!);
          }}
          className="pointer-events-auto mt-5 w-full rounded-2xl py-3.5 text-sm font-bold"
          style={{ background: GOLD, color: "#0A0A0A" }}
        >
          {slide.ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function StoriesViewer({
  open,
  startRingId,
  onClose,
  onRingSeen,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [ringIndex, setRingIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const pausedRef = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!open || !startRingId) return;
    setRingIndex(findStoryIndex(startRingId));
    setSlideIndex(0);
    setProgress(0);
    setPaused(false);
  }, [open, startRingId]);

  const ring = STORY_RINGS[ringIndex] ?? STORY_RINGS[0]!;
  const slide = ring.slides[slideIndex] ?? ring.slides[0]!;
  const duration = getStoryDurationMs(slide);

  const goNext = useCallback(() => {
    onRingSeen?.(ring.id);
    if (slideIndex < ring.slides.length - 1) {
      setSlideIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    if (ringIndex < STORY_RINGS.length - 1) {
      setRingIndex((i) => i + 1);
      setSlideIndex(0);
      setProgress(0);
      return;
    }
    onClose();
  }, [onClose, onRingSeen, ring.id, ring.slides.length, ringIndex, slideIndex]);

  const goPrev = useCallback(() => {
    if (slideIndex > 0) {
      setSlideIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    if (ringIndex > 0) {
      const prev = STORY_RINGS[ringIndex - 1]!;
      setRingIndex((i) => i - 1);
      setSlideIndex(prev.slides.length - 1);
      setProgress(0);
      return;
    }
    setProgress(0);
  }, [ringIndex, slideIndex]);

  // Auto-advance progress
  useEffect(() => {
    if (!open) return;
    setProgress(0);
    let raf = 0;
    const started = performance.now();
    let pausedAt = 0;
    let pausedTotal = 0;

    const tick = (now: number) => {
      if (pausedRef.current) {
        if (!pausedAt) pausedAt = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (pausedAt) {
        pausedTotal += now - pausedAt;
        pausedAt = 0;
      }
      const elapsed = now - started - pausedTotal;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, ringIndex, slideIndex, duration, goNext]);

  // Lock body scroll + Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, goNext, goPrev]);

  const onPointerDown = (e: ReactPointerEvent) => {
    dragStartY.current = e.clientY;
    holdTimer.current = window.setTimeout(() => setPaused(true), 140);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    const startY = dragStartY.current;
    dragStartY.current = null;
    const wasPaused = paused;
    setPaused(false);

    if (startY != null && e.clientY - startY > 90) {
      onClose();
      return;
    }
    if (wasPaused) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.33) goPrev();
    else goNext();
  };

  const handleCta = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="stories"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal
          aria-label="Истории"
        >
          <motion.div
            initial={{ scale: 0.96, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative h-[100dvh] w-full max-w-[420px] overflow-hidden bg-black"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              if (holdTimer.current) window.clearTimeout(holdTimer.current);
              setPaused(false);
            }}
          >
            {/* Ambient gold */}
            <div
              className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-40"
              style={{
                background: `${GOLD}33`,
                filter: "blur(60px)",
              }}
            />

            <AnimatePresence mode="wait">
              <motion.img
                key={`${ring.id}-${slide.id}`}
                src={slide.image}
                alt=""
                initial={{ opacity: 0.4, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" />

            <div className="absolute inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)]">
              <ProgressSegments
                count={ring.slides.length}
                activeIndex={slideIndex}
                progress={progress}
              />
              <div className="mt-3 flex items-center justify-between px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="h-9 w-9 overflow-hidden rounded-full border-2"
                    style={{ borderColor: GOLD }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ring.cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      Round 23
                    </p>
                    <p className="truncate text-[11px] text-white/45">
                      {ring.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="rounded-full bg-black/40 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Invisible tap zones hint for a11y */}
            <div className="pointer-events-none absolute inset-y-24 left-0 w-1/3" />
            <div className="pointer-events-none absolute inset-y-24 right-0 w-2/3" />

            <SlideChrome ring={ring} slide={slide} onCta={handleCta} />

            {paused ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
                Пауза
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
