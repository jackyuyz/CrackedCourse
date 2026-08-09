import "server-only";

import type { SyllabusExtractor } from "@/lib/extraction/schema";
import {
  FixtureSyllabusExtractor,
  HeuristicSyllabusExtractor,
} from "@/lib/extraction/providers/fixture";

export function getSyllabusExtractor(provider: string): SyllabusExtractor {
  if (provider === "heuristic") return new HeuristicSyllabusExtractor();
  if (provider === "fixture") return new FixtureSyllabusExtractor();
  throw new Error(`Unsupported extraction provider: ${provider}`);
}
