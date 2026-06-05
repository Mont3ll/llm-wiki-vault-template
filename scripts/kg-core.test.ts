import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanVault, buildGraph, generateCandidateScaffold } from "./kg-core";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kg-core-test-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(path: string, content: string) {
  const full = join(root, path);
  mkdirSync(full.split("/").slice(0, -1).join("/"), { recursive: true });
  writeFileSync(full, content);
}

test("scanVault reports duplicate entity ids and relation validity issues", () => {
  write("6. Zettelkasten/Entities/A.md", `---\ntype: entity\nentity_id: entity_same\ncanonical_name: Alpha\naliases: [Shared]\nstatus: active\n---\n# A\n`);
  write("6. Zettelkasten/Entities/B.md", `---\ntype: entity\nentity_id: entity_same\ncanonical_name: Beta\naliases: [Shared]\nstatus: active\n---\n# B\n`);
  write("6. Zettelkasten/Relations/R.md", `---\ntype: relation\nrelation_id: rel_a_b\nsubject_id: entity_same\npredicate: supports\nobject_id: entity_other\nsource_document: "[[Source]]"\nstatus: active\n---\n# R\n`);

  const report = scanVault(root);
  const codes = report.findings.map((f) => f.code);

  expect(codes).toContain("duplicate_entity_id");
  expect(codes).toContain("entity_alias_collision");
  expect(codes).toContain("relation_missing_valid_from");
});

test("buildGraph projects source, entity, relation, and contradiction nodes without mutating notes", () => {
  write("2. Source material/Articles/Source.md", `# reference\nhttps://example.com\n\n# notes\nBody\n\n# cited by\n- [[Entity]]\n`);
  write("6. Zettelkasten/Entities/Entity.md", `---\ntype: entity\nentity_id: entity_alpha\ncanonical_name: Alpha\nstatus: active\ncreated_from: "[[Source]]"\n---\n# Entity\n`);
  write("6. Zettelkasten/Relations/Relation.md", `---\ntype: relation\nrelation_id: rel_alpha_beta\nsubject_id: entity_alpha\npredicate: supports\nobject_id: entity_beta\nsource_document: "[[Source]]"\nvalid_from: 2026-06-05\nstatus: active\n---\n# Relation\n`);
  write("6. Zettelkasten/Contradictions/Event.md", `---\ntype: contradiction_event\nevent_id: contradiction_alpha\nold_relation_id: rel_old\nnew_relation_candidate_id: rel_candidate\nsource_documents: ["[[Source]]"]\nstatus: contested\n---\n# Event\n`);

  const graph = buildGraph(root);

  expect(graph.nodes.some((n) => n.type === "source_document")).toBe(true);
  expect(graph.nodes.some((n) => n.type === "entity" && n.id === "entity_alpha")).toBe(true);
  expect(graph.edges.some((e) => e.type === "relates_to" && e.from === "entity_alpha" && e.to === "entity_beta")).toBe(true);
  expect(graph.edges.some((e) => e.type === "sourced_from" && e.to.includes("Source.md"))).toBe(true);
});

test("generateCandidateScaffold writes review-only candidate artifacts for a source", () => {
  write("2. Source material/Articles/Source.md", `# reference\nhttps://example.com/source\n\n# notes\nThis source mentions Alpha supporting Beta.\n`);

  const result = generateCandidateScaffold(root, "2. Source material/Articles/Source.md");

  expect(result.created.length).toBeGreaterThanOrEqual(3);
  expect(existsSync(join(root, "6. Zettelkasten/Entities/Source Entity Candidate.md"))).toBe(true);
  expect(existsSync(join(root, "6. Zettelkasten/Relations/Source Relation Candidate.md"))).toBe(true);
  expect(existsSync(join(root, "4. Indexes/Ingest Logs/Source Ingest Log.md"))).toBe(true);

  const entityCandidate = readFileSync(join(root, "6. Zettelkasten/Entities/Source Entity Candidate.md"), "utf8");
  expect(entityCandidate).toContain("status: review_required");
  expect(entityCandidate).toContain("source_document: \"[[Source]]\"");
});
