#!/bin/bash
# ===========================================
#  Inicia o widget em background
#  Uso:  ./start.sh
#  Para:  ./stop.sh  ou  pkill -f DisciplineCounter
# ===========================================

DIR="$(cd "$(dirname "$0")" && pwd)"

# Mata instâncias antigas
pkill -f "electron.*discipline-counter" 2>/dev/null
sleep 0.3

# Inicia em background (nohup + disown)
cd "$DIR"
nohup npx electron . --no-sandbox > /dev/null 2>&1 &
disown

echo "✅ Widget iniciado em background (PID: $!)"
echo "   Para encerrar: ./stop.sh"
