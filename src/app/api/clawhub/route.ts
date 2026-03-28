import { NextRequest, NextResponse } from "next/server";

const CLAWHUB_API = "https://clawhub.ai/api/v1";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  try {
    const url = q
      ? `${CLAWHUB_API}/search?${new URLSearchParams({ q, limit: "20" })}`
      : `${CLAWHUB_API}/skills?limit=20`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ skills: [], error: `ClawHub returned ${res.status}` });
    }

    const data = await res.json();
    const skills = Array.isArray(data) ? data : data.skills ?? data.results ?? [];

    return NextResponse.json({ skills });
  } catch (err) {
    return NextResponse.json({ skills: [], error: String(err) });
  }
}
