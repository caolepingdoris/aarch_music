// Server-only: engraves LilyPond source to SVG with the `lilypond` binary.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** LILYPOND_BIN, else `lilypond` on PATH, else (Windows) the winget install location. */
function resolveLilyPond(): string {
  if (process.env.LILYPOND_BIN) return process.env.LILYPOND_BIN;
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const packages = join(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
    try {
      for (const pkg of readdirSync(packages).filter((d) => d.startsWith("LilyPond.LilyPond_"))) {
        for (const version of readdirSync(join(packages, pkg)).filter((d) => d.startsWith("lilypond-"))) {
          const exe = join(packages, pkg, version, "bin", "lilypond.exe");
          if (existsSync(exe)) return exe;
        }
      }
    } catch {}
  }
  return "lilypond";
}

let binary: string | null = null;

export class LilyPondUnavailableError extends Error {}

const cache = new Map<string, string>();
const CACHE_LIMIT = 40;

export async function engrave(source: string): Promise<string> {
  const key = createHash("sha1").update(source).digest("hex");
  const hit = cache.get(key);
  if (hit) return hit;

  binary ??= resolveLilyPond();
  const dir = await mkdtemp(join(tmpdir(), "resonant-frame-"));
  try {
    await writeFile(join(dir, "score.ly"), source, "utf8");
    await new Promise<void>((resolve, reject) => {
      execFile(
        binary!,
        ["-dbackend=svg", "-dno-point-and-click", "-dcrop", "-s", "-o", join(dir, "score"), join(dir, "score.ly")],
        { timeout: 30_000, windowsHide: true },
        (error, _stdout, stderr) => {
          if (!error) return resolve();
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return reject(new LilyPondUnavailableError("LilyPond is not installed (set LILYPOND_BIN or add lilypond to PATH)."));
          }
          reject(new Error(`LilyPond failed: ${stderr || error.message}`));
        }
      );
    });
    const raw = await readFile(join(dir, "score.cropped.svg"), "utf8");
    // Drop the fixed mm size so the page can scale the score by its viewBox.
    const svg = raw.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, "<svg$1");

    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, svg);
    return svg;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
