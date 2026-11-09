import type { Route } from "./+types/api.score";
import { parseScoreData, toLilyPond } from "../../src/services/LilyPondService";
import { engrave, LilyPondUnavailableError } from "../elevation/api/engrave.server";

/** POST ScoreData JSON → engraved SVG. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let source: string;
  try {
    source = toLilyPond(parseScoreData(await request.json()));
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Invalid score", { status: 400 });
  }

  try {
    const svg = await engrave(source);
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    const unavailable = err instanceof LilyPondUnavailableError;
    return new Response(unavailable ? err.message : "Engraving failed", { status: unavailable ? 503 : 500 });
  }
}
