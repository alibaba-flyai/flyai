"use client";

// ── SmartCard ──
// A universal card that composes its layout on the fly based on whatever
// structured data it receives. No predefined schemas — field classification
// is heuristic, and the layout adapts to what's present.

interface SmartCardProps {
  data: Record<string, unknown>;
  accent?: { color: string; colorBg: string; label: string };
}

// ── Field classification ──

type FieldRole =
  | "image"
  | "title"
  | "subtitle"
  | "description"
  | "price"
  | "link"
  | "location"
  | "author"
  | "date"
  | "stat"
  | "tags"
  | "extra";

const ROLE_PATTERNS: [FieldRole, RegExp][] = [
  ["image", /pic|image|img|photo|thumbnail|avatar|cover|poster|logo/i],
  ["link", /url|link|href|jumpUrl|detailUrl|detailurl/i],
  ["price", /price|cost|fee|ticketPrice|adultPrice/i],
  ["title", /^(title|name|headline)$/i],
  ["subtitle", /subtitle|brandName|marketingTransportName|marketingTransportNo|seatClassName|scoreDesc/i],
  ["description", /desc|review|summary|content|snippet|interestsPoi/i],
  ["location", /address|location|city|station/i],
  ["author", /author|brand|source|org|publisher/i],
  ["date", /date|time|created|updated|when|depDateTime|arrDateTime|decorationTime/i],
  ["tags", /tags|category|topics|keywords|poiLevel|star(?!s)|journeyType/i],
  ["stat", /score|rating|stars|forks|views|likes|duration|totalDuration|watchers|downloads|issues/i],
];

function classifyField(key: string, value: unknown): FieldRole {
  // String arrays → tags
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return "tags";

  // URLs that look like images
  if (typeof value === "string" && /^https?:.*\.(jpg|jpeg|png|gif|webp|svg)/i.test(value)) return "image";

  // URLs
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return "link";

  // Pattern match on key name
  for (const [role, pattern] of ROLE_PATTERNS) {
    if (pattern.test(key)) {
      // Extra validation
      if (role === "image" && typeof value === "string" && value.startsWith("http")) return "image";
      if (role === "image") continue; // skip if not a URL
      if (role === "link" && typeof value === "string" && value.startsWith("http")) return "link";
      if (role === "link") continue;
      return role;
    }
  }

  // Numbers → stat
  if (typeof value === "number") return "stat";

  return "extra";
}

// ── Flatten nested objects ──

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined || val === "" || typeof val === "boolean") continue;

    const fullKey = prefix ? `${prefix}_${key}` : key;

    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      if (val.every((v) => typeof v === "string")) {
        result[fullKey] = val;
      } else if (typeof val[0] === "object" && val[0] !== null) {
        // Flatten first item of object arrays (e.g. journeys[0], segments[0])
        Object.assign(result, flattenObject(val[0] as Record<string, unknown>, key));
      }
    } else if (typeof val === "object") {
      Object.assign(result, flattenObject(val as Record<string, unknown>, key));
    } else {
      result[fullKey] = val;
    }
  }

  return result;
}

// ── Format helpers ──

function formatStatKey(key: string): string {
  // "totalDuration" → "Duration", "stars" → "Stars"
  return key
    .replace(/^(.*_)/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatDuration(val: string | number): string {
  const m = typeof val === "string" ? parseInt(val, 10) : val;
  if (isNaN(m)) return String(val);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h${r > 0 ? `${r}m` : ""}` : `${r}m`;
}

function formatDateTime(val: string): { date: string; time: string } {
  if (!val) return { date: "", time: "" };
  try {
    const d = new Date(val.replace(" ", "T"));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" }),
      time: val.split(" ")[1]?.slice(0, 5) || d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  } catch {
    return { date: val, time: "" };
  }
}

const STAT_ICONS: Record<string, string> = {
  stars: "★", star: "★", score: "★", rating: "★",
  forks: "🍴", fork: "🍴",
  views: "👁", watchers: "👀",
  likes: "♡", like: "♡",
  comments: "💬", issues: "⚠",
  downloads: "↓",
};

function formatPrice(val: unknown): string {
  const s = String(val);
  // Already has a currency symbol
  if (/^[¥$€£₹₩]/.test(s)) return s;
  // Pure number or number-like (e.g. "899", "1,299") — prefix with ¥
  if (/^\d[\d,.]*$/.test(s)) return `¥${s}`;
  return s;
}

function statIcon(key: string): string {
  const lower = key.toLowerCase().replace(/^.*_/, "");
  return STAT_ICONS[lower] || "";
}

// ── Main component ──

export function SmartCard({ data, accent }: SmartCardProps) {
  const flat = flattenObject(data);

  // Classify all fields
  const classified: Record<FieldRole, { key: string; value: unknown }[]> = {
    image: [], title: [], subtitle: [], description: [], price: [],
    link: [], location: [], author: [], date: [], stat: [], tags: [], extra: [],
  };

  for (const [key, value] of Object.entries(flat)) {
    const role = classifyField(key, value);
    classified[role].push({ key, value });
  }

  // Pick primary fields
  const image = classified.image[0]?.value as string | undefined;
  const title = classified.title[0]?.value as string | undefined;
  const description = classified.description.map((d) => String(d.value)).join(" · ");
  const rawPrice = classified.price[0]?.value;
  const price = rawPrice != null ? formatPrice(rawPrice) : undefined;
  const link = classified.link[0]?.value as string | undefined;
  const location = classified.location[0]?.value as string | undefined;
  const subtitles = classified.subtitle.map((s) => String(s.value)).filter(Boolean);
  const authors = classified.author.map((a) => String(a.value)).filter(Boolean);
  const dates = classified.date.map((d) => ({ key: d.key, value: String(d.value) }));
  const stats = classified.stat;
  const tagArrays = classified.tags.flatMap((t) =>
    Array.isArray(t.value) ? (t.value as string[]) : [String(t.value)]
  ).filter((t) => t && t !== "UNKNOWN" && t !== "null" && t !== "false" && t !== "true");

  // Detect route pattern (dep + arr cities/times)
  const depTime = dates.find((d) => /dep/i.test(d.key));
  const arrTime = dates.find((d) => /arr/i.test(d.key));
  const depCity = classified.location.find((l) => /dep.*city/i.test(l.key));
  const arrCity = classified.location.find((l) => /arr.*city/i.test(l.key));
  const depStation = classified.location.find((l) => /dep.*station/i.test(l.key));
  const arrStation = classified.location.find((l) => /arr.*station/i.test(l.key));
  const isRoute = !!(depTime && arrTime && depCity && arrCity);

  // Duration stat
  const durationStat = stats.find((s) => /duration/i.test(s.key));

  const inner = (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 animate-slide-in group"
      style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}
    >
      {/* Hero image */}
      {image && (
        <div className="relative w-full h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title || ""}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {price && (
            <div className="absolute bottom-3 right-3 text-lg font-bold text-white">{price}</div>
          )}
          <div className="absolute bottom-3 left-3 right-16">
            {title && <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{title}</h3>}
            {subtitles.length > 0 && (
              <p className="text-[11px] text-white/70 mt-0.5 line-clamp-1">{subtitles.join(" · ")}</p>
            )}
          </div>
          {/* Tag overlay */}
          {tagArrays.length > 0 && (
            <div className="absolute top-3 right-3 flex gap-1">
              {tagArrays.slice(0, 2).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: "rgba(10,10,18,0.7)", color: "#fff", backdropFilter: "blur(4px)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 space-y-2.5">
        {/* Title row (no image) */}
        {!image && (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {title && <h3 className="text-sm font-semibold leading-tight">{title}</h3>}
              {subtitles.length > 0 && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {subtitles.join(" · ")}
                </p>
              )}
            </div>
            {price && (
              <span className="text-lg font-bold shrink-0" style={{ color: "var(--color-accent)" }}>
                {price}
              </span>
            )}
          </div>
        )}

        {/* Route visualization */}
        {isRoute && (
          <div className="flex items-stretch">
            <div className="flex-1">
              <div className="text-xl font-bold font-mono tracking-tight">
                {formatDateTime(depTime!.value).time}
              </div>
              <div className="text-xs font-semibold mt-0.5">{String(depCity!.value)}</div>
              {depStation && <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>{String(depStation.value)}</div>}
              <div className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                {formatDateTime(depTime!.value).date}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center px-4 min-w-[90px]">
              {durationStat && (
                <div className="text-[10px] mb-1" style={{ color: "var(--color-muted)" }}>
                  {formatDuration(String(durationStat.value))}
                </div>
              )}
              <div className="w-full flex items-center">
                <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: "var(--color-accent)" }} />
                <div className="flex-1 h-px" style={{ background: "var(--color-card-border)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xl font-bold font-mono tracking-tight">
                {formatDateTime(arrTime!.value).time}
              </div>
              <div className="text-xs font-semibold mt-0.5">{String(arrCity!.value)}</div>
              {arrStation && <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>{String(arrStation.value)}</div>}
              <div className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                {formatDateTime(arrTime!.value).date}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--color-muted)" }}>
            {description}
          </p>
        )}

        {/* Location */}
        {location && !isRoute && (
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] mt-0.5 shrink-0">📍</span>
            <span className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {location}
            </span>
          </div>
        )}

        {/* Stats row */}
        {stats.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {stats
              .filter((s) => !isRoute || !/duration/i.test(s.key)) // skip duration if shown in route
              .slice(0, 5)
              .map((s) => {
                const icon = statIcon(s.key);
                const val = /duration/i.test(s.key)
                  ? formatDuration(String(s.value))
                  : String(s.value);
                return (
                  <span key={s.key} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-badge-text)" }}>
                    {icon && <span className="opacity-70">{icon}</span>}
                    <span className="font-medium">{val}</span>
                    {!icon && <span className="opacity-40">{formatStatKey(s.key)}</span>}
                  </span>
                );
              })}
          </div>
        )}

        {/* Tags */}
        {tagArrays.length > 0 && !image && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {tagArrays.slice(0, 5).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px]"
                style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: author + date + accent badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--color-muted)", opacity: 0.7 }}>
            {authors.length > 0 && <span>{authors[0]}</span>}
            {authors.length > 0 && dates.length > 0 && !isRoute && <span>·</span>}
            {dates.length > 0 && !isRoute && <span>{formatDateTime(dates[0].value).date}</span>}
          </div>
          {accent && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
              style={{ background: accent.colorBg, color: accent.color }}>
              {accent.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (link) {
    return <a href={link} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>;
  }
  return inner;
}
