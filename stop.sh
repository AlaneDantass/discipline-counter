#!/bin/bash
# Encerra o widget
pkill -f "electron.*discipline-counter" 2>/dev/null && \
  echo "🛑 Widget encerrado." || \
  echo "⚠️  Nenhuma instância encontrada."
