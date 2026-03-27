"use client";

import { AgentType, FastSearchItem, FlightItem, HotelItem, PoiItem } from "@/lib/types";
import { getAgent } from "@/lib/agents";

function Badge({ agentId }: { agentId: AgentType }) {
  const agent = getAgent(agentId);
  if (!agent) return null;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={{ background: agent.colorBg, color: agent.color }}>
      {agent.icon} {agent.name}
    </span>
  );
}

function formatDuration(mins: string): string {
  const m = parseInt(mins, 10);
  if (isNaN(m)) return mins;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h${r > 0 ? ` ${r}m` : ""}` : `${r}m`;
}

function formatDate(dt: string): string {
  if (!dt) return "";
  // "2026-03-28 20:55:00" → "Mar 28, Sat"
  try {
    const d = new Date(dt.replace(" ", "T"));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  } catch {
    return dt.split(" ")[0] || "";
  }
}

function formatTime(dt: string): string {
  if (!dt) return "";
  return dt.split(" ")[1]?.slice(0, 5) || "";
}

function CardShell({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = (
    <div className="rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 animate-slide-in group"
      style={{ background: "var(--color-card)", borderColor: "var(--color-card-border)" }}>
      {children}
    </div>
  );
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>;
  }
  return inner;
}

/* ─── Fast Search Card ─── */
export function FastSearchCard({ item }: { item: FastSearchItem }) {
  const { info } = item;
  return (
    <CardShell href={info.jumpUrl}>
      {info.picUrl && (
        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-4">
          <img src={info.picUrl} alt={info.title} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <h3 className="text-sm font-bold text-white leading-tight">{info.title}</h3>
            {info.price && (
              <span className="text-lg font-bold text-white shrink-0 ml-2">{info.price}</span>
            )}
          </div>
        </div>
      )}
      {!info.picUrl && (
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold">{info.title}</h3>
          {info.price && <span className="text-lg font-bold shrink-0 ml-2">{info.price}</span>}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {info.tags && info.tags.slice(0, 4).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px]"
              style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}>
              {tag}
            </span>
          ))}
          {info.star && (
            <span className="px-2 py-0.5 rounded-full text-[10px]"
              style={{ background: "rgba(234,179,8,0.12)", color: "#facc15" }}>
              {info.star}
            </span>
          )}
        </div>
        <Badge agentId="fast-search" />
      </div>
    </CardShell>
  );
}

/* ─── Flight Card ─── */
export function FlightCard({ item }: { item: FlightItem }) {
  const journey = item.journeys?.[0];
  const seg = journey?.segments?.[0];
  const lastSeg = journey?.segments?.[journey.segments.length - 1];
  if (!seg) return null;

  const isTransfer = journey.segments.length > 1;

  return (
    <CardShell href={item.jumpUrl}>
      {/* Header: airline + badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "rgba(6,182,212,0.1)" }}>
            ✈️
          </div>
          <div>
            <div className="text-sm font-semibold">{seg.marketingTransportName}</div>
            <div className="text-[11px] font-mono text-[var(--color-muted)]">{seg.marketingTransportNo}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium"
            style={{
              background: isTransfer ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.12)",
              color: isTransfer ? "#fb923c" : "#4ade80",
            }}>
            {journey.journeyType}
          </span>
          <Badge agentId="flight" />
        </div>
      </div>

      {/* Route visualization */}
      <div className="flex items-stretch mb-4">
        {/* Departure */}
        <div className="flex-1">
          <div className="text-2xl font-bold font-mono tracking-tight">{formatTime(seg.depDateTime)}</div>
          <div className="text-xs font-semibold mt-0.5">{seg.depCityName}</div>
          <div className="text-[10px] text-[var(--color-muted)]">{seg.depStationName}</div>
          <div className="text-[10px] text-[var(--color-muted)] mt-0.5">{formatDate(seg.depDateTime)}</div>
        </div>

        {/* Flight path */}
        <div className="flex flex-col items-center justify-center px-4 min-w-[100px]">
          <div className="text-[10px] text-[var(--color-muted)] mb-1">{formatDuration(journey.totalDuration)}</div>
          <div className="w-full flex items-center">
            <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: "var(--color-accent)" }} />
            <div className="flex-1 h-px relative" style={{ background: "var(--color-card-border)" }}>
              {isTransfer && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#f97316" }} />
              )}
            </div>
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />
          </div>
          {isTransfer && (
            <div className="text-[9px] mt-1" style={{ color: "#fb923c" }}>
              via {journey.segments[0].arrCityName}
            </div>
          )}
        </div>

        {/* Arrival */}
        <div className="flex-1 text-right">
          <div className="text-2xl font-bold font-mono tracking-tight">{formatTime(lastSeg!.arrDateTime)}</div>
          <div className="text-xs font-semibold mt-0.5">{lastSeg!.arrCityName}</div>
          <div className="text-[10px] text-[var(--color-muted)]">{lastSeg!.arrStationName}</div>
          <div className="text-[10px] text-[var(--color-muted)] mt-0.5">{formatDate(lastSeg!.arrDateTime)}</div>
        </div>
      </div>

      {/* Footer: class + price */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--color-card-border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded"
            style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}>
            {seg.seatClassName}
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">¥{item.ticketPrice}</span>
          <span className="text-[10px] text-[var(--color-muted)] ml-1">/person</span>
        </div>
      </div>
    </CardShell>
  );
}

/* ─── Hotel Card ─── */
export function HotelCard({ item }: { item: HotelItem }) {
  return (
    <CardShell href={item.detailUrl}>
      {/* Hero image */}
      {item.mainPic && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.mainPic} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      )}

      {/* Name + badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold leading-tight">{item.name}</h3>
        <Badge agentId="hotel" />
      </div>

      {/* Price + score row — always visible */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>{item.price}</span>
          <span className="text-[10px] text-[var(--color-muted)]">/night</span>
        </div>
        {item.score && item.score !== "0" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(168,85,247,0.12)" }}>
            <span className="text-sm font-bold" style={{ color: "#c084fc" }}>{item.score}</span>
            {item.scoreDesc && <span className="text-[10px]" style={{ color: "#c084fc" }}>{item.scoreDesc}</span>}
          </div>
        )}
      </div>

      {/* Tags row: star, brand, renovation */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {item.star && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(168,85,247,0.12)", color: "#c084fc" }}>
            {item.star}
          </span>
        )}
        {item.brandName && (
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}>
            {item.brandName}
          </span>
        )}
        {item.decorationTime && (
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}>
            {item.decorationTime}年装修
          </span>
        )}
      </div>

      {/* Location */}
      {item.address && (
        <div className="flex items-start gap-1.5 mb-2">
          <span className="text-xs mt-0.5 shrink-0">📍</span>
          <span className="text-xs text-[var(--color-muted)] leading-relaxed">{item.address}</span>
        </div>
      )}

      {/* Nearby POI */}
      {item.interestsPoi && (
        <div className="mt-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
            {item.interestsPoi}
          </span>
        </div>
      )}

      {/* Review */}
      {item.review && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-card-border)" }}>
          <p className="text-xs text-[var(--color-badge-text)] leading-relaxed italic">&ldquo;{item.review}&rdquo;</p>
        </div>
      )}
    </CardShell>
  );
}

/* ─── POI / Attraction Card ─── */
export function PoiCard({ item }: { item: PoiItem }) {
  return (
    <CardShell href={item.jumpUrl}>
      {/* Hero image */}
      {item.mainPic && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4">
          <img src={item.mainPic} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Free badge */}
          {item.freePoiStatus === "FREE" && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(34,197,94,0.9)", color: "#fff" }}>
              Free Entry
            </div>
          )}
          {/* Category */}
          {item.category && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: "rgba(10,10,18,0.7)", color: "var(--color-foreground)", backdropFilter: "blur(4px)" }}>
              {item.category}
            </div>
          )}
          <div className="absolute bottom-3 left-3">
            <h3 className="text-base font-bold text-white">{item.name}</h3>
          </div>
        </div>
      )}

      {!item.mainPic && (
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold">{item.name}</h3>
          {item.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "var(--color-badge-bg)", color: "var(--color-badge-text)" }}>
              {item.category}
            </span>
          )}
        </div>
      )}

      {/* Location */}
      {item.address && (
        <div className="flex items-start gap-1.5 mb-3">
          <span className="text-[10px] mt-0.5 shrink-0">📍</span>
          <span className="text-[11px] text-[var(--color-muted)] leading-relaxed">{item.address}</span>
        </div>
      )}

      {/* Footer: ticket + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {item.freePoiStatus === "NOT_FREE" && item.ticketInfo?.price && (
            <span className="text-lg font-bold">{item.ticketInfo.price}</span>
          )}
          {item.ticketInfo?.ticketName && (
            <span className="text-[10px] text-[var(--color-muted)]">{item.ticketInfo.ticketName}</span>
          )}
          {item.poiLevel && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: "rgba(234,179,8,0.12)", color: "#facc15" }}>
              {"★".repeat(parseInt(item.poiLevel) || 0)}
            </span>
          )}
        </div>
        <Badge agentId="poi" />
      </div>
    </CardShell>
  );
}
