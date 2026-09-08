export type FighterImportRow = {
  name: string;
  city: string;
  club: string;
  style: string;
  weight?: number;
  height?: number;
  record?: string;
};

export type FighterImportIssue = {
  line: number;
  message: string;
};

export type ParsedFighterImport = {
  rows: FighterImportRow[];
  issues: FighterImportIssue[];
};

export type FighterInviteDraft = FighterImportRow & {
  inviteCode: string;
  profileId: string;
  slug: string;
  status: "draft" | "invited" | "activated";
};

const CYR: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export const MAX_IMPORT_ROWS = 200;

const STYLE_ALIASES: Record<string, string> = {
  mma: "mma",
  мма: "mma",
  бокс: "boxing",
  boxing: "boxing",
  "муай-тай": "muay-thai",
  muaythai: "muay-thai",
  "muay-thai": "muay-thai",
  кикбоксинг: "kickboxing",
  kickboxing: "kickboxing",
  борьба: "wrestling",
  wrestling: "wrestling",
  bjj: "bjj",
};

export function translit(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => CYR[ch] ?? ch)
    .join("");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (c === "," || c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cur.trim());
      cur = "";
      if (c === ",") continue;
      if (row.some((cell) => cell)) rows.push(row);
      row = [];
      continue;
    }
    cur += c;
  }
  row.push(cur.trim());
  if (row.some((cell) => cell)) rows.push(row);
  return rows;
}

function col(map: Record<string, number>, row: string[], key: string): string {
  const idx = map[key];
  if (idx == null) return "";
  return (row[idx] ?? "").trim();
}

function parseNum(raw: string, min: number, max: number): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n);
}

export function parseFighterCsv(text: string): ParsedFighterImport {
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  const issues: FighterImportIssue[] = [];
  if (table.length < 2) {
    return { rows: [], issues: [{ line: 1, message: "Нужен заголовок и хотя бы одна строка" }] };
  }

  const header = (table[0] ?? []).map((h) => h.toLowerCase());
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    map[h] = i;
  });

  if (map.name == null) {
    return { rows: [], issues: [{ line: 1, message: "Нет колонки name" }] };
  }

  const rows: FighterImportRow[] = [];
  const body = table.slice(1, MAX_IMPORT_ROWS + 1);
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    issues.push({
      line: MAX_IMPORT_ROWS + 2,
      message: `Больше ${MAX_IMPORT_ROWS} строк — лишнее отброшено`,
    });
  }

  body.forEach((raw, idx) => {
    const line = idx + 2;
    const name = col(map, raw, "name");
    if (name.length < 2 || name.length > 80) {
      issues.push({ line, message: "Имя: 2–80 символов" });
      return;
    }
    const record = col(map, raw, "record");
    if (record && !/^\d{1,3}-\d{1,3}(?:-\d{1,3})?$/.test(record)) {
      issues.push({ line, message: `Рекорд «${record}» — формат W-L или W-L-D` });
    }
    const styleRaw = col(map, raw, "style").toLowerCase().replace(/\s+/g, "");
    const style = STYLE_ALIASES[styleRaw] ?? (styleRaw || "mma");
    const weight = parseNum(col(map, raw, "weight"), 30, 200);
    const height = parseNum(col(map, raw, "height"), 120, 230);
    if (col(map, raw, "weight") && weight == null) {
      issues.push({ line, message: "Вес должен быть 30–200 кг" });
    }
    if (col(map, raw, "height") && height == null) {
      issues.push({ line, message: "Рост должен быть 120–230 см" });
    }

    rows.push({
      name,
      city: col(map, raw, "city").slice(0, 60),
      club: col(map, raw, "club").slice(0, 80),
      style,
      weight,
      height,
      record: record && /^\d{1,3}-\d{1,3}(?:-\d{1,3})?$/.test(record) ? record : undefined,
    });
  });

  return { rows, issues };
}

function randomSuffix(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function makeInviteCode(name: string, used: Set<string>): string {
  const prefix = translit(name)
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 6)
    .toUpperCase() || "WP";
  for (let i = 0; i < 12; i++) {
    const code = `${prefix}-${randomSuffix()}`;
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
  }
  const fallback = `WP-${Date.now().toString(36).toUpperCase()}`;
  used.add(fallback);
  return fallback;
}

export function makeSlug(name: string, used: Set<string>): string {
  const base =
    translit(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "fighter";
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

export function normalizeInviteCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{3,22}$/.test(code)) return null;
  return code;
}

export function draftIdentityKey(row: Pick<FighterImportRow, "name" | "city" | "club">): string {
  return [row.name, row.club, row.city]
    .map((v) => v.trim().toLowerCase())
    .join("|");
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildInviteUrl(code: string, origin?: string): string {
  const base = (origin ?? process.env.NEXTAUTH_URL ?? "https://warrior-point.vercel.app").replace(
    /\/$/,
    "",
  );
  return `${base}/invite/${encodeURIComponent(code)}`;
}

export function activationSms(name: string, url: string): string {
  return `Warrior Point: ${name}, паспорт готов. Активируй за 60 сек: ${url}`;
}

export function activationEmail(name: string, url: string): { subject: string; body: string } {
  return {
    subject: "Активируй свой паспорт · Warrior Point",
    body:
      `${name}, твой паспорт бойца уже создан.\n\n` +
      `Открой ссылку и активируй его — займёт меньше минуты:\n${url}\n\n` +
      `Round 23 · Warrior Point`,
  };
}

export function parseRecord(record?: string): {
  wins: number;
  losses: number;
  draws: number;
} {
  const parts = (record ?? "0-0-0").split("-").map((n) => Number.parseInt(n, 10) || 0);
  return { wins: parts[0] ?? 0, losses: parts[1] ?? 0, draws: parts[2] ?? 0 };
}
