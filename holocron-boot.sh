#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# holocron-boot.sh — démarrage auto Gougoul Holocron (architecture v2)
# À enregistrer dans : System → Advanced Settings → Init/Shutdown Scripts
#   Type = SCRIPT (POSTINIT), Timeout = 600, Enabled = coché
# Journal : /mnt/Holocron_sith/boot.log  ← PREMIER RÉFLEXE en cas de souci au boot
#
# Rôle : TrueNAS SCALE régénère /etc/docker/daemon.json à CHAQUE boot avec son
# data-root par défaut (/mnt/.ix-apps/docker). Notre patch arrive EN DERNIER
# (Post Init) et gagne : data-root sur NOTRE pool + overlay2.
# ═══════════════════════════════════════════════════════════════════════════
set -u
LOG=/mnt/Holocron_sith/boot.log
POOL=/mnt/Holocron_sith
say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

say "=================== BOOT HOLOCRON ==================="

# 1. Laisser le middleware TrueNAS finir son initialisation
say "Attente 30s (init middleware TrueNAS)..."
sleep 30

# 2. Stopper Docker proprement (socket puis service)
say "Arrêt de docker.socket + docker..."
systemctl stop docker.socket 2>>"$LOG"
systemctl stop docker        2>>"$LOG"
sleep 3

# 3. Patcher daemon.json → notre data-root + overlay2 (on écrit EN DERNIER)
say "Écriture de /etc/docker/daemon.json (data-root pool + overlay2)..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'JSON'
{
  "data-root": "/mnt/Holocron_sith/docker-data",
  "storage-driver": "overlay2"
}
JSON

# 4. Recharger + repartir de zéro sur les compteurs d'échec + démarrer Docker
say "daemon-reload + reset-failed + start docker..."
systemctl daemon-reload
systemctl reset-failed docker 2>>"$LOG"
systemctl start docker        2>>"$LOG"

# 5. Attendre que Docker réponde (max 60s)
say "Attente readiness Docker (max 60s)..."
for i in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then
    say "Docker prêt après ${i}s."
    break
  fi
  sleep 1
done
if ! docker info >/dev/null 2>&1; then
  say "ERREUR : Docker n'a pas démarré dans les temps. Voir 'journalctl -u docker'."
  exit 1
fi

# Vérif config active (doit afficher overlay2 + /mnt/Holocron_sith/docker-data)
say "Config Docker : $(docker info 2>/dev/null | grep -E 'Storage Driver|Docker Root Dir' | tr '\n' ' ')"

# 6. Monter les deux stacks — nexcloud d'abord (le userdata sert au backend en RO)
say "docker compose up -d — stack NEXTCLOUD..."
( cd "$POOL/nexcloud" && docker compose up -d ) 2>>"$LOG"

say "docker compose up -d — stack WEBAPP..."
( cd "$POOL/webapp"   && docker compose up -d ) 2>>"$LOG"

# 7. Récap
say "État des conteneurs :"
docker ps --format '  {{.Names}} -> {{.Status}}' | tee -a "$LOG"
say "=================== FIN BOOT ==================="
