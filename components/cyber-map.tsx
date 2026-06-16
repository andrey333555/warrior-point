"use client";

/**
 * CyberMap — Leaflet dark neon map of the Warrior Point gym network.
 *
 * Features:
 * - CartoDB Dark Matter tiles (no API key)
 * - Custom SVG neon markers, colour-coded by GymCategory
 * - Category filter chips: Все / Кузня / Бойцовские / Борцовские
 * - City selector with flyTo animation (active network + expansion targets)
 * - GPS Check-in button — flyTo user position via Geolocation API
 * - Animated GymPopup on marker click
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ACTIVE_GYMS,
  CATEGORY_ACCENT_HEX,
  CATEGORY_LABELS,
  filterGyms,
  type GymCategory,
  type GymEntry,
  type GymFilter,
} from "@/lib/gyms";
import { CITY_REGISTRY, findCityByName, type CityEntry } from "@/lib/cities";
import {
  getBrowserPosition,
  resolveHubFromCoords,
  defaultHubCity,
} from "@/lib/geo";
import { GymPopup } from "./gym-popup";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";

// ── Marker factory ────────────────────────────────────────────────────────────

function makeSvgIcon(leaflet: typeof L, hex: string, size: number): L.DivIcon {
  const cx = size / 2;
  return leaflet.divIcon({
    className: "",
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
           viewBox="0 0 ${size} ${size}"
           style="filter:drop-shadow(0 0 7px ${hex})">
        <circle cx="${cx}" cy="${cx}" r="${cx - 2}"
          fill="none" stroke="${hex}" stroke-width="1.4" opacity="0.35"/>
        <circle cx="${cx}" cy="${cx}" r="${cx - 7}"
          fill="${hex}" fill-opacity="0.15"/>
        <circle cx="${cx}" cy="${cx}" r="5.5"
          fill="${hex}" fill-opacity="0.92"/>
      </svg>`,
    iconSize: [size, size],
    iconAnchor: [cx, cx],
    popupAnchor: [0, -(cx + 4)],
  });
}

/** Blue pulsing dot for GPS location. */
function makeGpsDot(leaflet: typeof L): L.DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"
           style="filter:drop-shadow(0 0 6px #3b82f6)">
        <circle cx="10" cy="10" r="8" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6"
          stroke-width="1.2" opacity="0.5"/>
        <circle cx="10" cy="10" r="4.5" fill="#3b82f6" fill-opacity="0.9"/>
      </svg>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// ── Category filter chips ─────────────────────────────────────────────────────

type CategoryChip = { id: GymCategory | "all"; label: string; hex: string };

const CHIPS: CategoryChip[] = [
  { id: "all",        label: "Все",        hex: "#71717a" },
  { id: "kuznya",     label: "Кузня",      hex: "#22d3ee" },
  { id: "fight_club", label: "Бойцовские", hex: "#22d3ee" },
  { id: "wrestling",  label: "Борцовские", hex: "#e879f9" },
];

// ── GPS state ─────────────────────────────────────────────────────────────────

type GpsState = "idle" | "loading" | "success" | "error";

const GPS_TOOLTIP: Record<GpsState, string> = {
  idle:    "Моё местоположение",
  loading: "Определяю…",
  success: "Ты на карте",
  error:   "GPS недоступен",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CyberMap({
  clientId,
  onBooked,
}: {
  clientId?: string;
  onBooked?: (msg: string) => void;
} = {}) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const gpsMarker  = useRef<L.Marker | null>(null);

  const [selectedGym,     setSelectedGym]     = useState<GymEntry | null>(null);
  const [activeCategory,  setActiveCategory]   = useState<GymCategory | "all">("all");
  const [activeCity,      setActiveCity]       = useState<string | null>(null);
  const [gpsState,        setGpsState]         = useState<GpsState>("idle");
  const [cityOpen,        setCityOpen]         = useState(false);
  const [geoEcho,         setGeoEcho]          = useState<string | null>(null);
  const [mapReady,        setMapReady]         = useState(false);
  const autoGeoDone       = useRef(false);

  const filter: GymFilter = useMemo(
    () => ({
      category: activeCategory === "all" ? null : activeCategory,
      city: activeCity,
    }),
    [activeCategory, activeCity],
  );

  const visibleIds = useMemo(
    () => new Set(filterGyms(ACTIVE_GYMS, filter).map((g) => g.id)),
    [filter],
  );

  const flyToCity = useCallback((city: CityEntry, zoom?: number) => {
    leafletMap.current?.flyTo(
      [city.lat, city.lng],
      zoom ?? city.zoom,
      { animate: true, duration: 1.2 },
    );
  }, []);

  const applyHub = useCallback(
    (city: CityEntry, opts: { filter?: boolean; echo?: string } = {}) => {
      const { filter = true, echo } = opts;
      if (filter) {
        const hasActiveGyms = ACTIVE_GYMS.some((g) => g.city === city.name);
        setActiveCity(hasActiveGyms ? city.name : null);
      }
      flyToCity(city);
      if (echo) {
        setGeoEcho(echo);
        setTimeout(() => setGeoEcho(null), 3500);
      }
    },
    [flyToCity],
  );

  // ── Init Leaflet (once) ───────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    let aborted = false;
    let map: L.Map | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;

      if (aborted || !mapRef.current) return;

      // Clear any leftover _leaflet_id from a previous hot-reload cycle
      const container = mapRef.current as HTMLDivElement & { _leaflet_id?: unknown };
      if (container._leaflet_id !== undefined) {
        delete container._leaflet_id;
      }

      map = L.map(mapRef.current, {
        center: [44.95, 38.2],
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });

      if (aborted) { map.remove(); return; }
      leafletMap.current = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 19, attribution: "&copy; OSM &copy; CARTO" },
      ).addTo(map);

      L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);

      ACTIVE_GYMS.forEach((gym) => {
        const hex    = CATEGORY_ACCENT_HEX[gym.category];
        const icon   = makeSvgIcon(L, hex, 36);
        const marker = L.marker([gym.lat, gym.lng], { icon });
        marker.addTo(map!);
        markersRef.current.set(gym.id, marker);

        marker.on("click", () => {
          setSelectedGym(gym);
        });
      });

      map.on("click", () => { setSelectedGym(null); });

      setMapReady(true);
    })();

    return () => {
      aborted = true;
      map?.remove();
      leafletMap.current = null;
      markersRef.current.clear();
      gpsMarker.current = null;
    };
  }, []);

  // ── Auto-geolocation on first open ────────────────────────────────────────

  useEffect(() => {
    if (!mapReady || !leafletMap.current || autoGeoDone.current) return;
    autoGeoDone.current = true;

    void (async () => {
      setGpsState("loading");
      try {
        const pos = await getBrowserPosition();
        const { latitude: lat, longitude: lng } = pos.coords;
        const { city, matched } = resolveHubFromCoords(lat, lng);

        const L = (await import("leaflet")).default;
        const map = leafletMap.current;
        if (map) {
          if (gpsMarker.current) map.removeLayer(gpsMarker.current);
          const dot = L.marker([lat, lng], { icon: makeGpsDot(L), zIndexOffset: 500 });
          dot.addTo(map);
          gpsMarker.current = dot;
        }

        applyHub(city, {
          filter: true,
          echo: matched
            ? `Хаб · ${city.name.toUpperCase()}`
            : `По умолчанию · ${city.name.toUpperCase()}`,
        });
        setGpsState("success");
        setTimeout(() => setGpsState("idle"), 3000);
      } catch {
        const fallback = defaultHubCity();
        applyHub(fallback, { filter: true, echo: `GPS выкл · ${fallback.name.toUpperCase()}` });
        setGpsState("idle");
      }
    })();
  }, [applyHub, mapReady]);

  // ── Show / hide markers on filter change ─────────────────────────────────

  useEffect(() => {
    if (!leafletMap.current) return;
    const map = leafletMap.current;
    markersRef.current.forEach((marker, id) => {
      const show = visibleIds.has(id);
      if (show && !map.hasLayer(marker)) marker.addTo(map);
      if (!show && map.hasLayer(marker)) map.removeLayer(marker);
    });
    if (selectedGym && !visibleIds.has(selectedGym.id)) {
      setSelectedGym(null);
    }
  }, [visibleIds, selectedGym]);

  // ── GPS Check-in ─────────────────────────────────────────────────────────

  const handleGps = useCallback(async () => {
    if (!leafletMap.current) return;
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }

    setGpsState("loading");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const L = (await import("leaflet")).default;
        const map = leafletMap.current!;

        // Remove previous GPS dot
        if (gpsMarker.current) {
          map.removeLayer(gpsMarker.current);
        }

        const dot = L.marker([lat, lng], { icon: makeGpsDot(L), zIndexOffset: 500 });
        dot.addTo(map);
        dot.bindTooltip("Вы здесь", {
          permanent: false,
          direction: "top",
          className: "cyber-tooltip",
        });
        gpsMarker.current = dot;

        map.flyTo([lat, lng], 14, { animate: true, duration: 1.4 });

        const { city, matched } = resolveHubFromCoords(lat, lng);
        applyHub(city, {
          filter: true,
          echo: matched ? `Хаб · ${city.name.toUpperCase()}` : undefined,
        });

        setGpsState("success");

        // Reset icon after 4s
        setTimeout(() => setGpsState("idle"), 4000);
      },
      () => {
        setGpsState("error");
        setTimeout(() => setGpsState("idle"), 3000);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, [applyHub]);

  // ── City flyTo ────────────────────────────────────────────────────────────

  const handleCitySelect = useCallback(
    (cityName: string) => {
      setCityOpen(false);
      setSelectedGym(null);

      const hasActiveGyms = ACTIVE_GYMS.some((g) => g.city === cityName);
      setActiveCity(hasActiveGyms ? cityName : null);

      const cityEntry = findCityByName(cityName);
      if (cityEntry) flyToCity(cityEntry);
    },
    [flyToCity],
  );

  const handleClearCity = useCallback(() => {
    setActiveCity(null);
    setCityOpen(false);
    setSelectedGym(null);
    leafletMap.current?.flyTo([44.95, 38.2], 7, { animate: true, duration: 1.2 });
  }, []);

  const handleCategoryChip = useCallback((id: GymCategory | "all") => {
    setActiveCategory(id);
    setSelectedGym(null);
  }, []);

  const visibleCount = visibleIds.size;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mapRef} className="h-full w-full" style={{ background: "#0d0d0d" }} />

      {/* Inner neon border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: "inset 0 0 0 1px rgba(34,211,238,0.10)" }}
      />

      {/* ── Filter panel (top-left) ──────────────────────────────────────── */}
      <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-2">
        {/* Network badge */}
        <div className="rounded-xl border border-cyan-400/25 bg-black/82 px-3 py-2 backdrop-blur-md">
          <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.36em] text-cyan-300/90">
            Warrior Network
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            {visibleCount} из {ACTIVE_GYMS.length} залов
          </p>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.07] bg-black/82 p-1.5 backdrop-blur-md">
          {CHIPS.map((chip) => {
            const active = activeCategory === chip.id;
            return (
              <motion.button
                key={chip.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryChip(chip.id)}
                className="rounded-full px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.2em] transition-colors"
                style={
                  active
                    ? { background: `${chip.hex}1a`, border: `1px solid ${chip.hex}66`, color: chip.hex, boxShadow: `0 0 14px -6px ${chip.hex}` }
                    : { background: "transparent", border: "1px solid transparent", color: "#71717a" }
                }
              >
                {chip.label}
              </motion.button>
            );
          })}
        </div>

        {/* ── City selector ─────────────────────────────────────────────── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCityOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/82 px-3 py-2 backdrop-blur-md transition-colors hover:border-white/[0.14]"
          >
            <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em] text-zinc-400">
              {activeCity ?? "Все города"}
            </span>
            <motion.span
              animate={{ rotate: cityOpen ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              className="text-zinc-600"
              style={{ fontSize: 9 }}
            >
              ▼
            </motion.span>
          </button>

          <AnimatePresence>
            {cityOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute left-0 top-full z-[1200] mt-1 w-52 overflow-hidden rounded-xl border border-white/[0.09] bg-zinc-950/97 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl"
              >
                {/* All cities option */}
                <button
                  type="button"
                  onClick={handleClearCity}
                  className={[
                    "flex w-full items-center justify-between px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em] transition-colors hover:bg-white/[0.04]",
                    !activeCity ? "text-cyan-300" : "text-zinc-400",
                  ].join(" ")}
                >
                  <span>Все города</span>
                  {!activeCity && <span className="text-[8px] text-cyan-400">●</span>}
                </button>

                <div className="border-t border-white/[0.06]" />

                {/* Cities with active gyms */}
                <p className="px-3 pb-0.5 pt-1.5 font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.3em] text-zinc-700">
                  Активная сеть
                </p>
                {CITY_REGISTRY.filter((c) => c.hasGyms).map((city) => {
                  const active = activeCity === city.name;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleCitySelect(city.name)}
                      className={[
                        "flex w-full items-center justify-between px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.18em] transition-colors hover:bg-white/[0.04]",
                        active ? "text-cyan-300" : "text-zinc-400",
                      ].join(" ")}
                    >
                      <span>{city.name}</span>
                      <span className="text-[8px] text-zinc-700">{city.region}</span>
                    </button>
                  );
                })}

                <div className="border-t border-white/[0.06]" />

                {/* Future expansion */}
                <p className="px-3 pb-0.5 pt-1.5 font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.3em] text-zinc-700">
                  Будущая экспансия
                </p>
                {CITY_REGISTRY.filter((c) => !c.hasGyms).map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCitySelect(city.name)}
                    className="flex w-full items-center justify-between px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.18em] text-zinc-600 transition-colors hover:bg-white/[0.03] hover:text-zinc-400"
                  >
                    <span>{city.name}</span>
                    <span className="text-[8px] text-zinc-800">{city.region}</span>
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* ── GPS Check-in button (bottom-right, above zoom) ──────────────── */}
      <div className="absolute bottom-12 right-3 z-[1000]">
        <motion.button
          type="button"
          title={GPS_TOOLTIP[gpsState]}
          aria-label={GPS_TOOLTIP[gpsState]}
          onClick={handleGps}
          disabled={gpsState === "loading"}
          whileTap={{ scale: 0.93 }}
          animate={
            gpsState === "success"
              ? { boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 24px rgba(59,130,246,0.7)", "0 0 0px rgba(59,130,246,0)"] }
              : gpsState === "error"
              ? { boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 20px rgba(239,68,68,0.6)", "0 0 0px rgba(239,68,68,0)"] }
              : undefined
          }
          transition={
            gpsState === "success" || gpsState === "error"
              ? { duration: 1.2, repeat: 1 }
              : undefined
          }
          className={[
            "flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-colors",
            gpsState === "loading" ? "cursor-wait border-blue-400/50 bg-blue-500/[0.15]"
            : gpsState === "success" ? "border-blue-400/60 bg-blue-500/[0.15]"
            : gpsState === "error"   ? "border-rose-400/50 bg-rose-500/[0.1]"
            : "border-white/[0.1] bg-black/72 hover:border-blue-400/50 hover:bg-blue-500/[0.1]",
          ].join(" ")}
        >
          {gpsState === "loading" ? (
            // Spinner
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              viewBox="0 0 20 20"
              width={16}
              height={16}
              fill="none"
            >
              <circle cx="10" cy="10" r="7" stroke="#3b82f6" strokeWidth="2" strokeDasharray="30 15" strokeLinecap="round" />
            </motion.svg>
          ) : (
            // Crosshair / radar SVG icon
            <svg
              viewBox="0 0 20 20"
              width={16}
              height={16}
              fill="none"
              stroke={
                gpsState === "success" ? "#3b82f6"
                : gpsState === "error"  ? "#f87171"
                : "#a1a1aa"
              }
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {/* Outer ring */}
              <circle cx="10" cy="10" r="7" />
              {/* Cross hairs */}
              <line x1="10" y1="1"  x2="10" y2="4.5" />
              <line x1="10" y1="15.5" x2="10" y2="19" />
              <line x1="1"  y1="10" x2="4.5" y2="10" />
              <line x1="15.5" y1="10" x2="19" y2="10" />
              {/* Centre dot */}
              <circle cx="10" cy="10" r="2" fill={gpsState === "success" ? "#3b82f6" : gpsState === "error" ? "#f87171" : "#71717a"} stroke="none" />
            </svg>
          )}
        </motion.button>

        {/* Tooltip label */}
        <AnimatePresence>
          {gpsState !== "idle" ? (
            <motion.p
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/[0.08] bg-black/80 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.2em] text-zinc-400 backdrop-blur-md"
            >
              {GPS_TOOLTIP[gpsState]}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ── Category colour legend (bottom-left) ────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-black/75 px-3 py-2.5 backdrop-blur-md">
        {(["kuznya", "fight_club", "wrestling"] as GymCategory[]).map((cat) => {
          const hex   = CATEGORY_ACCENT_HEX[cat];
          const count = ACTIVE_GYMS.filter((g) => g.category === cat).length;
          return (
            <div key={cat} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: hex, boxShadow: `0 0 7px 1px ${hex}` }}
              />
              <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="ml-1 font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-zinc-600">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Geo hub echo */}
      <AnimatePresence>
        {geoEcho ? (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-400/30 bg-black/82 px-3 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-200 backdrop-blur-md"
          >
            {geoEcho}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* Gym popup — vertical IRON WILL bottom sheet */}
      <AnimatePresence>
        {selectedGym ? (
          <GymPopup
            key={selectedGym.id}
            gym={selectedGym}
            clientId={clientId}
            onBooked={onBooked}
            onClose={() => setSelectedGym(null)}
          />
        ) : null}
      </AnimatePresence>

      {/* ── Leaflet + custom CSS overrides ──────────────────────────────── */}
      <style>{`
        .leaflet-control-attribution {
          background: rgba(0,0,0,0.55) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 6px !important;
          font-family: monospace;
          font-size: 8.5px !important;
          color: rgba(255,255,255,0.28) !important;
          padding: 2px 6px !important;
        }
        .leaflet-control-attribution a { color: rgba(34,211,238,0.6) !important; }
        .leaflet-control-zoom a {
          background: rgba(0,0,0,0.72) !important;
          border-color: rgba(255,255,255,0.1) !important;
          color: rgba(255,255,255,0.6) !important;
          font-size: 16px !important;
          line-height: 26px !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-zoom a:hover {
          background: rgba(34,211,238,0.14) !important;
          color: #22d3ee !important;
        }
        .leaflet-container { outline: none; }
        .cyber-tooltip {
          background: rgba(0,0,0,0.82) !important;
          border: 1px solid rgba(59,130,246,0.4) !important;
          border-radius: 6px !important;
          color: #93c5fd !important;
          font-family: monospace;
          font-size: 10px !important;
          padding: 3px 8px !important;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .cyber-tooltip::before { display: none !important; }
      `}</style>
    </div>
  );
}
