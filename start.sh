#!/bin/bash
# ===========================================
#  Inicia o widget em background
#  Uso:  ./start.sh
#  Para:  ./stop.sh  ou  pkill -f DisciplineCounter
# ===========================================

# Carrega o NVM se ele existir para garantir acesso ao Node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

DIR="$(cd "$(dirname "$0")" && pwd)"

# Mata instâncias antigas
pkill -f "electron.*discipline-counter" 2>/dev/null
sleep 0.3

# Inicia em background usando o binário local do electron
cd "$DIR"
nohup node ./node_modules/electron/cli.js . --no-sandbox > /dev/null 2>&1 &
disown

echo "✅ Widget iniciado em background (PID: $!)"
echo "   Para encerrar: ./stop.sh"
