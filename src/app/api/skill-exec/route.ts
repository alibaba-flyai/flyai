import { NextRequest, NextResponse } from "next/server";

const CLAWHUB_API = "https://clawhub.ai/api/v1";

export async function POST(req: NextRequest) {
  const { slug, query } = await req.json();

  if (!slug || !query) {
    return NextResponse.json({ items: [], error: "Missing slug or query" });
  }

  try {
    // 1. Fetch skill metadata from ClawHub to understand what the skill does
    const metaRes = await fetch(`${CLAWHUB_API}/skills/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    let skillMeta: { name?: string; description?: string; readme?: string } = {};
    if (metaRes.ok) {
      skillMeta = await metaRes.json();
    }

    // 2. Try to fetch the skill's SKILL.md for detailed instructions
    let skillMd = "";
    try {
      const mdRes = await fetch(
        `${CLAWHUB_API}/skills/${encodeURIComponent(slug)}/file?path=SKILL.md`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (mdRes.ok) {
        skillMd = await mdRes.text();
      }
    } catch {
      // not critical
    }

    // 3. Build a meaningful result card
    const items = [];

    // Add skill info card
    items.push({
      title: skillMeta.name || slug,
      description: skillMeta.description || "Community skill from ClawHub",
      url: `https://clawhub.ai/skills/${slug}`,
      meta: "Skill Info",
    });

    // Parse SKILL.md for capabilities if available
    if (skillMd) {
      // Extract tool descriptions or capabilities from the skill markdown
      const toolMatches = skillMd.match(/##\s*Tools?\b[\s\S]*?(?=\n##|\n$)/gi);
      const capabilityMatches = skillMd.match(
        /(?:^|\n)[-*]\s+\*\*(.+?)\*\*[:\s]*(.+)/g
      );

      if (capabilityMatches) {
        for (const match of capabilityMatches.slice(0, 4)) {
          const parsed = match.match(/[-*]\s+\*\*(.+?)\*\*[:\s]*(.*)/);
          if (parsed) {
            items.push({
              title: parsed[1],
              description: parsed[2] || "",
              meta: "Capability",
            });
          }
        }
      }

      // Check if the skill mentions any API endpoints or data sources
      if (toolMatches) {
        items.push({
          title: "This skill has custom tools",
          description:
            "Install via ClawHub CLI to use its full capabilities",
          url: `https://clawhub.ai/skills/${slug}`,
          meta: "Tip",
        });
      }
    }

    // 4. Add a contextual card about the user's query
    items.push({
      title: `Query: "${query}"`,
      description: `This query was routed to the ${skillMeta.name || slug} skill. Install the skill via ClawHub CLI for full results.`,
      meta: "Routed",
    });

    return NextResponse.json({ items, skillMeta });
  } catch (err) {
    return NextResponse.json({
      items: [
        {
          title: slug,
          description: `Skill matched but execution failed: ${String(err)}`,
          url: `https://clawhub.ai/skills/${slug}`,
          meta: "Error",
        },
      ],
    });
  }
}
