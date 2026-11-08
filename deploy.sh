#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — One-command deploy for Decentralized World on VPS
#
# Usage:
#   ./deploy.sh          — smart deploy (only restarts what changed)
#   ./deploy.sh --full   — force full rebuild + restart of everything
#
# What it does:
#   1. git pull (latest code)
#   2. Detect which parts changed (backend / frontend)
#   3. backend changed  → npm install + pm2 restart dw-backend
#   4. frontend changed → npm install + vite build + nginx reload
#   5. schema changed   → run DB migration automatically
#   6. Print a clean summary at the end
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}"; }

# ── Config ───────────────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
FORCE_FULL=false
[[ "${1:-}" == "--full" ]] && FORCE_FULL=true

# ── Start ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}🚀  Decentralized World — Deploy Script${RESET}"
echo -e "    Directory : $APP_DIR"
echo -e "    Mode      : $( $FORCE_FULL && echo 'FULL (forced)' || echo 'Smart (auto-detect changes)' )\n"

# ── 1. Git pull ───────────────────────────────────────────────────────────────
header "Git Pull"
cd "$APP_DIR"

# Stash any accidental local changes so pull never fails
if ! git diff --quiet; then
  warn "Local changes detected — stashing before pull"
  git stash push -m "auto-stash before deploy $(date +%Y%m%d-%H%M%S)"
fi

BEFORE=$(git rev-parse HEAD)
git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD)"
AFTER=$(git rev-parse HEAD)

if [[ "$BEFORE" == "$AFTER" && "$FORCE_FULL" == false ]]; then
  success "Already up to date ($(git rev-parse --short HEAD)). Nothing to do."
  exit 0
fi

success "Pulled $(git rev-parse --short HEAD) ← $(git rev-parse --short ORIG_HEAD 2>/dev/null || echo 'new')"

# ── 2. Detect what changed ────────────────────────────────────────────────────
header "Detecting Changes"

CHANGED_FILES=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null || echo "")

BACKEND_CHANGED=false
FRONTEND_CHANGED=false
SCHEMA_CHANGED=false

if $FORCE_FULL; then
  BACKEND_CHANGED=true
  FRONTEND_CHANGED=true
  SCHEMA_CHANGED=true
  info "Force full — rebuilding everything"
else
  if echo "$CHANGED_FILES" | grep -qE '^backend/'; then
    BACKEND_CHANGED=true
    info "Backend changes detected"
  fi
  if echo "$CHANGED_FILES" | grep -qE '^backend/src/db/schema\.sql'; then
    SCHEMA_CHANGED=true
    info "DB schema changed — migration will run"
  fi
  if echo "$CHANGED_FILES" | grep -qE '^frontend/'; then
    FRONTEND_CHANGED=true
    info "Frontend changes detected"
  fi
  # ecosystem or root-level script changes → restart backend
  if echo "$CHANGED_FILES" | grep -qE '^ecosystem\.config'; then
    BACKEND_CHANGED=true
    info "PM2 config changed — backend will restart"
  fi
fi

if ! $BACKEND_CHANGED && ! $FRONTEND_CHANGED; then
  success "No backend or frontend files changed. Nothing to rebuild."
  exit 0
fi

# ── 3. Backend ────────────────────────────────────────────────────────────────
if $BACKEND_CHANGED; then
  header "Backend"

  cd "$BACKEND_DIR"

  info "Installing backend dependencies..."
  npm install --omit=dev --prefer-offline 2>&1 | tail -3
  success "npm install done"

  # Run DB migration if schema changed
  if $SCHEMA_CHANGED; then
    info "Running database migration..."
    npm run migrate
    success "Migration complete"
  fi

  # Restart via PM2
  if pm2 describe dw-backend &>/dev/null; then
    info "Restarting dw-backend via PM2..."
    pm2 restart dw-backend
    sleep 2
    # Quick health check
    if pm2 describe dw-backend | grep -q "online"; then
      success "dw-backend is online ✓"
    else
      error "dw-backend failed to start — check: pm2 logs dw-backend"
    fi
  else
    warn "dw-backend not found in PM2 — starting fresh..."
    cd "$APP_DIR"
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    success "dw-backend started and saved"
  fi
fi

# ── 4. Frontend ───────────────────────────────────────────────────────────────
if $FRONTEND_CHANGED; then
  header "Frontend"

  cd "$FRONTEND_DIR"

  # Check .env exists
  if [[ ! -f ".env" ]]; then
    error "frontend/.env not found. Copy .env.example and fill in values first."
  fi

  info "Installing frontend dependencies..."
  npm install --prefer-offline 2>&1 | tail -3
  success "npm install done"

  info "Building frontend (vite build)..."
  npm run build
  success "Frontend build complete → dist/"

  # Nginx reload (not restart — zero downtime)
  if command -v nginx &>/dev/null; then
    info "Reloading Nginx..."
    if sudo nginx -t &>/dev/null; then
      sudo systemctl reload nginx
      success "Nginx reloaded ✓"
    else
      warn "Nginx config test failed — skipping reload. Run: sudo nginx -t"
    fi
  else
    warn "Nginx not found — skipping reload (serve dist/ manually if needed)"
  fi
fi

# ── 5. Summary ────────────────────────────────────────────────────────────────
header "Deploy Summary"
echo -e "  Commit    : $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
echo -e "  Backend   : $( $BACKEND_CHANGED  && echo "${GREEN}restarted${RESET}" || echo "unchanged")"
echo -e "  Migration : $( $SCHEMA_CHANGED   && echo "${GREEN}ran${RESET}"       || echo "skipped")"
echo -e "  Frontend  : $( $FRONTEND_CHANGED && echo "${GREEN}rebuilt${RESET}"   || echo "unchanged")"
echo ""

if $BACKEND_CHANGED; then
  echo -e "  PM2 status:"
  pm2 status dw-backend --no-color 2>/dev/null | grep -E "name|online|stopped|error" | head -5 || true
fi

echo -e "\n${GREEN}${BOLD}✅  Deploy complete!${RESET}\n"
