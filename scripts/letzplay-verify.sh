#!/bin/bash

# Letzplay Verify — Verificação avançada de duplas
# Tenta múltiplas técnicas para descobrir o número de duplas

TOURNAMENT_ID=${1:-61806}
URL="https://letzplay.me/circuitoturn/tourneys/$TOURNAMENT_ID"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            🔍 LETZPLAY VERIFY - Advanced Check              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Torneio ID: $TOURNAMENT_ID"
echo "🔗 URL: $URL"
echo ""

# Tenta com curl usando diferentes user agents e headers
echo "Tentativa 1️⃣ : Acesso com headers completos..."

RESPONSE=$(curl -s -X GET "$URL" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  -H "Accept-Language: pt-BR,pt;q=0.9" \
  -H "Accept-Encoding: gzip, deflate, br" \
  -H "DNT: 1" \
  -H "Connection: keep-alive" \
  -H "Upgrade-Insecure-Requests: 1" \
  -w "\nHTTP_STATUS:%{http_code}" 2>&1)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Acesso bem-sucedido (HTTP 200)"
  echo ""
  echo "Procurando por padrões de contagem de duplas..."
  echo ""

  # Procura por padrões comuns
  PATTERNS=(
    "(\d+)\s*(?:duplas?|equipes?|times?|teams?)"
    "inscrições?[:\s]*(\d+)"
    "total[:\s]*(\d+)"
    "participantes?[:\s]*(\d+)"
  )

  # Extrai números da página
  NUMBERS=$(echo "$BODY" | grep -oE '[0-9]+' | sort -rn | uniq | head -20)

  if [ -n "$NUMBERS" ]; then
    echo "Números encontrados na página (maiores primeiro):"
    echo ""
    echo "$NUMBERS" | head -10 | while read -r num; do
      echo "  👉 $num duplas"
    done
    echo ""
    FIRST_NUM=$(echo "$NUMBERS" | head -1)
    echo "Mais provável: $FIRST_NUM duplas"
  else
    echo "❌ Nenhum número encontrado"
  fi
else
  echo "❌ HTTP $HTTP_STATUS - Acesso bloqueado"
  echo ""
  echo "💡 A Letzplay está bloqueando acesso automatizado."
  echo ""
  echo "Alternativas:"
  echo ""
  echo "  1️⃣  npm run letzplay:discover $TOURNAMENT_ID"
  echo "      (Guia interativo para descobrir o número manualmente)"
  echo ""
  echo "  2️⃣  npm run letzplay:sync $TOURNAMENT_ID -- --pairs <NÚMERO>"
  echo "      (Registrar número após verificar na página)"
  echo ""
  echo "  3️⃣  Abra em navegador:"
  echo "      $URL"
fi

echo ""
