---
type: dashboard
updated: YYYY-MM-DD
---

# Wiki Dashboard

## Low-confidence pages
```dataview
TABLE type, confidence FROM "6. Zettelkasten" WHERE confidence != "high" SORT updated ASC
```

## Recently updated
```dataview
TABLE type, updated FROM "6. Zettelkasten" SORT updated DESC LIMIT 10
```

## Orphan check (no inbound links)
```dataview
TABLE file.inlinks FROM "6. Zettelkasten" WHERE length(file.inlinks) = 0
```

## Entity overview
```dataview
TABLE kind, confidence, updated FROM "6. Zettelkasten" WHERE type = "entity" SORT kind ASC
```
