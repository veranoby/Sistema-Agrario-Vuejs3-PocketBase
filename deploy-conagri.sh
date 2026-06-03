#!/bin/bash
# =============================================================================
# ConAgri Deploy Script — Vue 3 + Vite + PocketBase
# =============================================================================
# Server: Hetzner AX42 (136.243.174.157) — compartido con galleros.net
# Dominio: conagri.conespacio.org
# PocketBase: puerto 8091
# =============================================================================
# ANTES DE USAR:
#   1. Copia este script a la raíz del proyecto sistema-agri
#   2. Asegúrate de que el DNS conagri.conespacio.org apunta a 136.243.174.157
#   3. El binario de pocketbase debe estar en ./pocketbase/pocketbase
# =============================================================================

set -e

PROD_SERVER="root@136.243.174.157"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_PATH="/var/www/conagri"
LOCAL_ROOT="$(cd "$(dirname "$0")" && pwd)"
PB_PORT=8091
NGINX_DOMAIN="conagri.conespacio.org"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

DRY_RUN=false; FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --force|-f) FORCE=true; shift ;;
    --help|-h) echo "Usage: ./deploy-conagri.sh [--dry-run] [--force]"; exit 0 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

log_phase()   { echo -e "\n${CYAN}══════════════════════════════════════${NC}\n${CYAN}$1${NC}\n${CYAN}══════════════════════════════════════${NC}"; }
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error()   { echo -e "${RED}[ERR]${NC} $1"; }

echo "================================================================"
echo "ConAgri Deploy — Vue 3 + PocketBase"
echo "Servidor: $PROD_SERVER | Dominio: $NGINX_DOMAIN"
echo "Modo: $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "================================================================"

if [ "$DRY_RUN" = false ] && [ "$FORCE" = false ]; then
  read -p "Proceder? (y/N): " confirm
  [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 0
fi

log_phase "1/5: Pre-flight"

if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$PROD_SERVER" "echo OK" > /dev/null 2>&1; then
  log_error "SSH falló"; exit 1
fi
log_success "SSH OK"

if [ ! -f "$LOCAL_ROOT/pocketbase/pocketbase" ]; then
  log_error "Binario PocketBase no encontrado en ./pocketbase/pocketbase"
  log_info "Descarga desde https://pocketbase.io/docs/"
  exit 1
fi
log_success "Binario PocketBase OK"

log_phase "2/5: Build Vue (local)"

if [ "$DRY_RUN" = false ]; then
  cd "$LOCAL_ROOT" && npm run build
  [ ! -f "$LOCAL_ROOT/dist/index.html" ] && { log_error "Build falló"; exit 2; }
  log_success "Build: $(du -sh dist/ | cut -f1)"
else
  log_info "[DRY RUN] Omitiría: npm run build"
fi

log_phase "3/5: Sync al servidor"

if [ "$DRY_RUN" = false ]; then
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PROD_SERVER" \
    "mkdir -p $REMOTE_PATH/dist $REMOTE_PATH/pocketbase/pb_data $REMOTE_PATH/pocketbase/pb_migrations $REMOTE_PATH/pocketbase/pb_hooks"

  # Frontend
  rsync -av --no-compress --delete \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_ROOT/dist/" "$PROD_SERVER:$REMOTE_PATH/dist/"

  # Binario PocketBase
  rsync -av --no-compress \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_ROOT/pocketbase/pocketbase" "$PROD_SERVER:$REMOTE_PATH/pocketbase/"

  # Migraciones (NO pb_data — son datos de producción, nunca sobreescribir)
  rsync -av --no-compress \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    "$LOCAL_ROOT/pocketbase/pb_migrations/" "$PROD_SERVER:$REMOTE_PATH/pocketbase/pb_migrations/"

  # Hooks JS: Sincronizar desde la raíz al directorio interno de pocketbase primero
  [ -d "$LOCAL_ROOT/pb_hooks" ] && \
    echo "[INFO] Sincronizando pb_hooks (raíz) -> pocketbase/pb_hooks/" && \
    rsync -av --no-compress "$LOCAL_ROOT/pb_hooks/" "$LOCAL_ROOT/pocketbase/pb_hooks/"

  # Luego, desplegar los hooks al servidor
  [ -d "$LOCAL_ROOT/pocketbase/pb_hooks" ] && \
    rsync -av --no-compress \
      -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
      "$LOCAL_ROOT/pocketbase/pb_hooks/" "$PROD_SERVER:$REMOTE_PATH/pocketbase/pb_hooks/"

  log_success "Archivos sincronizados"
else
  log_info "[DRY RUN] Omitiría rsync"
fi

log_phase "4/5: Nginx + PM2"

if [ "$DRY_RUN" = false ]; then
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PROD_SERVER" << 'REMOTE'
set -e

chmod +x /var/www/conagri/pocketbase/pocketbase

# Nginx — solo si no existe aún
if [ ! -f /etc/nginx/sites-available/conagri.conespacio.org ]; then
  echo "Creando config Nginx..."
  cat > /etc/nginx/sites-available/conagri.conespacio.org << 'NGINX'
server {
    listen 80;
    server_name conagri.conespacio.org;

    # Frontend Vue estático
    root /var/www/conagri/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # PocketBase Admin UI
    location /_/ {
        proxy_pass http://localhost:8091/_/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # PocketBase API
    location /api/ {
        proxy_pass http://localhost:8091/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/conagri.conespacio.org /etc/nginx/sites-enabled/
fi

nginx -t && systemctl reload nginx
echo "Nginx OK"

# PocketBase via PM2
if pm2 describe conagri-pb > /dev/null 2>&1; then
  pm2 restart conagri-pb
else
  pm2 start /var/www/conagri/pocketbase/pocketbase \
    --name conagri-pb \
    -- serve \
    --http=0.0.0.0:8091 \
    --dir=/var/www/conagri/pocketbase/pb_data
fi

pm2 save
echo "PocketBase OK en :8091"
REMOTE
  log_success "Nginx y PM2 configurados"
else
  log_info "[DRY RUN] Omitiría Nginx y PM2"
fi

log_phase "5/5: Health check"

if [ "$DRY_RUN" = false ]; then
  sleep 3
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PROD_SERVER" \
    "pm2 describe conagri-pb | grep -q 'status.*online'" \
    && log_success "PocketBase online" \
    || { log_error "PocketBase no arrancó — ver: pm2 logs conagri-pb"; exit 5; }

  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PROD_SERVER" \
    "[ -f /var/www/conagri/dist/index.html ]" \
    && log_success "Frontend disponible" \
    || { log_error "dist/index.html no encontrado"; exit 5; }
fi

echo ""
echo "================================================================"
[ "$DRY_RUN" = true ] && echo "[DRY RUN completado — sin cambios]" || {
  log_success "Deploy completado!"
  echo ""
  echo "  URL:   https://conagri.conespacio.org"
  echo "  Admin: https://conagri.conespacio.org/_/"
  echo ""
  echo "PENDIENTE (solo primer deploy):"
  echo "  certbot --nginx -d conagri.conespacio.org"
}
echo "================================================================"
exit 0
