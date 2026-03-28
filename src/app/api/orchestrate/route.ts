import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const CLI_PATH = "node_modules/@fly-ai/flyai-cli/dist/flyai-bundle.cjs";

// ── Types ──

interface AvailableAgent {
  id: string;
  name: string;
  command: string;
  description: string;
  params: string;
}

interface AvailableSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  instructions?: string;
}

interface PlanItem {
  type: "agent" | "skill";
  id: string;
  reason: string;
  params?: Record<string, string>;
}

interface Plan {
  thinking: string;
  items: PlanItem[];
  summary_prompt: string;
}

// ── SSE event types emitted to the frontend ──
// "plan"        → { thinking, items }
// "exec_start"  → { id, type }
// "exec_done"   → { id, type, items, error? }
// "summary"     → { text }
// "error"       → { message }

// ── Built-in agents ──

const AGENT_CATALOG: AvailableAgent[] = [
  {
    id: "fast-search",
    name: "Search",
    command: "fliggy-fast-search",
    description: "Natural language travel search — hotels, flights, tours, SIM cards, cruises, etc.",
    params: "--query <STR>",
  },
  {
    id: "hotel",
    name: "Hotels",
    command: "search-hotels",
    description: "Search and compare hotels by destination, dates, price, star rating. Use poi-name for landmarks (e.g. 西湖, 外滩).",
    params: "--dest-name <CITY_NAME_CN> [--poi-name <LANDMARK_CN>] [--key-words STR] [--check-in-date YYYY-MM-DD] [--check-out-date YYYY-MM-DD] [--max-price N] [--hotel-stars 1-5] [--sort price_asc|price_desc|rate_desc]",
  },
  {
    id: "flight",
    name: "Flights",
    command: "search-flight",
    description: "Search flights by origin/destination cities, dates, class, price",
    params: "--origin <CITY_NAME_CN> --destination <CITY_NAME_CN> [--dep-date YYYY-MM-DD] [--back-date YYYY-MM-DD] [--seat-class-name 经济舱|公务舱|头等舱] [--max-price N]",
  },
  {
    id: "poi",
    name: "Attractions",
    command: "search-poi",
    description: "Search tourist attractions/POIs by city, with optional keyword and category filters",
    params: "--city-name <CITY_NAME_CN> [--keyword STR] [--category CAT] [--poi-level 1-5]",
  },
];

// ── Helpers ──

function buildSystemPrompt(agents: AvailableAgent[], skills: AvailableSkill[]): string {
  const agentList = agents
    .map(
      (a) =>
        `  - id: "${a.id}", name: "${a.name}", description: "${a.description}", cli_params: "${a.params}"`
    )
    .join("\n");

  const skillList =
    skills.length > 0
      ? skills
          .map((s) => `  - id: "${s.id}", name: "${s.name}", description: "${s.description}"`)
          .join("\n")
      : "  (none)";

  return `You are the orchestrator for FlyAI, a smart travel assistant. Your job is to analyze the user's query, understand their intent, and compose a team of agents and skills to fulfill the request.

## Available Agents (built-in, travel-focused):
${agentList}

## Available Skills (user-installed from community):
${skillList}

## Your Task
Given the user query, return a JSON execution plan. You MUST:
1. Determine which agents and/or skills are relevant
2. For agents, extract the right CLI parameters from the user's query (city names, dates, etc.)
3. For skills, just identify them — they will be executed separately
4. If NO built-in agents are relevant (e.g. non-travel query), DO NOT force travel agents — only use matching skills
5. If BOTH agents and skills are relevant, include both
6. Today's date is ${new Date().toISOString().split("T")[0]}

## Response Format (strict JSON, no markdown):
{
  "thinking": "brief analysis of user intent",
  "items": [
    {
      "type": "agent",
      "id": "flight",
      "reason": "user wants flights from Shanghai to Tokyo",
      "params": { "origin": "上海", "destination": "东京", "dep-date": "2026-04-01" }
    },
    {
      "type": "skill",
      "id": "clawhub:fomo-news",
      "reason": "user asking about github trending repos, this is a news skill"
    }
  ],
  "summary_prompt": "a short instruction for how to summarize the results for the user"
}

CRITICAL RULES:
- Return ONLY valid JSON, no markdown fences, no extra text
- params for agents must use the exact CLI flag names (without --)
- **All city names and POI names MUST be in Chinese** (e.g. "杭州" not "Hangzhou", "上海" not "Shanghai", "西湖" not "Westlake", "东京" not "Tokyo"). The CLI only understands Chinese city names. Translate any English city/landmark names to Chinese.
- For the hotel agent, use "dest-name" for the city and "poi-name" for specific landmarks/areas (e.g. dest-name="杭州", poi-name="西湖")
- If the query is clearly not travel-related and no skills match, return empty items []
- Be smart: "杭州三日游" needs fast-search + hotel + poi; "github trending" needs only fomo-news skill
- For ambiguous travel queries, prefer using fast-search as a catch-all plus specific agents
- Common translations: Hangzhou=杭州, Shanghai=上海, Beijing=北京, Tokyo=东京, Westlake=西湖, The Bund=外滩, Sanya=三亚, Chengdu=成都, Xian=西安, Guangzhou=广州, Shenzhen=深圳`;
}

async function execAgent(
  command: string,
  params: Record<string, string>
): Promise<{ items: unknown[]; error?: string }> {
  const args = Object.entries(params)
    .map(([k, v]) => `--${k} "${v.replace(/"/g, '\\"')}"`)
    .join(" ");

  const cmd = `node ${CLI_PATH} ${command} ${args}`;

  try {
    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    const data = JSON.parse(stdout);
    if (data.status !== 0) {
      return { items: [], error: data.message || "Agent returned error" };
    }
    return { items: data.data?.itemList || [] };
  } catch (err) {
    return { items: [], error: String(err) };
  }
}

function adaptForWeb(instructions: string): string {
  return instructions
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/```(?:bash|shell|sh)\n[\s\S]*?```/g, "")
    .replace(/^.*(?:node |npm |npx |pip |curl |wget ).*$/gm, "")
    .replace(/## (?:Quick Start|Configuration|Installation|Setup)\n[\s\S]*?(?=\n## |\n$)/g, "")
    .trim();
}

async function execSkill(
  skill: AvailableSkill,
  query: string,
  ai: GoogleGenAI
): Promise<{ items: unknown[]; error?: string }> {
  const instructions = skill.instructions;

  if (!instructions) {
    return {
      items: [],
      error: `Skill "${skill.name}" has no instructions. Try removing and re-adding it.`,
    };
  }

  const webInstructions = adaptForWeb(instructions);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: query }] }],
      config: {
        systemInstruction: `You are the "${skill.name}" skill running in a web environment.
Your job: fulfill the user's query using Google Search to find real, current information.

Here are your skill instructions — they describe your domain expertise, data sources to look for, and how to format results:

${webInstructions}

## EXECUTION RULES
- You are running in a WEB environment. You do NOT have access to filesystem, CLI, scripts, or code execution.
- Use Google Search to find the real-time information described in your skill instructions.
- Return REAL data with REAL URLs — never fabricate links.
- Return a JSON array of 5-8 items. Each item MUST have "title", "description", "url", "meta".
- Additionally, include ANY of these optional fields when the data is available:
  - "image": string (thumbnail/preview image URL — GitHub avatar, news thumbnail, etc.)
  - "author": string (creator, organization, source publication)
  - "date": string (publication date, update time — human readable like "2 hours ago" or "Mar 28, 2026")
  - "stats": object with numeric/string values (e.g. {"stars": "12.5k", "forks": "1.2k", "language": "Python"} for repos, {"views": "10k", "likes": "500"} for content)
  - "tags": string[] (topic labels, categories, keywords — max 4)
  - "price": string (if applicable — ticket price, subscription cost, etc.)
  - "subtitle": string (secondary info line — e.g. org name, location, duration)
- The richer the data, the better the user experience. Always include as many fields as the data supports.
- Return ONLY the raw JSON array — no markdown, no commentary, no code fences.`,
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim() || "[]";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");

    try {
      const items = JSON.parse(cleaned);
      if (Array.isArray(items) && items.length > 0) {
        return { items };
      }
    } catch {
      // fallback
    }

    return {
      items: [{ title: `${skill.name} result`, description: text.slice(0, 500), meta: "Result" }],
    };
  } catch (err) {
    return { items: [], error: String(err) };
  }
}

// ── Streaming handler ──

export async function POST(req: NextRequest) {
  const { query, skills } = (await req.json()) as {
    query: string;
    skills: AvailableSkill[];
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      // ── Step 1: Plan ──
      let plan: Plan;
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: query }] }],
          config: { systemInstruction: buildSystemPrompt(AGENT_CATALOG, skills || []), temperature: 0.1 },
        });
        const text = response.text?.trim() || "{}";
        const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
        plan = JSON.parse(cleaned);
      } catch (err) {
        emit("error", { message: `Planning failed: ${String(err)}` });
        controller.close();
        return;
      }

      emit("plan", { thinking: plan.thinking, items: plan.items });

      // ── Step 1.5: If no agents/skills matched, answer directly with LLM + web search ──
      if (!plan.items || plan.items.length === 0) {
        emit("exec_start", { id: "_llm", type: "llm", reason: "No agents or skills matched — answering directly" });

        try {
          const directResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: query }] }],
            config: {
              systemInstruction: "You are FlyAI, a helpful travel & lifestyle assistant. Answer the user's question directly. Use Google Search to find current, accurate information. Reply in the same language as the user. Be concise and helpful.",
              temperature: 0.3,
              tools: [{ googleSearch: {} }],
            },
          });

          const answer = directResponse.text?.trim() || "";
          emit("exec_done", { id: "_llm", type: "llm", reason: "Direct answer", items: [] });
          emit("summary", { text: answer });
        } catch (err) {
          emit("exec_done", { id: "_llm", type: "llm", reason: "Direct answer", items: [], error: String(err) });
          emit("summary", { text: "" });
        }

        controller.close();
        return;
      }

      // ── Step 2: Execute in parallel, emit each result as it completes ──
      const allResults: { type: string; id: string; items: unknown[]; error?: string }[] = [];

      // Signal all items starting
      for (const item of plan.items || []) {
        emit("exec_start", { id: item.id, type: item.type, reason: item.reason });
      }

      const execPromises = (plan.items || []).map(async (item) => {
        let result: { items: unknown[]; error?: string };

        if (item.type === "agent") {
          const agent = AGENT_CATALOG.find((a) => a.id === item.id);
          if (!agent) {
            result = { items: [], error: "Unknown agent" };
          } else {
            result = await execAgent(agent.command, item.params || {});
          }
        } else {
          const matchedSkill = (skills || []).find((s) => s.id === item.id);
          if (!matchedSkill) {
            result = { items: [], error: "Skill not installed" };
          } else {
            result = await execSkill(matchedSkill, query, ai);
          }
        }

        const entry = { type: item.type, id: item.id, reason: item.reason, items: result.items, error: result.error };
        allResults.push(entry);
        emit("exec_done", entry);
      });

      await Promise.all(execPromises);

      // ── Step 3: Synthesize summary ──
      try {
        const resultsSummary = allResults
          .map((r) => {
            const label = r.type === "agent" ? `Agent[${r.id}]` : `Skill[${r.id}]`;
            if (r.error) return `${label}: ERROR - ${r.error}`;
            return `${label}: ${r.items.length} results - ${JSON.stringify(r.items.slice(0, 3)).slice(0, 500)}`;
          })
          .join("\n");

        const synthResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [{
              text: `User query: "${query}"\n\nExecution results:\n${resultsSummary}\n\n${plan.summary_prompt || "Provide a brief, helpful summary."}\n\nReply in the same language as the user query. Keep it concise (2-4 sentences).`,
            }],
          }],
          config: {
            systemInstruction: "You are FlyAI, a smart travel & lifestyle assistant. Summarize execution results for the user. Be concise and helpful. Use the same language as the user.",
            temperature: 0.3,
          },
        });

        emit("summary", { text: synthResponse.text?.trim() || "" });
      } catch {
        emit("summary", { text: "" });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
