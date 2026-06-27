"use client";

/**
 * TelegramTheme — Telegram Web App theme adapter.
 *
 * Reads Telegram.WebApp.themeParams and maps them to CSS custom properties
 * on :root so the rest of the app can use var(--tg-*) without polluting
 * every component with Telegram-specific logic.
 *
 * Also calls WebApp.ready() + WebApp.expand() to signal the app is loaded
 * and request full-screen mode inside the Telegram client.
 *
 * Safe in non-Telegram environments: checks window.Telegram before calling.
 */

import { useEffect, useState } from "react";

// ── Telegram Web App global type ──────────────────────────────────────────────

interface TgThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TgWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme: "dark" | "light";
  backgroundColor: string;
  headerColor: string;
  themeParams: TgThemeParams;
  isExpanded: boolean;
  initData?: string;
  viewportHeight: number;
  viewportStableHeight: number;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

// ── CSS variable mapping ──────────────────────────────────────────────────────

function applyTgTheme(params: TgThemeParams, scheme: "dark" | "light") {
  const root = document.documentElement;

  const set = (name: string, value: string | undefined) => {
    if (value) root.style.setProperty(name, value);
  };

  set("--tg-bg",             params.bg_color ?? (scheme === "dark" ? "#000000" : "#ffffff"));
  set("--tg-bg-secondary",   params.secondary_bg_color);
  set("--tg-text",           params.text_color);
  set("--tg-hint",           params.hint_color);
  set("--tg-link",           params.link_color);
  set("--tg-btn",            params.button_color);
  set("--tg-btn-text",       params.button_text_color);
  set("--tg-header-bg",      params.header_bg_color);
  set("--tg-accent",         params.accent_text_color);
  set("--tg-section-bg",     params.section_bg_color);
  set("--tg-destructive",    params.destructive_text_color);

  // Mark the colour scheme so Tailwind dark: variants match
  root.setAttribute("data-tg-scheme", scheme);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TelegramTheme() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Signal ready and request full viewport
    tg.ready();
    if (!tg.isExpanded) tg.expand();

    // Apply initial theme
    applyTgTheme(tg.themeParams, tg.colorScheme);

    // Re-apply when user switches Telegram theme
    const handler = () => applyTgTheme(tg.themeParams, tg.colorScheme);
    tg.onEvent("themeChanged", handler);

    return () => tg.offEvent("themeChanged", handler);
  }, []);

  return null;
}

// ── Utility hook ──────────────────────────────────────────────────────────────

/** Returns true when running inside Telegram (client-side only). */
export function useIsTelegram(): boolean {
  const [inside, setInside] = useState(false);

  useEffect(() => {
    setInside(Boolean(window.Telegram?.WebApp));
  }, []);

  return inside;
}
