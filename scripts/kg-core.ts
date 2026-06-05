import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

export type Severity = "info" | "warning" | "error";

export interface Finding {
  severity: Severity;
  code: string;
  file: string;
  message: string;
}

export interface LintReport {
  summary: Record<Severity, number>;
  findings: Finding[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  file: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  source?: string;
}

export interface GraphReport {
  generated_at: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const VALID_ENTITY_STATUS = new Set(["active", "merged", "contested", "rejected", "candidate", "review_required"]);
const VALID_RELATION_STATUS = new Set(["active", "superseded", "contested", "rejected", "candidate", "review_required"]);
const VALID_CONTRADICTION_STATUS = new Set(["contested", "resolved", "rejected"]);

function listMarkdown(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "5. Templates") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
    }
  }
  walk(root);
  return out;
}

function rel(root: string, file: string): string {
  return relative(root, file).split("\\").join("/");
}

function parseFrontmatter(content: string): Record<string, any> {
  if (!content.startsWith("---\n")) return {};
  const end = content.indexOf("\n---", 4);
  if (end === -1) return {};
  const raw = content.slice(4, end).split(/\r?\n/);
  const data: Record<string, any> = {};
  for (const line of raw) {
    const match = line.match(/^([A-Za-z0-9_:-]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value: any = match[2].trim();
    if (value === "null") value = null;
    else if (value === "[]") value = [];
    else if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((v) => stripQuotes(v.trim())).filter(Boolean);
    } else {
      value = stripQuotes(value);
    }
    data[key] = value;
  }
  return data;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

function titleFromFile(file: string): string {
  return basename(file, ".md");
}

function hasHeading(content: string, heading: string): boolean {
  return new RegExp(`^# ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m").test(content);
}

function add(finding: Finding[], severity: Severity, code: string, file: string, message: string) {
  finding.push({ severity, code, file, message });
}

function required(data: Record<string, any>, key: string): boolean {
  const value = data[key];
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function scanVault(root = process.cwd()): LintReport {
  const findings: Finding[] = [];
  const entityIds = new Map<string, string[]>();
  const canonicalNames = new Map<string, string[]>();
  const aliases = new Map<string, string[]>();
  const relationCandidatesWithContradictions: string[] = [];
  const contradictionFiles = new Set<string>();

  for (const file of listMarkdown(root)) {
    const fileRel = rel(root, file);
    const content = readFileSync(file, "utf8");
    const data = parseFrontmatter(content);
    const type = String(data.type || "");

    if (fileRel.startsWith("2. Source material/")) {
      if (!hasHeading(content, "reference")) add(findings, "error", "source_missing_reference", fileRel, "Source note is missing # reference.");
      if (!hasHeading(content, "notes")) add(findings, "error", "source_missing_notes", fileRel, "Source note is missing # notes.");
      if (!hasHeading(content, "cited by")) add(findings, "warning", "source_missing_cited_by", fileRel, "Source note is missing # cited by.");
    }

    if (type === "entity") {
      const id = String(data.entity_id || data.id || "");
      const canonical = String(data.canonical_name || titleFromFile(file));
      if (!id) add(findings, "error", "entity_missing_id", fileRel, "Entity is missing entity_id.");
      if (!canonical) add(findings, "error", "entity_missing_canonical_name", fileRel, "Entity is missing canonical_name or title fallback.");
      if (!required(data, "status")) add(findings, "warning", "entity_missing_status", fileRel, "Entity is missing status.");
      else if (!VALID_ENTITY_STATUS.has(String(data.status))) add(findings, "warning", "invalid_entity_status", fileRel, `Unexpected entity status: ${data.status}.`);
      if (id) entityIds.set(id, [...(entityIds.get(id) || []), fileRel]);
      if (canonical) canonicalNames.set(canonical.toLowerCase(), [...(canonicalNames.get(canonical.toLowerCase()) || []), fileRel]);
      for (const alias of Array.isArray(data.aliases) ? data.aliases : []) {
        const key = String(alias).toLowerCase();
        aliases.set(key, [...(aliases.get(key) || []), fileRel]);
      }
    }

    if (type === "entity_candidate") {
      if (!required(data, "source_document")) add(findings, "error", "entity_candidate_missing_source", fileRel, "Entity candidate is missing source_document.");
      if (String(data.status) === "review_required") add(findings, "info", "review_required_entity_candidate", fileRel, "Entity candidate requires review.");
      if (Array.isArray(data.candidate_matches) && data.candidate_matches.length > 0) add(findings, "warning", "unresolved_entity_candidate_match", fileRel, "Entity candidate has candidate_matches requiring review.");
    }

    if (type === "relation") {
      const id = data.relation_id || data.id;
      if (!id) add(findings, "error", "relation_missing_id", fileRel, "Relation is missing relation_id.");
      for (const key of ["subject_id", "predicate", "object_id"]) {
        if (!required(data, key)) add(findings, "error", `relation_missing_${key}`, fileRel, `Relation is missing ${key}.`);
      }
      if (!required(data, "source_document") && !required(data, "source")) add(findings, "error", "relation_missing_source", fileRel, "Relation is missing source_document or source.");
      if (!required(data, "valid_from")) add(findings, "warning", "relation_missing_valid_from", fileRel, "Relation is missing valid_from.");
      if (!required(data, "status")) add(findings, "warning", "relation_missing_status", fileRel, "Relation is missing status.");
      else if (!VALID_RELATION_STATUS.has(String(data.status))) add(findings, "warning", "invalid_relation_status", fileRel, `Unexpected relation status: ${data.status}.`);
      if (String(data.status) === "superseded") {
        if (!required(data, "valid_to")) add(findings, "error", "superseded_relation_missing_valid_to", fileRel, "Superseded relation is missing valid_to.");
        if (!required(data, "superseded_by")) add(findings, "error", "superseded_relation_missing_superseded_by", fileRel, "Superseded relation is missing superseded_by.");
      }
    }

    if (type === "relation_candidate") {
      if (!required(data, "source_document")) add(findings, "error", "relation_candidate_missing_source", fileRel, "Relation candidate is missing source_document.");
      if (Array.isArray(data.contradiction_candidates) && data.contradiction_candidates.length > 0) relationCandidatesWithContradictions.push(fileRel);
    }

    if (type === "contradiction_event") {
      contradictionFiles.add(fileRel);
      if (!required(data, "status")) add(findings, "error", "contradiction_missing_status", fileRel, "Contradiction event is missing status.");
      else if (!VALID_CONTRADICTION_STATUS.has(String(data.status))) add(findings, "warning", "invalid_contradiction_status", fileRel, `Unexpected contradiction status: ${data.status}.`);
      const sources = data.source_documents;
      if (!sources || (Array.isArray(sources) && sources.length === 0)) add(findings, "error", "contradiction_missing_source_documents", fileRel, "Contradiction event is missing source_documents.");
      if (String(data.status) === "resolved") {
        if (!required(data, "resolved_by")) add(findings, "error", "resolved_contradiction_missing_resolved_by", fileRel, "Resolved contradiction is missing resolved_by.");
        if (!required(data, "resolved_at")) add(findings, "error", "resolved_contradiction_missing_resolved_at", fileRel, "Resolved contradiction is missing resolved_at.");
      }
    }

    if (type === "ingest_log_entry") {
      for (const key of ["source_document", "ingest_timestamp", "extraction_version"]) {
        if (!required(data, key)) add(findings, "warning", `ingest_log_missing_${key}`, fileRel, `Ingest log entry is missing ${key}.`);
      }
    }
  }

  for (const [id, files] of entityIds) if (files.length > 1) add(findings, "error", "duplicate_entity_id", files.join(", "), `Duplicate entity_id: ${id}.`);
  for (const [name, files] of canonicalNames) if (files.length > 1) add(findings, "warning", "duplicate_canonical_name", files.join(", "), `Duplicate canonical name: ${name}.`);
  for (const [alias, files] of aliases) if (alias && files.length > 1) add(findings, "warning", "entity_alias_collision", files.join(", "), `Alias appears on multiple active entities: ${alias}.`);
  if (relationCandidatesWithContradictions.length > 0 && contradictionFiles.size === 0) {
    for (const file of relationCandidatesWithContradictions) add(findings, "warning", "relation_candidate_without_contradiction_event", file, "Relation candidate has contradiction candidates but no contradiction event files exist.");
  }

  const summary: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) summary[finding.severity]++;
  return { summary, findings };
}

export function buildGraph(root = process.cwd()): GraphReport {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const files = listMarkdown(root);
  const sourceByTitle = new Map<string, string>();

  for (const file of files) {
    const fileRel = rel(root, file);
    if (fileRel.startsWith("2. Source material/")) sourceByTitle.set(titleFromFile(file), fileRel);
  }

  for (const file of files) {
    const fileRel = rel(root, file);
    const content = readFileSync(file, "utf8");
    const data = parseFrontmatter(content);
    const type = String(data.type || "");

    if (fileRel.startsWith("2. Source material/")) {
      nodes.push({ id: fileRel, type: "source_document", label: titleFromFile(file), file: fileRel });
    } else if (type === "entity") {
      const id = String(data.entity_id || data.id || fileRel);
      nodes.push({ id, type: "entity", label: String(data.canonical_name || titleFromFile(file)), file: fileRel });
      addSourceEdge(edges, id, data.created_from || data.source_document, fileRel, sourceByTitle);
    } else if (type === "entity_candidate") {
      const id = String(data.candidate_id || fileRel);
      nodes.push({ id, type: "entity_candidate", label: String(data.proposed_canonical_name || titleFromFile(file)), file: fileRel });
      addSourceEdge(edges, id, data.source_document, fileRel, sourceByTitle);
      for (const match of Array.isArray(data.candidate_matches) ? data.candidate_matches : []) edges.push({ from: id, to: String(match), type: "candidate_match", source: fileRel });
    } else if (type === "relation") {
      const id = String(data.relation_id || data.id || fileRel);
      nodes.push({ id, type: "relation", label: String(data.predicate || titleFromFile(file)), file: fileRel });
      if (data.subject_id && data.object_id) edges.push({ from: String(data.subject_id), to: String(data.object_id), type: "relates_to", source: fileRel });
      addSourceEdge(edges, id, data.source_document || data.source, fileRel, sourceByTitle);
      if (data.superseded_by) edges.push({ from: id, to: String(data.superseded_by), type: "superseded_by", source: fileRel });
    } else if (type === "relation_candidate") {
      const id = String(data.candidate_id || fileRel);
      nodes.push({ id, type: "relation_candidate", label: String(data.predicate || titleFromFile(file)), file: fileRel });
      addSourceEdge(edges, id, data.source_document, fileRel, sourceByTitle);
      for (const match of Array.isArray(data.candidate_matches) ? data.candidate_matches : []) edges.push({ from: id, to: String(match), type: "candidate_match", source: fileRel });
      for (const match of Array.isArray(data.contradiction_candidates) ? data.contradiction_candidates : []) edges.push({ from: id, to: String(match), type: "contradicts", source: fileRel });
    } else if (type === "contradiction_event") {
      const id = String(data.event_id || fileRel);
      nodes.push({ id, type: "contradiction_event", label: titleFromFile(file), file: fileRel });
      if (data.old_relation_id) edges.push({ from: id, to: String(data.old_relation_id), type: "contradicts", source: fileRel });
      if (data.new_relation_candidate_id) edges.push({ from: id, to: String(data.new_relation_candidate_id), type: "contradicts", source: fileRel });
    } else if (fileRel.startsWith("6. Zettelkasten/Concepts/")) {
      nodes.push({ id: fileRel, type: "concept_page", label: titleFromFile(file), file: fileRel });
    }
  }
  return { generated_at: new Date().toISOString(), nodes, edges };
}

function addSourceEdge(edges: GraphEdge[], from: string, source: any, file: string, sourceByTitle: Map<string, string>) {
  if (!source) return;
  const sourceName = String(source).match(/\[\[([^\]]+)\]\]/)?.[1] || String(source);
  const target = sourceByTitle.get(sourceName) || sourceName;
  edges.push({ from, to: target, type: "sourced_from", source: file });
}

export function generateCandidateScaffold(root: string, sourcePath: string): { created: string[] } {
  const fullSource = join(root, sourcePath);
  if (!existsSync(fullSource)) throw new Error(`Source not found: ${sourcePath}`);
  const sourceTitle = titleFromFile(fullSource);
  const sourceLink = `[[${sourceTitle}]]`;
  const slug = slugify(sourceTitle);
  const now = new Date().toISOString();
  const date = now.slice(0, 10);
  const created: string[] = [];

  const entityPath = join(root, "6. Zettelkasten/Entities", `${sourceTitle} Entity Candidate.md`);
  writeNew(entityPath, `---\ntype: entity_candidate\ncandidate_id: entity_candidate_${slug}_${date}\nproposed_canonical_name: ""\naliases: []\nkind: ""\nsource_document: "${sourceLink}"\nsource_section_or_chunk: "# notes"\nextracted_at: ${now}\nextraction_version: kg-schema-v1\ncandidate_matches: []\nconfidence: 0.0\nstatus: review_required\n---\n\n# Entity Candidate: ${sourceTitle}\n\n## Proposal\n\n## Evidence\n- ${sourceLink} -- section or excerpt hash:\n\n## Candidate matches\n- \n\n## Review notes\n- \n`);
  created.push(rel(root, entityPath));

  const relationPath = join(root, "6. Zettelkasten/Relations", `${sourceTitle} Relation Candidate.md`);
  writeNew(relationPath, `---\ntype: relation_candidate\ncandidate_id: relation_candidate_${slug}_${date}\nproposed_subject: ""\npredicate: ""\nproposed_object: ""\nsource_document: "${sourceLink}"\nevidence_reference: "# notes"\nevidence_excerpt_hash: ""\ncandidate_matches: []\ncontradiction_candidates: []\nconfidence: 0.0\nstatus: review_required\nextracted_at: ${now}\nextraction_version: kg-schema-v1\n---\n\n# Relation Candidate: ${sourceTitle}\n\n## Proposed relation\n\n## Evidence\n- ${sourceLink} -- excerpt or section reference:\n\n## Candidate matches\n- \n\n## Contradiction candidates\n- \n\n## Review notes\n- \n`);
  created.push(rel(root, relationPath));

  const logPath = join(root, "4. Indexes/Ingest Logs", `${sourceTitle} Ingest Log.md`);
  writeNew(logPath, `---\ntype: ingest_log_entry\nsource_document: "${sourceLink}"\ningest_timestamp: ${now}\nextraction_version: kg-schema-v1\nentities_proposed: ["${rel(root, entityPath)}"]\nrelations_proposed: ["${rel(root, relationPath)}"]\ncontradictions_found: []\npages_updated: []\nreview_items_created: ["${rel(root, entityPath)}", "${rel(root, relationPath)}"]\n---\n\n# Ingest Log: ${sourceTitle}\n\n- Source document: ${sourceLink}\n- Extraction version: kg-schema-v1\n- Entities proposed: [[${sourceTitle} Entity Candidate]]\n- Relations proposed: [[${sourceTitle} Relation Candidate]]\n- Contradictions found: none declared\n- Pages updated: none\n- Review items created: entity candidate, relation candidate\n`);
  created.push(rel(root, logPath));

  return { created };
}

function writeNew(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, content);
}

export function writeMarkdownLintReport(root: string, report: LintReport): string {
  const out = join(root, "4. Indexes", "kg-lint-report.md");
  mkdirSync(dirname(out), { recursive: true });
  const lines = [
    "# KG Lint Report",
    "",
    "## Summary",
    `- errors: ${report.summary.error}`,
    `- warnings: ${report.summary.warning}`,
    `- info: ${report.summary.info}`,
    "",
    "## Findings",
    ...report.findings.map((f) => `- [${f.severity}] ${f.code}: ${f.file} -- ${f.message}`),
    "",
  ];
  writeFileSync(out, lines.join("\n"));
  return rel(root, out);
}

export function writeGraphReports(root: string, graph: GraphReport): string[] {
  const dir = join(root, "4. Indexes");
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "kg-graph.json");
  const mdPath = join(dir, "kg-graph-report.md");
  writeFileSync(jsonPath, JSON.stringify(graph, null, 2) + "\n");
  writeFileSync(mdPath, [
    "# KG Graph Report",
    "",
    `Generated: ${graph.generated_at}`,
    "",
    "## Summary",
    `- nodes: ${graph.nodes.length}`,
    `- edges: ${graph.edges.length}`,
    "",
  ].join("\n"));
  return [rel(root, jsonPath), rel(root, mdPath)];
}

export function formatLintReport(report: LintReport): string {
  const lines = [
    "KG Lint Report",
    "",
    "Summary:",
    `- errors: ${report.summary.error}`,
    `- warnings: ${report.summary.warning}`,
    `- info: ${report.summary.info}`,
    "",
    "Findings:",
  ];
  for (const finding of report.findings) lines.push(`[${finding.severity}] ${finding.code}: ${finding.file} -- ${finding.message}`);
  return lines.join("\n");
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "source";
}
