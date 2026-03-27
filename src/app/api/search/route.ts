import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

function getFlyaiCmd(): string {
  // Point directly to the bundle script — works on Vercel where .bin symlinks don't exist
  const script = path.resolve(process.cwd(), "node_modules", "@fly-ai", "flyai-cli", "dist", "flyai-bundle.cjs");
  return `node "${script}"`;
}

type SearchCommand = "fliggy-fast-search" | "search-flight" | "search-hotels" | "search-poi";

interface SearchRequest {
  command: SearchCommand;
  params: Record<string, string>;
}

function buildArgs(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([key, value]) => `--${key} "${value.replace(/"/g, '\\"')}"`)
    .join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { command, params } = body;

    const validCommands: SearchCommand[] = [
      "fliggy-fast-search",
      "search-flight",
      "search-hotels",
      "search-poi",
    ];

    if (!validCommands.includes(command)) {
      return NextResponse.json({ error: "Invalid command" }, { status: 400 });
    }

    const args = buildArgs(params);
    const cmd = `${getFlyaiCmd()} ${command} ${args}`;

    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });

    if (stderr) {
      console.error(`flyai stderr: ${stderr}`);
    }

    const result = JSON.parse(stdout.trim());
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("flyai search error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
