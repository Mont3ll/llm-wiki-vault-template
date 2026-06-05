# LLM Wiki Vault Template

An Obsidian vault template for building a Karpathy-style **LLM Wiki**: immutable source notes, citation-backed wiki pages, a canonical index, and an append-only operations log.

Use this template as a starting point for an agent-maintained research wiki. The repository provides folder structure, reusable templates, and an agent schema; each vault created from it develops its own source library, wiki pages, index, and log.

## Reference concept

This template instantiates Andrej Karpathy's LLM Wiki pattern: <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>.

Karpathy frames the core shift as moving from repeated retrieval over raw documents to a persistent, compounding wiki that the LLM maintains over time. Raw sources remain immutable; the wiki becomes a maintained synthesis layer; the schema tells the agent how to operate.

## Core idea

An LLM Wiki separates knowledge into three layers:

| Layer | Purpose | Mutability |
|---|---|---|
| Raw sources | Articles, papers, books, videos, docs, and copied source text | Immutable after capture |
| Wiki pages | Concepts, entities, comparisons, atomic notes, and MOCs synthesized from sources | Continuously maintained |
| Index/log | Navigation catalog and chronological operations record | Updated on every wiki operation |

The pattern is designed for agent-assisted knowledge work: the human supplies direction and sources; the agent performs summarization, integration, backlink maintenance, indexing, and logging under a written schema.

## Folder structure

```text
1. Rough Notes/                 Human scratch space; read-only by default for agents
2. Source material/             Raw source notes; source bodies are immutable
  Articles/
  Books/
  Papers/
  Videos/
  Source Documentation/
3. Tags/                        Wiki-link tag stubs
4. Indexes/                     Canonical index, operations log, dashboards, MOCs
5. Templates/                   Page templates
6. Zettelkasten/                Wiki pages and atomic notes
  Concepts/
  Entities/
  Comparisons/
7. Journal/                     Research session journals
8. Presentations/               Slide decks derived from wiki content
```

## Required operating files

Create these when starting a new vault:

- `AGENTS.md` -- copy from `AGENTS.template.md` and customize for your vault.
- canonical index -- catalog of sources, pages, comparisons, atomic notes, and MOCs.
- operations log -- append-only chronological record of ingests, queries, lint passes, notes, and schema changes.

The index and log are core parts of the LLM Wiki architecture. This template tracks the folder structure and page templates; each working vault maintains its own index/log contents.

## Agent operating rules

The schema in `AGENTS.template.md` encodes the key rules:

- read the schema, index, and recent log before substantive operations
- never modify raw source bodies after capture
- cite factual claims with ingested source links
- maintain bidirectional source backlinks
- surface provenance chains for unread or secondhand sources
- place entity/concept/comparison pages in typed folders
- use wiki-link tag stubs rather than hashtag syntax
- update the canonical index and append to the operations log on every wiki mutation
- propose before destructive changes, contradiction resolution, batch ingests, and schema changes

## Page types

Templates are provided for:

- source summaries
- atomic notes
- concepts
- entities
- comparisons
- entity candidates
- relations
- relation candidates
- contradiction events
- ingest log entries
- MOCs/dashboards/analytics/flashcards
- journal entries
- presentations

Use the templates as starting points, then adapt the schema to your domain.

## Incremental KG Governance

Incremental ingest is not just extraction. It is reconciliation. Every new source can introduce duplicate entities, superseded relations, and contradictions with existing pages. The vault treats these as reviewable graph events rather than silently merging them.

This template keeps raw source notes authoritative and adds a public-safe architecture for incremental knowledge graph construction:

- every extraction is tied to a source document, source section or chunk, timestamp, and extraction version
- entities use stable IDs, not name-only matching
- aliases are tracked explicitly
- similarity proposes candidate matches, but similarity is not identity
- candidate entities and candidate relations are reviewable artifacts before they become resolved knowledge
- relations are versioned over time instead of overwritten
- contradictions are stored as reviewable events
- every entity, relation, and contradiction traces back to source evidence

The vault is not a graph database first. It is a citation-governed knowledge system that can project into graph form. Graph tooling can be layered on later, but the durable value is the source-backed provenance and review lifecycle.

### Schema concepts

| Concept | Purpose | Key fields |
|---|---|---|
| `SourceDocument` | Immutable source note plus integration metadata | reference, notes, key takeaways, wiki updates, cited by, ingested timestamp, extraction version |
| `Entity` | Resolved stable entity page | stable entity ID, canonical name, aliases, type, source references, status, created_from, updated_at |
| `EntityCandidate` | Reviewable proposed entity | candidate ID, proposed canonical name, aliases, type, source document, source section or chunk, extracted_at, extraction_version, candidate_matches, confidence, status |
| `Relation` | Resolved source-backed edge | stable relation ID, subject_id, predicate, object_id, source document, evidence reference or excerpt hash, confidence, valid_from, valid_to, superseded_by, status |
| `RelationCandidate` | Reviewable proposed edge | candidate ID, proposed subject, predicate, proposed object, source document, evidence reference or excerpt hash, candidate_matches, contradiction_candidates, confidence, status |
| `ContradictionEvent` | Reviewable conflict between active knowledge and a new candidate | event ID, old relation ID, new relation candidate ID, source documents, reason, source authority comparison, status, resolution note, resolved_by, resolved_at |
| `IngestLogEntry` | Audit record for one ingest run | source document, ingest timestamp, extraction version, entities proposed, relations proposed, contradictions found, pages updated, review items created |

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

Stable entity IDs are required. Names are not enough. Aliases should be tracked, and merges should preserve provenance from every contributing source.

Suggested flow:

```text
new source
-> extract entity candidates
-> compare by exact name, alias, type, source context, and embedding similarity
-> create candidate_matches
-> if high certainty and low risk, propose merge
-> if uncertain, keep as review_required
-> if accepted, merge into stable entity ID with provenance preserved
```

Embedding similarity can suggest matches, but it should not silently merge ambiguous entities.

### Relation versioning

Do not overwrite old relations. Expire or supersede them. Keep the original source chain intact. Use `valid_from`, `valid_to`, and `superseded_by`; use contradiction events when conflict is unresolved.

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

### Contradiction lifecycle

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


## Recommended Obsidian plugins

These plugins are optional, but they make the template substantially more useful:

| Plugin | Use in the LLM Wiki |
|---|---|
| Dataview | Query frontmatter on entity, concept, comparison, dashboard, and MOC pages. |
| Charts View | Render chart blocks in analytics pages. |
| Marp Slides | Author and export slide decks from `8. Presentations/`. |
| Spaced Repetition | Turn `4. Indexes/flashcards.md` into a review deck. |
| Obsidian Web Clipper | Capture web articles into source notes for later ingest. |
| Local Images Plus | Localize remote images from clipped sources so source notes remain durable. |
| Excalidraw | Link hand-drawn diagrams or architecture sketches from wiki pages. |

A plugin named “qmd as md” may be useful for workflows that expose qmd output inside Obsidian, but it is not required for the CLI/qmd setup described below. The template’s qmd integration assumes the qmd command-line tool indexes the vault folder directly.

## qmd setup

[`qmd`](https://github.com/tobi/qmd) can index the vault for keyword, semantic, and hybrid search. It is not required for the folder schema, but it gives agents a fast way to retrieve relevant sources and wiki pages.

Typical setup:

```bash
# Install qmd if needed
bun add -g @tobilu/qmd

# Register the vault as a collection
qmd collection add /path/to/your/vault --name vault

# Add useful folder contexts
qmd context add qmd://vault/ "LLM Wiki vault: source notes, wiki pages, index, log, MOCs, and templates" -c vault
qmd context add qmd://vault/2.%20Source%20material "Raw source summaries and immutable source notes" -c vault
qmd context add qmd://vault/4.%20Indexes "Canonical index, operations log, dashboards, analytics, flashcards, and MOCs" -c vault
qmd context add qmd://vault/6.%20Zettelkasten "Synthesized wiki pages: atomic notes, concepts, entities, and comparisons" -c vault

# Build embeddings for semantic/hybrid search
qmd embed -c vault
```

Useful commands:

```bash
qmd search "query terms" -c vault      # keyword/BM25 search
qmd vsearch "query terms" -c vault     # semantic vector search
qmd query "query terms" -c vault       # hybrid + reranking, when models are available
qmd get "6. Zettelkasten/Concepts/Example.md" --full
```

For agent workflows, the common pattern is:

1. read the canonical index first
2. use qmd search/query for follow-up retrieval
3. read relevant pages in full
4. answer or mutate the wiki with citations and log updates

## Trade-offs, concerns, and related approaches

Karpathy's original gist is intentionally abstract. The surrounding discussion and follow-on implementations raise several useful concerns that this template addresses at the schema level.

| Concern | Why it matters | Template response |
|---|---|---|
| Compounding hallucinations | If generated prose becomes a source of truth, errors can be reused and amplified. | Raw sources are immutable, factual claims cite source notes, secondhand provenance is surfaced, and lint checks citation drift. |
| Loss of traceability | A wiki summary can hide details from the original document. | Source notes stay available; citations point back to ingested sources; source backlinks make provenance auditable. |
| Stale or contradictory claims | New sources can invalidate older synthesis. | Ingest and lint workflows require contradiction events and relation supersession rather than silent overwrite. |
| Incremental KG drift | New sources can create duplicate entities, stale edges, or fragmented subgraphs. | The template treats ingest as reconciliation: entity candidates, relation candidates, source authority checks, relation versioning, and reviewable contradiction events. |
| Flat wikilinks lack semantics | A plain `[[link]]` does not distinguish support, contradiction, supersession, or relatedness. | The template keeps standard Obsidian links for portability, but adds reviewable relation templates and lint checks for contradiction/supersession. Teams needing typed edges can add typed-link plugins or graph backends. |
| Scaling beyond the index file | A single catalog works at small scale but can fray as the vault grows. | The index remains the first navigation layer; qmd adds BM25/vector/hybrid retrieval; folder contexts help agents search source, index, and wiki layers separately. |
| RAG vs LLM Wiki | RAG is better for frequently changing corpora and exact source lookup; LLM Wiki is better for curated synthesis that should compound. | The template is not anti-RAG: qmd search complements the wiki, and source-first citation rules keep raw documents authoritative. |
| Team or production trust | Automated wiki writing can become risky without review gates. | Batch ingest, destructive changes, contradictions, schema changes, and lint fixes require proposal-before-mutation workflows. |

Related approaches and extensions in the ecosystem include:

- typed wikilink approaches, such as `@supports`, `@contradicts`, or `@supersedes` relationship syntax, which make graph edges queryable
- graph-backed systems that import markdown into a persistent knowledge graph
- desktop or agent-skill implementations that automate setup, ingest, query, or lint flows
- hybrid RAG/wiki systems that compile stable synthesis while still retrieving raw sources for verification

This template chooses a conservative baseline: plain markdown, portable Obsidian conventions, explicit provenance, qmd retrieval, and human-review gates. More specialized graph or typed-link tooling can be layered on without changing the core folder/schema pattern.

## Relationship to Persistent Intelligence memory

This vault template pairs well with [`pi-persistent-intelligence`](https://github.com/Mont3ll/pi-persistent-intelligence), which adapts the Persistent Intelligence memory-as-policy model into a pi extension:

- the vault stores research-grade, citation-backed knowledge: source documents, entities, concepts, claims, citations, relations, contradiction events, index entries, and ingest logs
- PI memory stores operational preferences, workflows, development playbooks, reinforcement events, inquiries, tombstones, operational graph reports, and timeline reports
- recurring stable patterns can be proposed from PI memory as vault-promotion candidates

The contrast is useful: an LLM Wiki governs source-backed research synthesis and knowledge graph evolution, while Persistent Intelligence governs an agent's operational beliefs with evidence, confidence, review cadence, decay, and supersession. PI can emit structured vault-promotion artifacts, but the vault decides whether those candidates become citation-backed concepts, entities, claims, or relations. There is no automatic PI-to-vault mutation.

## Further reading

- Andrej Karpathy, “llm-wiki” gist: <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>
- MKHR, “Persistent Memory Design for PI Agent”: <https://mkhr.co.jp/posts/2026-02-15-persistent-memory-design-pi-agent>
- Urvil Joshi, “Andrej Karpathy’s LLM Wiki: Create your own knowledge base”: <https://medium.com/@urvvil08/andrej-karpathys-llm-wiki-create-your-own-knowledge-base-8779014accd5>
- Denser.ai, “From RAG to LLM Wiki”: <https://denser.ai/blog/llm-wiki-karpathy-knowledge-base/>
- Penfield Labs, “What Karpathy’s LLM Wiki Is Missing”: <https://dev.to/penfieldlabs/what-karpathys-llm-wiki-is-missing-and-how-to-fix-it-1988>
- Mehul Gupta, “Andrej Karpathy’s LLM Wiki is a Bad Idea”: <https://medium.com/data-science-in-your-pocket/andrej-karpathys-llm-wiki-is-a-bad-idea-8c7e8953c618>
- Anand Lahoti, “The Hidden Flaw in Karpathy’s LLM Wiki”: <https://foundanand.medium.com/the-hidden-flaw-in-karpathys-llm-wiki-e3a86a94b459>

## License

MIT
