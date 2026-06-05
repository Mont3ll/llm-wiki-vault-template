# AGENTS.md -- LLM Wiki Vault Schema

This file is the operating contract for AI agents working in an LLM Wiki vault. Copy it to `AGENTS.md` in a new vault and customize project-specific details.

## Critical rules

1. Read this file, the canonical index, and the tail of the operations log before substantive work.
2. Never modify raw source bodies after capture. Append only structured integration sections.
3. Every factual claim in wiki pages should cite an ingested source note.
4. Preserve provenance chains for secondhand or unread sources.
5. Maintain bidirectional backlinks between wiki pages and cited sources.
6. Put entity, concept, and comparison pages in their typed subfolders.
7. Use wiki-link tag stubs, not hashtag syntax, for durable tags.
8. Update the canonical index and append to the operations log on every wiki mutation.
9. Bump `updated:` frontmatter on every typed page touched.
10. Propose before destructive changes, contradiction resolution, batch ingests, and schema changes.

## Layer model

| Layer | Folder | Purpose | Mutability |
|---|---|---|---|
| Raw sources | `2. Source material/` | Captured source notes | Source bodies immutable |
| Wiki | `6. Zettelkasten/`, `4. Indexes/` | Synthesized knowledge | Agent-maintained |
| Schema/templates | `AGENTS.md`, `5. Templates/` | Operating rules and page formats | Updated deliberately |

## Folder map

- `1. Rough Notes/` -- human scratch space; agents read but do not write unless asked.
- `2. Source material/` -- articles, books, papers, videos, and source documentation.
- `3. Tags/` -- lowercase wiki-link tag stubs.
- `4. Indexes/` -- canonical index, operations log, MOCs, dashboard, analytics, flashcards.
- `5. Templates/` -- page templates.
- `6. Zettelkasten/` -- wiki pages; typed subfolders for concepts, entities, comparisons.
- `7. Journal/` -- research session journal entries.
- `8. Presentations/` -- slide decks derived from wiki content.

## Page types

### Source summary

Source notes live under `2. Source material/`. The original `# reference` and `# notes` sections are immutable after capture. Agents may append or update integration sections.

```markdown
# reference
<URL or citation>

# status
#primary | #secondhand | #unread

# notes
<raw source content; immutable after capture>

# key takeaways
- ...

# wiki updates
- [[Page Name]] -- created or updated

# cited by
- [[Wiki Page]]

# extraction version
kg-schema-v1

# ingested
YYYY-MM-DD HH:MM
```

### Atomic note

Atomic notes live in `6. Zettelkasten/` root and use plain-text metadata rather than YAML:

```markdown

YYYY-MM-DD HH:MM

Status:

Tags: [[tag]]

# Note Title


# References
```

### Entity page

Entities are people, tools, organizations, projects, places, or products. Store them in `6. Zettelkasten/Entities/` with YAML frontmatter.

```markdown
---
type: entity
kind: tool
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
---

# Entity Name

## Summary

## Key facts

## Related

## Sources
```

### Concept page

Concept pages live in `6. Zettelkasten/Concepts/`.

```markdown
---
type: concept
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
---

# Concept Name

## Definition

## Origin / context

## Mechanics

## Examples

## Critiques / limitations

## Related

## Sources
```

### Comparison page

Comparison pages live in `6. Zettelkasten/Comparisons/`.

```markdown
---
type: comparison
items: [[A]], [[B]]
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
---

# A vs B

## Summary

## Comparison table

## Detail

## Sources
```

### MOC / synthesis page

MOCs live in the index layer and organize clusters of pages.

```markdown
---
type: moc
updated: YYYY-MM-DD
---

# Theme

## Overview

## Pages

## Open questions
```

## Incremental KG Governance

Incremental ingest is not just extraction. It is reconciliation. Every new source can introduce duplicate entities, superseded relations, and contradictions with existing pages. The vault treats these as reviewable graph events rather than silently merging them.

Core rules:

- Every extraction is tied to a source document, source section or chunk, timestamp, and extraction version.
- Stable entity IDs are required. Names are not enough.
- Possible duplicates and contradictions are stored as reviewable events.
- Relationship changes are versioned over time.
- Every entity, relation, and contradiction needs provenance and confidence.
- Conflict resolution considers source authority, evidence specificity, recency, scope, risk, and review state.
- The LLM may propose entity and relation updates, but it must not silently merge ambiguous entities or overwrite relations.

### Schema concepts

SourceDocument:
- immutable source note
- reference
- notes
- key takeaways
- wiki updates
- cited by
- ingested timestamp
- extraction version

Entity:
- stable entity ID
- canonical name
- aliases
- type
- source references
- status
- created_from
- updated_at

EntityCandidate:
- candidate ID
- proposed canonical name
- aliases
- type
- source document
- source section or chunk
- extracted_at
- extraction_version
- candidate_matches
- confidence
- status: candidate, review_required, merged, rejected

Relation:
- stable relation ID
- subject_id
- predicate
- object_id
- source document
- evidence reference or excerpt hash
- confidence
- valid_from
- valid_to
- superseded_by
- status: active, superseded, contested, rejected

RelationCandidate:
- candidate ID
- proposed subject
- predicate
- proposed object
- source document
- evidence reference or excerpt hash
- candidate_matches
- contradiction_candidates
- confidence
- status

ContradictionEvent:
- event ID
- old relation ID
- new relation candidate ID
- source documents
- reason
- source authority comparison
- status: contested, resolved, rejected
- resolution note
- resolved_by
- resolved_at

IngestLogEntry:
- source document
- ingest timestamp
- extraction version
- entities proposed
- relations proposed
- contradictions found
- pages updated
- review items created

### Source authority

Conflict resolution is not just confidence. Suggested authority hierarchy:

```text
official primary source
> peer-reviewed paper or specification
> maintainer-authored documentation
> first-party technical article
> secondary summary
> model-generated extraction
```

A newer source does not automatically win. A higher-confidence extraction does not automatically win. The vault resolves contradictions only when authority, evidence specificity, scope, and review state are clear. Human review is required when authority is unclear or impact is high.

### Entity resolution

Stable entity IDs are required. Names are not enough. Aliases should be tracked. Embedding similarity can propose matches, but it should not silently merge ambiguous entities. Candidate matches should be reviewable. Merges should preserve provenance.

Flow:

```text
new source
-> extract entity candidates
-> compare by exact name, alias, type, source context, and embedding similarity
-> create candidate_matches
-> if high certainty and low risk, propose merge
-> if uncertain, keep as review_required
-> if accepted, merge into stable entity ID with provenance preserved
```

### Relation versioning

Do not overwrite old relations. Expire or supersede them. Use `valid_from` and `valid_to`. Link old relation to new relation through `superseded_by`. Keep the original source chain intact. Use contradiction events when there is unresolved conflict.

```yaml
relation:
  id: rel_langgraph_supports_agent_workflows_2026_06_05
  subject_id: entity_langgraph
  predicate: supports
  object_id: concept_agent_workflows
  source: "[[Source Document]]"
  evidence_excerpt_hash: "..."
  confidence: 0.82
  valid_from: "2026-06-05"
  valid_to: null
  superseded_by: null
  status: active
```

When superseded:

```yaml
valid_to: "2026-08-12"
superseded_by: rel_langgraph_supports_agent_workflows_2026_08_12
status: superseded
```

### Contradiction and resolution lifecycle

```text
candidate relation
-> potential duplicate
-> potential contradiction
-> contradiction event
-> contested relation
-> resolved relation or rejected candidate
```

Candidate relation: newly extracted from a source, not yet accepted.

Contested relation: conflicts with an active relation and neither source clearly wins.

Resolved relation: accepted after source authority, evidence specificity, scope, recency, and review state are sufficient.

### PI-vault boundary

PI operational memory graph:
- MemoryRecord
- EvidenceRecord
- CaptureCandidate
- Patch
- ReinforcementEvent
- Inquiry
- Tombstone
- MetaConsolidationCandidate
- ProcedureCandidate

Purpose: govern agent behavior and operational beliefs.

Vault research knowledge graph:
- SourceDocument
- Entity
- Concept
- Claim
- Relation
- Citation
- ContradictionEvent
- IndexEntry
- IngestLog

Purpose: govern source-backed research knowledge. PI can propose vault-promotion candidates, but the vault applies its own citation and provenance governance before accepting them. No automatic PI-to-vault mutation is allowed.

## Citation discipline

The wiki should remain traceable to sources.

- Cite source notes with `[[Source Title]]` links.
- A citation is valid only when the target source note exists in `2. Source material/`.
- Multiple sources may be chained inline.
- Definitions and obvious common knowledge may be uncited; claims a reader could reasonably challenge should be cited.
- Pages with uncited factual claims should be marked draft or low confidence until fixed.

## Source provenance

Use provenance status tags in source notes:

| Status | Meaning |
|---|---|
| `#primary` | Source was read and ingested directly. |
| `#secondhand` | Claim is known through another source, usually a review or synthesis. |
| `#unread` | Stub exists but source has not been read. |

When citing secondhand or unread sources, surface the chain in prose rather than presenting the underlying source as directly read.

Stub sources should include:

```markdown
# claims attributed
- Claim -- as cited in [[Synthesis Source]]

# provenance
- Stub created from [[Synthesis Source]]; not yet read directly.
```

## Bidirectional backlinks

When a wiki page cites a source, add the wiki page to that source's `# cited by` section in the same operation.

This applies to:

- wiki page → source citations
- MOC/index page → source citations
- source → source citations in literature-review or synthesis workflows

Lint should flag directional mismatches.

## Index and log

Maintain two vault-specific files:

- canonical index -- a catalog of sources, entities, concepts, comparisons, atomic notes, and MOCs
- operations log -- append-only chronological record of ingests, queries, lint passes, notes, and schema changes

The index is for navigation. The log is for auditability.

Recommended log heading format:

```markdown
## [YYYY-MM-DD HH:MM] <op> | <title>
```

Where `<op>` is one of:

- `ingest`
- `query`
- `lint`
- `note`
- `schema`

## Operations

### Ingest

1. Capture or read the immutable source note.
2. Extract key takeaways and proposed emphasis.
3. Extract entity candidates.
4. Extract relation candidates.
5. Compare candidates against existing entities and relations by exact name, alias, type, source context, and similarity.
6. Create reviewable duplicate or contradiction events when candidates overlap or conflict with existing knowledge.
7. Update wiki pages only after review, or when the authority model is clear and the change is low-risk under this schema.
8. Append source integration sections without changing raw source content.
9. Add source backlinks in `# cited by`.
10. Create tag stubs as needed.
11. Update the canonical index.
12. Append to the operations log with extraction version and review items created.
13. Bump `updated:` on every typed page touched.

The LLM may propose entity and relation updates. It should not silently merge ambiguous entities. It should not silently overwrite relations. Structural fixes should wait for human approval unless low-risk and explicitly allowed by this schema.

### Batch ingest

Use batch ingest for literature reviews, systematic surveys, books, or any source that introduces many secondary citations.

1. Read the synthesis source.
2. Propose the scope: source summary, stub sources, wiki pages, MOC(s), and tag stubs.
3. Wait for approval before writing large batches.
4. Create the synthesis source as primary if read directly.
5. Create stub sources for cited works that were not read directly.
6. Surface provenance chains in wiki claims.
7. Update index and log once at the end of the batch.

### Query

1. Read the canonical index.
2. Read relevant pages in full; do not infer from titles alone.
3. Answer with citations to source notes.
4. Offer to save durable synthesis back into the wiki.
5. Log only if the query produced a wiki mutation.

### Lint

Check:

- citation discipline
- broken citations
- bidirectional backlinks
- provenance chain integrity
- stale claims
- contradictions
- orphan pages
- missing pages
- missing cross-references
- index drift
- data gaps and promotion candidates
- duplicate entity candidates
- unresolved high-similarity entity candidates
- relation candidates contradicting active relations
- active relation with superseded source
- relation missing source citation
- relation missing `valid_from`
- superseded relation missing `valid_to`
- contradiction event without resolution status
- entity alias collision
- stale relation referencing an older source when a newer relevant source exists
- unresolved contradiction older than the configured review window

Output a checklist report. Lint should not silently mutate the vault. Propose structural fixes before applying them.

### Flashcards

When generating flashcards, append to the vault flashcards page only. Do not regenerate existing cards unless explicitly asked.

### Journal entries

Research session journal entries should capture goal, work done, key decisions, and open questions.

### Presentations

Slide decks should be generated from cited wiki content. Strip wiki-link syntax only when preparing export-facing slides.

## Tags and naming conventions

- Use `[[tag]]` links to stubs in `3. Tags/`; avoid hashtag syntax for durable tags.
- Stub filenames should be lowercase and usually single-word or hyphenated.
- Use natural-language title case filenames.
- Use `[[Internal Links]]` matching target filenames without aliases unless necessary.
- Preserve numbered top-level folders.
- Use ATX headings only (`#`, `##`, `###`).
- Use fenced code blocks with language identifiers.

## Recommended tooling

Useful Obsidian plugins:

- Dataview -- query YAML/frontmatter-backed wiki pages.
- Charts View -- render chart blocks in analytics pages.
- Marp Slides -- author and export decks from presentation notes.
- Spaced Repetition -- review flashcards from the flashcards page.
- Obsidian Web Clipper -- capture web sources for ingest.
- Local Images Plus -- localize images from clipped or remote content.
- Excalidraw -- attach diagrams to wiki pages.

Useful CLI tooling:

- qmd -- keyword, vector, and hybrid search over the vault.

Recommended qmd workflow:

1. Register the vault as a qmd collection.
2. Add folder contexts for sources, indexes, and wiki pages.
3. Generate embeddings when semantic search is desired.
4. Read the canonical index first, then use qmd to retrieve candidates, then read pages in full.

## Customization checklist

- Define source provenance tags and confidence levels.
- Decide which source subfolders are needed.
- Customize page templates for the domain.
- Decide the canonical names and locations for the index and operations log.
- Add tool-specific guidance for search, citation lookup, export, or publication workflows.
- Decide which working files, generated files, and application state should stay out of git.
