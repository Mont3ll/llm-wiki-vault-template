#!/usr/bin/env bun
import { generateCandidateScaffold } from "./kg-core";

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: bun scripts/kg-ingest-candidates.ts "2. Source material/Articles/Source.md"');
  process.exit(1);
}

const result = generateCandidateScaffold(process.cwd(), sourcePath);
console.log("Created review-only KG candidate artifacts:");
for (const file of result.created) console.log(`- ${file}`);
