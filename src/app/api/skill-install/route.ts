import { NextRequest, NextResponse } from "next/server";

const CLAWHUB_API = "https://clawhub.ai/api/v1";

export async function POST(req: NextRequest) {
  const { slug } = await req.json();

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    // Fetch skill metadata
    const metaRes = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    let meta: { name?: string; description?: string; author?: string } = {};
    if (metaRes.ok) {
      meta = await metaRes.json();
    }

    // Fetch SKILL.md — this is the skill's brain/instructions
    let instructions = "";
    try {
      const mdRes = await fetch(
        `${CLAWHUB_API}/skills/${encodeURIComponent(slug)}/file?path=SKILL.md`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (mdRes.ok) {
        instructions = await mdRes.text();
      }
    } catch {
      // SKILL.md might not exist — that's okay
    }

    // If no SKILL.md, try README.md as fallback
    if (!instructions) {
      try {
        const readmeRes = await fetch(
          `${CLAWHUB_API}/skills/${encodeURIComponent(slug)}/file?path=README.md`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (readmeRes.ok) {
          instructions = await readmeRes.text();
        }
      } catch {
        // also fine
      }
    }

    // Final fallback: use description as instructions
    if (!instructions && meta.description) {
      instructions = `You are the "${meta.name || slug}" skill. ${meta.description}`;
    }

    return NextResponse.json({
      slug,
      name: meta.name || slug,
      description: meta.description || "",
      author: meta.author || "Community",
      instructions,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
