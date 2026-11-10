#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — One-command deploy for Decentralized World
# VPS path: /www/wwwroot/decentralizeed.site
#
# Usage:
#   ./deploy.sh          — smart deploy (only rebuilds what changed)
#   ./deploy.sh --full   — force full rebuild + restart of everything
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }
header()  { echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; echo -e "${BOLD}${CYAN}  $*${RESET}"; echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
fail()    { echo -e "${RED}[FAILED]${RESET} $*"; echo -e "${RED}━━━ Deploy aborted ━━━${RESET}"; exit 1; }

# ── Config ───────────────────────────────────────────────────────────────────
APP_DIR="/www/wwwroot/decentralizeed.site"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
NGINX_PID="/www/server/nginx/logs/nginx.pid"
FORCE_FULL=false
[[ "${1:-}" == "--full" ]] && FORCE_FULL=true

# ── Start ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}🚀  Decentralized World — Deploy Script${RESET}"
echo -e "    Directory : $APP_DIR"
echo -e "    Mode      : $( $FORCE_FULL && echo 'FULL (forced)' || echo 'Smart (auto-detect)' )\n"

# ── Check APP_DIR exists ──────────────────────────────────────────────────────
if [[ ! -d "$APP_DIR" ]]; then
  fail "App directory not found: $APP_DIR"
fi
cd "$APP_DIR"

# ── Step 1: Git Pull ──────────────────────────────────────────────────────────
header "Step 1 — Git Pull"

# Stash local changes if any
if ! git diff --quiet 2>/dev/null; then
  warn "Local changes detected — stashing before pull"
  git stash push -m "auto-stash before deploy $(date +%Y%m%d-%H%M%S)" || warn "Stash failed, continuing anyway"
fi

BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")

info "Pulling latest code from GitHub..."
if ! git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)" 2>&1; then
  error "Git pull failed. Check your remote/branch."
  info "Trying: git pull origin main"
  git pull origin main 2>&1 || fail "Git pull failed. Fix manually then re-run."
fi

AFTER=$(git rev-parse HEAD 2>/dev/null || echo "none")
success "Pulled: $(git log -1 --pretty='%h — %s' 2>/dev/null || echo 'unknown')"

# ── Step 2: Detect Changes ───────────────────────────────────────────────────
header "Step 2 — Detecting Changes"

BACKEND_CHANGED=false
FRONTEND_CHANGED=false
SCHEMA_CHANGED=false
BACKEND_DEPS_CHANGED=false
FRONTEND_DEPS_CHANGED=false

if $FORCE_FULL; then
  BACKEND_CHANGED=true
  FRONTEND_CHANGED=true
  SCHEMA_CHANGED=true
  BACKEND_DEPS_CHANGED=true
  FRONTEND_DEPS_CHANGED=true
  info "Force full — rebuilding everything"
elif [[ "$BEFORE" == "$AFTER" ]]; then
  success "Already up to date. Nothing to do."
  exit 0
else
  CHANGED=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null || echo "")
  echo "$CHANGED" | grep -qE '^backend/' && BACKEND_CHANGED=true && info "Backend changes detected"
  echo "$CHANGED" | grep -qE '^backend/src/db/schema\.sql' && SCHEMA_CHANGED=true && info "DB schema changed — migration will run"
  echo "$CHANGED" | grep -qE '^frontend/' && FRONTEND_CHANGED=true && info "Frontend changes detected"
  echo "$CHANGED" | grep -qE '^ecosystem\.config' && BACKEND_CHANGED=true && info "PM2 config changed"
  # Dependency-file changes (only npm install when package files actually change)
  echo "$CHANGED" | grep -qE '^backend/(package\.json|package-lock\.json)' && BACKEND_DEPS_CHANGED=true && info "Backend dependencies changed — will npm install"
  echo "$CHANGED" | grep -qE '^frontend/(package\.json|package-lock\.json)' && FRONTEND_DEPS_CHANGED=true && info "Frontend dependencies changed — will npm install"

  if ! $BACKEND_CHANGED && ! $FRONTEND_CHANGED; then
    success "No backend/frontend files changed. Nothing to rebuild."
    exit 0
  fi
fi

# ── Step 3: Backend ───────────────────────────────────────────────────────────
if $BACKEND_CHANGED; then
  header "Step 3 — Backend"

  cd "$BACKEND_DIR" || fail "Backend directory not found: $BACKEND_DIR"

  # Check .env
  if [[ ! -f ".env" ]]; then
    fail "backend/.env not found! Copy .env.example and fill values."
  fi
  success ".env found"

  # npm install (only if package.json / package-lock.json changed)
  if $BACKEND_DEPS_CHANGED; then
    info "Installing backend dependencies..."
    if ! npm install --omit=dev 2>&1; then
      fail "npm install failed in backend"
    fi
    success "npm install complete"
  else
    info "Dependencies unchanged — skipping npm install"
  fi

  # DB Migration
  if $SCHEMA_CHANGED; then
    info "Running database migration..."
    if ! npm run migrate 2>&1; then
      fail "DB migration failed — check DATABASE_URL in .env"
    fi
    success "Migration complete"
  else
    info "Schema unchanged — skipping migration"
  fi

  # PM2 restart
  info "Restarting backend via PM2..."
  if pm2 describe dw-backend &>/dev/null; then
    if ! pm2 restart dw-backend 2>&1; then
      fail "PM2 restart failed"
    fi
    sleep 2
    STATUS=$(pm2 describe dw-backend 2>/dev/null | grep "status" | awk '{print $4}' | head -1)
    if pm2 describe dw-backend 2>/dev/null | grep -q "online"; then
      success "dw-backend is online ✓"
    else
      error "dw-backend may not be running properly"
      pm2 logs dw-backend --lines 10 --nostream 2>/dev/null || true
      fail "Backend did not start correctly"
    fi
  else
    warn "dw-backend not in PM2 — starting fresh"
    cd "$APP_DIR"
    if ! pm2 start ecosystem.config.cjs --env production 2>&1; then
      fail "PM2 start failed"
    fi
    pm2 save
    success "dw-backend started"
  fi

  cd "$APP_DIR"
fi

# ── Step 4: Frontend ──────────────────────────────────────────────────────────
if $FRONTEND_CHANGED; then
  header "Step 4 — Frontend"

  cd "$FRONTEND_DIR" || fail "Frontend directory not found: $FRONTEND_DIR"

  # Check .env
  if [[ ! -f ".env" ]]; then
    fail "frontend/.env not found! Copy .env.example and fill values."
  fi
  success ".env found"

  # npm install (only if package.json / package-lock.json changed)
  if $FRONTEND_DEPS_CHANGED; then
    info "Installing frontend dependencies..."
    if ! npm install 2>&1; then
      fail "npm install failed in frontend"
    fi
    success "npm install complete"
  else
    info "Dependencies unchanged — skipping npm install"
  fi

  # Remove aaPanel's .user.ini that breaks vite build
  rm -f dist/.user.ini 2>/dev/null && info "Removed .user.ini (aaPanel artifact)"

  # Build
  info "Building frontend (vite build)..."
  if ! npm run build 2>&1; then
    fail "Frontend build failed — check errors above"
  fi
  success "Frontend built → dist/"

  # Nginx reload
  info "Reloading Nginx..."
  if [[ -f "$NGINX_PID" ]]; then
    if kill -HUP $(cat "$NGINX_PID") 2>/dev/null; then
      success "Nginx reloaded ✓"
    else
      warn "Nginx reload failed — try manually: kill -HUP \$(cat $NGINX_PID)"
    fi
  else
    warn "Nginx PID file not found — skipping reload"
  fi

  cd "$APP_DIR"
fi

# ── Step 5: Health Check ──────────────────────────────────────────────────────
header "Step 5 — Health Check"

info "Testing API..."
HEALTH=$(curl -sk https://decentralizeed.site/api/health 2>/dev/null || curl -s http://localhost:4000/api/health 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  success "API health check passed ✓"
else
  error "API health check failed!"
  error "Response: $HEALTH"
  warn "Check logs: pm2 logs dw-backend"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
header "Deploy Summary"
echo -e "  Commit    : $(git log -1 --pretty='%h — %s' 2>/dev/null)"
echo -e "  Backend   : $( $BACKEND_CHANGED  && echo "${GREEN}restarted${RESET}" || echo "unchanged")"
echo -e "  BeDeps    : $( $BACKEND_DEPS_CHANGED  && echo "${GREEN}installed${RESET}" || echo "skipped")"
echo -e "  Migration : $( $SCHEMA_CHANGED   && echo "${GREEN}ran${RESET}"       || echo "skipped")"
echo -e "  Frontend  : $( $FRONTEND_CHANGED && echo "${GREEN}rebuilt${RESET}"   || echo "unchanged")"
echo -e "  FeDeps    : $( $FRONTEND_DEPS_CHANGED && echo "${GREEN}installed${RESET}" || echo "skipped")"
echo ""
echo -e "${GREEN}${BOLD}✅  Deploy complete! — https://decentralizeed.site${RESET}\n"
