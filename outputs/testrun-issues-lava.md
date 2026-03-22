# Testrun #2 Issues - Lava's Notes

**Project:** agent-ops-dashboard
**Pipeline:** scaffoldkit → planforge
**Date:** 2026-03-22
**Reporter:** Lava
**Result:** ✅ Successful, but with issues

---

## 🚨 CRITICAL ISSUES

### 1. scaffoldkit: No Non-Interactive Mode

**Problem:** No CLI flags to pass variables non-interactively

**Expected:**
```bash
scaffoldkit new nextjs-fullstack --var project_name=foo --var use_docker=true
```

**Actual:** Interactive prompts only, no --var flag exists

**Workaround:** Wrote custom Python script:
```python
from scaffoldkit.generator import generate
from scaffoldkit.models import GenerationContext
# ... programmatic API call
```

**Impact:**
- Cannot script scaffoldkit in CI/CD
- Cannot automate project generation
- Ice's instructions had --var flags that don't exist

**Fix Needed:**
- Add `--var key=value` repeatable flag
- Add `--vars-file vars.json` to load from JSON
- Add `--non-interactive` mode with defaults

**Evidence:** `/tmp/run-scaffoldkit.py` (workaround script)

---

### 2. scaffoldkit: Docker Build Failure

**Problem:** Dockerfile references wrong blueprint path

**Error:**
```
COPY blueprints/ /opt/scaffoldkit/blueprints/
ERROR: "/blueprints": not found
```

**Root Cause:** Blueprints actually live in `src/scaffoldkit/blueprints/`, not `blueprints/`

**Workaround:** Used venv install instead of Docker:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

**Impact:**
- Docker deployment doesn't work
- `scaffoldkit-docker` wrapper script unusable

**Fix Needed:**
- Update Dockerfile line 20: `COPY src/scaffoldkit/blueprints/ /opt/scaffoldkit/blueprints/`
- Test Docker build in CI

**File:** `/root/git/scaffoldkit/Dockerfile` line 20

---

### 3. scaffoldkit: System Package Conflicts

**Problem:** `pip install -e .` fails on Debian/Ubuntu systems

**Error:**
```
ERROR: Cannot uninstall typing_extensions 4.10.0, RECORD file not found.
Hint: The package was installed by debian.
```

**Workaround:** Created venv (see #2)

**Impact:**
- Installation instructions don't work out of the box
- Confusing for users

**Fix Needed:**
- Document venv/pipx as primary install method
- Add `pipx install .` to README
- Test on fresh Debian/Ubuntu VM

---

### 4. planforge: Must Run from Own Directory

**Problem:** planforge references config/models with relative paths

**Expected:** Can run from anywhere with absolute paths

**Actual:** Must `cd /root/git/agent-planforge` first

**Error when running from target dir:**
```
Unable to read models/planner-config.schema.json: ENOENT
```

**Workaround:**
```bash
cd /root/git/agent-planforge
node scripts/bootstrap-plan.js \
  --input /root/git/agent-ops-dashboard/planforge-input.json \
  --outdir /root/git/agent-ops-dashboard \
  --install
```

**Impact:**
- Not portable
- Confusing workflow
- Requires agent-planforge checkout

**Fix Needed:**
- Use `__dirname` or `path.resolve(__dirname, '../models/...')` for relative paths
- Or make paths configurable via CLI
- Document this requirement clearly

**File:** `/root/git/agent-planforge/scripts/bootstrap-plan.js`

---

### 5. planforge-input.json: teamSize Schema Validation

**Problem:** teamSize accepts string in Ice's example, but schema requires integer

**Ice's JSON:**
```json
"teamSize": "small"
```

**Schema requirement:** `teamSize must be integer`

**Fix applied:**
```json
"teamSize": 3
```

**Impact:**
- Ice's example JSON doesn't validate
- Unclear what values are valid

**Fix Needed:**
- Either: Allow string enum ("small", "medium", "large") in schema
- Or: Document that teamSize must be integer (1-10 or similar)
- Update all example JSONs to match schema

**Files:**
- `/root/git/agent-ops-dashboard/planforge-input.json` (Ice's original)
- `/root/git/agent-planforge/models/planning-input.schema.json`

---

## ⚠️ MEDIUM ISSUES

### 6. scaffoldkit: No package.json Generated

**Problem:** nextjs-fullstack blueprint doesn't generate package.json

**Expected:** scaffoldkit generates package.json with Next.js dependencies

**Actual:** planforge generates package.json later

**Impact:**
- scaffoldkit `--install` flag doesn't work (no package.json to install from)
- Can't test generated project immediately after scaffoldkit
- Weird that a Next.js blueprint doesn't include package.json

**Fix Needed:**
- Add `package.json.j2` template to nextjs-fullstack blueprint
- Include Next.js, React, Prisma dependencies
- Make conditional based on features:
  - `use_analytics` → recharts
  - `use_email` → nodemailer
  - `db_provider` → @prisma/client
  - `auth_strategy=jwt` → jsonwebtoken

---

### 7. planforge: Config Files Must Be Copied Manually

**Problem:** planforge expects config files in target directory

**Error:**
```
Unable to read /root/git/agent-ops-dashboard/config/planner-config.json
```

**Workaround:**
```bash
mkdir -p config
cp /root/git/agent-planforge/config/planner-config.json config/
cp /root/git/agent-planforge/config/stack-patterns.json config/
```

**Impact:**
- Manual step required
- Not documented

**Fix Needed:**
- planforge should copy default configs if missing
- Or embed configs in bootstrap-plan.js
- Document this requirement in README

---

### 8. File Modification Conflicts

**Problem:** planforge modifies files scaffoldkit generated

**Files modified by planforge:**
- `.ai/AGENTS.md` (scaffoldkit generated → planforge modified)
- `.ai/ARCHITECTURE.md` (scaffoldkit generated → planforge modified)
- `.ai/TASKS.md` (scaffoldkit generated → planforge modified)
- `.ai/DECISIONS.md` (scaffoldkit generated → planforge modified)
- `Makefile` (scaffoldkit generated → planforge added hooks target)
- `docker-compose.dev.yml` (scaffoldkit generated → planforge patterns added)
- `Dockerfile.dev` (scaffoldkit generated → planforge patterns added)

**Impact:**
- scaffoldkit output gets overwritten
- Hard to see what planforge added vs what scaffoldkit generated
- Merge conflicts if re-running scaffoldkit

**Fix Needed:**
- Document this behavior (expected pipeline flow)
- Or: planforge should append to files, not replace
- Or: scaffoldkit should generate less (let planforge own these files)
- Add `<!-- scaffoldkit -->` / `<!-- planforge -->` comments to track ownership

---

## 📝 DOCUMENTATION ISSUES

### 9. scaffoldkit: Installation Instructions Missing

**Problem:** README doesn't document install process

**Current README:** No installation section

**Impact:** Users hit system package conflicts immediately

**Fix Needed:**
Add "Installation" section:
```markdown
## Installation

### Option 1: pipx (recommended)
pip install pipx
pipx install .

### Option 2: venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

### Option 3: Docker (after fixing Dockerfile)
./scaffoldkit-docker --build new nextjs-fullstack
```

---

### 10. Ice's Command Had Wrong Flags

**Problem:** Ice's message contained `--var` flags that don't exist

**Ice's command:**
```bash
scaffoldkit new nextjs-fullstack agent-ops-dashboard \
  --var project_name=agent-ops-dashboard \
  --var display_name="Agent Ops Dashboard" \
  --var description="Monitor AI agents, CI pipelines and GitHub health" \
  --var language=en \
  --var db_provider=sqlite \
  --var auth_strategy=none \
  --var use_docker=true \
  --var use_analytics=true \
  --var ai_context=true
```

**Reality:** scaffoldkit has no `--var` flag

**Impact:**
- Confusing for users following instructions
- Indicates documentation gap
- I had to write workaround Python script

**Fix Needed:**
- Add `--var` flag (see issue #1)
- Or: Document interactive-only limitation clearly
- Update Ice's knowledge about scaffoldkit capabilities

---

### 11. planforge: No Clear "Where to Run From" Docs

**Problem:** Not documented that planforge must run from its own directory

**Impact:** First-time users get confusing ENOENT errors

**Fix Needed:**
Add "Usage" section to README:
```markdown
## Usage

planforge must be run from its own repository directory:

cd /path/to/agent-planforge
node scripts/bootstrap-plan.js \
  --input /path/to/your/project/planforge-input.json \
  --outdir /path/to/your/project \
  --install
```

---

## 🔧 WORKFLOW ISSUES

### 12. No Clear scaffoldkit → planforge Handoff

**Problem:** Unclear how scaffoldkit output feeds into planforge input

**Unanswered Questions:**
- Does planforge read scaffoldkit output files?
- Or are they independent tools with manual handoff?
- Why does planforge modify scaffoldkit-generated files?
- What's the expected file ownership model?

**Impact:**
- Workflow not obvious
- Had to guess at integration points
- Unclear if this is the "right" way to use both tools

**Fix Needed:**
- Document the complete pipeline in both READMEs
- Show example end-to-end workflow:
  1. Run scaffoldkit
  2. Commit output
  3. Run planforge
  4. Commit enriched output
- Explain file ownership (who owns what files)
- Add workflow diagram

---

### 13. Manual JSON Editing Required

**Problem:** Had to manually edit planforge-input.json (teamSize: "small" → 3)

**Impact:**
- Error-prone
- Not scriptable
- Requires understanding schema

**Fix Needed:**
- Validate JSON examples in repo (CI test)
- Better error messages: "teamSize must be integer (e.g., 3 for small team, 10 for large)"
- Or: Add conversion ("small" → 3, "medium" → 10, "large" → 20)

---

## ✅ WHAT WORKED PERFECTLY

1. **Makefile generation** - All Jinja2 conditionals worked flawlessly
   - `{% if use_docker %}` → docker-up/docker-down targets included
   - `{% if db_provider != 'sqlite' %}` → prisma generate conditional
   - .PHONY list dynamic

2. **Docker templates** - SQLite mode correctly omitted db service
   - docker-compose.dev.yml had no PostgreSQL/MySQL service ✅
   - DATABASE_URL set to `file:./dev.db` ✅
   - Dockerfile.dev had no OpenSSL installation ✅

3. **Pre-commit hooks** - Templates generated correctly
   - .husky-pre-commit with `npx lint-staged` ✅
   - lint-staged.config.js with TS/JS + JSON/MD rules ✅
   - Makefile hooks target ✅

4. **npm install post-generation** - Worked after planforge added package.json
   - package-lock.json created ✅
   - node_modules installed ✅

5. **Task generation** - 8 tasks generated with good structure
   - Logical breakdown from core features ✅
   - Detailed implementation guidance ✅
   - Files to create sections ✅

6. **ADR generation** - 3 ADRs created appropriately
   - 0001-architecture.md (Next.js App Router) ✅
   - 0002-data-store.md (Prisma + SQLite) ✅
   - 0003-integration.md (GitHub API) ✅

7. **Template enrichment** - prompts/, docs/, runner/ all generated well
   - architecture-analysis.md ✅
   - execution-next-wave.md ✅
   - runner contract + manifest ✅

8. **Jinja2 whitespace handling** - Already configured correctly
   - trim_blocks=True ✅
   - lstrip_blocks=True ✅
   - No whitespace artifacts in output ✅

---

## 📊 SUMMARY

**Total Issues:** 13
- 🚨 5 Critical
- ⚠️ 3 Medium
- 📝 3 Documentation
- 🔧 2 Workflow

**Blockers:** 0 (all had workarounds)
**Time to workaround:** ~10 minutes total
**Overall Result:** ✅ Pipeline works, needs polish for production-readiness

---

## 🎯 RECOMMENDED PRIORITY FIXES

### P0 (Critical - blocks automation)
1. **scaffoldkit:** Add non-interactive mode (--var flags or --vars-file)
2. **scaffoldkit:** Fix Docker build (blueprint path)
3. **planforge:** Fix relative path assumptions (make cwd-independent)

### P1 (High - improves DX significantly)
4. **scaffoldkit:** Add package.json template to nextjs-fullstack blueprint
5. **Both:** Document end-to-end workflow (README + diagrams)
6. **planforge:** Auto-copy config files if missing

### P2 (Medium - nice to have)
7. **scaffoldkit:** Document installation methods (venv/pipx)
8. **planforge:** Better schema validation error messages
9. **Both:** Clarify file ownership model

---

## 🧪 TESTING RECOMMENDATIONS

1. **CI Tests:**
   - Test scaffoldkit Docker build
   - Test planforge from different directories
   - Validate all example JSON files

2. **Fresh Machine Tests:**
   - Test install on fresh Debian/Ubuntu VM
   - Test install on fresh macOS
   - Document actual install time + steps

3. **E2E Tests:**
   - Automate full scaffoldkit → planforge pipeline
   - Verify all generated files compile/run
   - Test with different blueprint + input combinations

---

**Report Generated:** 2026-03-22 18:42 UTC  
**Reporter:** Lava  
**Session:** Testrun #2 (agent-ops-dashboard)  
**Total Pipeline Time:** ~20 minutes (scaffoldkit + planforge)
