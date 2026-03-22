# Testrun #2 — Ice's Review Notes

**Datum:** 2026-03-22
**Projekt:** agent-ops-dashboard
**Pipeline:** scaffoldkit → planforge

---

## ✅ Was gut lief

1. **Makefile generation** — korrekt, alle conditionals (SQLite → kein Docker DB service)
2. **Docker templates** — SQLite mode korrekt, kein db service, DATABASE_URL=file:./dev.db
3. **Pre-commit hooks** — .husky-pre-commit + lint-staged.config.js generiert
4. **npm install** — package-lock.json vorhanden ✅
5. **AI context** — .ai/ folder vollständig (AGENTS, ARCHITECTURE, DECISIONS, TASKS)
6. **planforge** — 8 Tasks generiert, korrekte Wave-Struktur, ADRs, Prompts
7. **BRANCH_INFO.md** — auto-detected "main" korrekt

---

## 🚨 Kritische Gaps (müssen gefixt werden)

### Gap #1 — Pattern Matching schlägt fehl für neue Domänen [KRITISCH]

**Problem:** Task 003 (GitHub health overview) bekommt AI-Chat-Patterns:
```
lib/ai/types.ts — ChatMessage, DashboardContext interfaces
lib/ai/context.ts — formatContextForAI() helper
app/api/chat/route.ts — POST chat endpoint
```

Das ist das `ai-assistant` Pattern — weil "ci" und "check" kein keyword in stack-patterns.json sind,
aber "ai" und "context" im Feature-Namen auftauchen? Oder falsch gematchted.

**Eigentlich benötigt:** GitHub API Client, repository health types, CI status components

**Gleiches Problem:** Task 005 (pipeline run history) → ebenfalls AI-Chat-Files

**Root Cause:** Stack patterns decken nur 5 Domains ab (auth, dashboard-widgets, ai-assistant, settings, responsive).
"GitHub health", "pipeline history", "alert system", "real-time polling" haben KEINE eigenen Patterns
→ Fallback auf generic `src/modules/...` ODER falsches Pattern matching

**Fix:** stack-patterns.json um weitere Domains erweitern ODER generic fallback verbessern

### Gap #2 — Generic Fallback produziert unsinnige Dateinamen [KRITISCH]

Task 004 generiert:
```
src/modules/agent-deployment-status-tracker-ice-lava-stone-agents/
  agent-deployment-status-tracker-ice-lava-stone-agents.service.ts
```
→ Feature-Namen 1:1 als Dateinamen — viel zu lang, nicht nutzbar

**Fix:** slugify() sollte kürzen (max 40 chars) oder nach erstem Verb/Noun stoppen

### Gap #3 — teamSize Schema akzeptiert keine Strings [MEDIUM]

`teamSize: "small"` → Validation error, muss Integer sein.
Sollte entweder string enum ("small"|"medium"|"large") oder klar dokumentiert sein.

### Gap #4 — scaffoldkit kein --var CLI Flag [MEDIUM]

Kein non-interactive mode → nicht scriptbar ohne Python-Workaround.
Für CI/Automation notwendig.

### Gap #5 — scaffoldkit Dockerfile Build Context falsch [MEDIUM]

`COPY blueprints/` schlägt fehl weil blueprints/ in src/scaffoldkit/blueprints/ liegt.

### Gap #6 — planforge cwd-Abhängigkeit [MEDIUM]

Muss aus eigenem Verzeichnis ausgeführt werden (relative Pfade auf models/, config/).
Für Integration in andere Workflows unpraktisch.

---

## 📊 Bewertung

| Aspekt | Run #1 (ai-dashboard) | Run #2 (agent-ops-dashboard) |
|--------|----------------------|------------------------------|
| Makefile | ❌ fehlte | ✅ generiert |
| Docker | ❌ fehlte | ✅ generiert |
| Pre-commit | ❌ fehlte | ✅ generiert |
| package-lock.json | ❌ fehlte | ✅ generiert |
| Pattern matching | ❌ generisch | ⚠️ falsch für neue Domänen |
| Dateinamen | ❌ generisch | ❌ zu lang (generic fallback) |
| teamSize | N/A | ❌ Schema-Fehler |

**Fazit:** Infrastructure-Layer deutlich besser (+4 Verbesserungen). Pattern-Matching ist der verbleibende Schwachpunkt.

---

## 🎯 Nächste Fixes (Priorität)

1. **[planforge]** matchPattern() Keyword-Set für Dashboard/GitHub/Pipeline/Alert/Realtime erweitern
2. **[planforge]** slugify() Länge begrenzen (max ~30 chars für Dateinamen)  
3. **[planforge]** teamSize Schema: integer → string enum
4. **[scaffoldkit]** --var CLI flag für non-interactive mode
5. **[scaffoldkit]** Dockerfile build context fix
6. **[planforge]** Absolute path support (--repo-root flag)
