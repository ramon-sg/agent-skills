#!/usr/bin/env bash
# Comprueba que un plan respete la forma y los topes de la skill `planning`.
# Uso: bash <carpeta de la skill>/check-plan.sh <ruta-del-plan>
# Los topes salen de la tabla "## Topes" del project.md de esta carpeta; un tipo
# que no está ahí (o sin project.md) usa los de la skill.
# Los errores (la parte para personas, la forma) salen con 1. Los avisos (largo
# total, cantidad de hechos, oraciones largas) se muestran y salen con 0.

set -euo pipefail

source_plan="${1:-}"
[ -n "$source_plan" ] && [ -f "$source_plan" ] || { echo "Uso: check-plan.sh <ruta-del-plan>" >&2; exit 2; }

plan=$(mktemp "${TMPDIR:-/tmp}/check-plan.XXXXXX")
trap 'rm -f "$plan"' EXIT
tr -d '\r' < "$source_plan" > "$plan"

problems=()
warnings=()
add() { problems+=("$1"); }
warn() { warnings+=("$1"); }

type=$(awk '/^---$/{n++; next} n==1 && /^type:/{gsub(/["'\'']/, "", $2); print $2; exit}' "$plan")
case "$type" in
  bug) max_words=80; max_rows=5; max_lines=80 ;;
  feature|refactor) max_words=120; max_rows=10; max_lines=200 ;;
  *) echo "Falta 'type: bug|feature|refactor' en el frontmatter." >&2; exit 1 ;;
esac

project="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/project.md"
if [ -f "$project" ]; then
  caps=$(tr -d '\r' < "$project" | awk -v type="$type" '
    function number(text) { return text ~ /^[0-9]+$/ && length(text) <= 6 }
    /^## / { inside = ($0 == "## Topes"); next }
    inside && /^\|/ {
      n = split($0, cell, "|")
      for (i = 1; i <= n; i++) { gsub(/^[[:space:]`]+|[[:space:]`]+$/, "", cell[i]) }
      if (cell[2] != type) next
      if (n >= 6 && number(cell[3]) && number(cell[4]) && number(cell[5])) { print cell[3] + 0, cell[4] + 0, cell[5] + 0 } else { print "ilegible" }
      exit
    }')
  if [ "$caps" = "ilegible" ]; then
    warn "La fila de '$type' en \"## Topes\" no se pudo leer (tres números de hasta 6 cifras); uso los topes de la skill."
  elif [ -n "$caps" ]; then
    read -r max_words max_rows max_lines <<< "$caps"
  fi
fi

section() {
  awk -v title="$1" '
    $0 == "## " title { inside = 1; next }
    inside && /^## / { exit }
    inside { print }
  ' "$plan"
}

for required in "En simple" "Etapas" "Contraste con la realidad" "Detalle para agentes" "Desvíos"; do
  grep -qx "## $required" "$plan" || add "Falta la sección '## $required'."
done

lines=$(wc -l < "$plan" | tr -d ' ')
[ "$lines" -le "$max_lines" ] || warn "El plan tiene $lines líneas; la guía para '$type' es $max_lines. ¿Sobra detalle o son dos planes?"

simple=$(section "En simple")
plain=$(printf '%s\n' "$simple" \
  | sed -E 's/\(\[[^]]*\]\(#[^)]*\)\)//g; s/\[([^]]*)\]\([^)]*\)/\1/g; s/\*\*//g; s/^#+ //')
words=$(printf '%s\n' "$plain" | wc -w | tr -d ' ')
if [ "$words" -gt "$max_words" ]; then
  breakdown=$(printf '%s\n' "$plain" | awk '
    /^(Decisión|Fuera):/ { split($0, parts, ":"); name = parts[1] }
    /^(Hoy|Después|Riesgo|Nuevo):/ { split($0, parts, ":"); name = parts[1] }
    name != "" { count[name] += NF; if (!(name in seen)) { seen[name] = 1; order[++n] = name } }
    END { for (i = 1; i <= n; i++) printf "  %s: %d\n", order[i], count[order[i]] }')
  add "'En simple' tiene $words palabras; el tope de '$type' es $max_words ($((words - max_words)) de más). Por parte:
$breakdown
Deja una idea por título y saca lo que no cambia para quien usa el sistema."
fi

first=$(printf '%s\n' "$simple" | grep -v '^[[:space:]]*$' | head -n 1 || true)
case "$first" in
  "**Decisión:**"*) ;;
  *) add "'En simple' debe empezar con '**Decisión:** <una frase>'." ;;
esac

printf '%s\n' "$simple" | grep -Eq '^### Hoy: +[^[:space:]]' || add "Falta '### Hoy: <el problema>' (el título dice el problema, no solo 'Hoy')."
printf '%s\n' "$simple" | grep -Eq '^### Después: +[^[:space:]]' || add "Falta '### Después: <el resultado>' (el título dice el resultado, no solo 'Después')."
printf '%s\n' "$simple" | grep -Eq '^\*\*Fuera:\*\* *[^[:space:]]' || add "Falta '**Fuera:** <lo que no se hace>'."
if printf '%s\n' "$simple" | grep -q '`'; then
  add "'En simple' tiene código entre acentos graves; las rutas y nombres van al contraste o al detalle."
fi

long=$(printf '%s\n' "$plain" | { grep -v '^[[:space:]]*$' || true; } \
  | { grep -v '^\(Hoy\|Después\|Riesgo\|Nuevo\):' || true; } \
  | sed -E 's/etc\./etc/g' | tr '\n' ' ' \
  | awk '{ gsub(/[.?!]( |$)/, "\n"); print }' \
  | awk 'NF > 25 { print "  " NF " palabras: " substr($0, 1, 60) "…" }')
[ -z "$long" ] || warn "Oraciones de más de 25 palabras en 'En simple':
$long"

rows=$(section "Contraste con la realidad" | grep -Ec '^\| *<a id="v[0-9]+"' || true)
[ "$rows" -le "$max_rows" ] || warn "El contraste tiene $rows hechos comprobados (V); la guía para '$type' es $max_rows. ¿Todos cambian el plan si fueran falsos?"

for id in $(grep -o 'id="[vs][0-9]*"' "$plan" | sed -E 's/id="([^"]*)"/\1/' | sort -u || true); do
  grep -q "(#$id)" "$plan" || add "$id no se cita en ningún lado: cítalo o bórralo."
done
for ref in $(grep -o '(#[vs][0-9]*)\|(#etapa-[0-9]*)' "$plan" | tr -d '()#' | sort -u || true); do
  grep -q "id=\"$ref\"" "$plan" || add "El link #$ref no tiene ancla <a id=\"$ref\"></a>."
done

status=$(awk '/^---$/{n++; next} n==1 && /^status:/{print $2; exit}' "$plan")
questions=$(section "Preguntas para ti" | grep -Ec '^[-*0-9]' || true)
if [ "$questions" -gt 0 ]; then
  if [ "$status" = "draft" ]; then
    warn "Hay $questions preguntas para el usuario: el plan no se aprueba hasta responderlas."
  else
    add "El plan está '$status' con $questions preguntas sin responder: pasa las respuestas al plan y borra la sección."
  fi
fi

bad_states=$(section "Etapas" | awk -F'|' '/^\|/ && NF > 4 {
    state = $4; gsub(/^ +| +$/, "", state)
    if (state == "Estado" || state ~ /^:?-+:?$/) next
    if (state !~ /^(propuesta|en curso|implementada|descartada: .+)$/) print "  " state
  }')
[ -z "$bad_states" ] || add "Estados de etapa inválidos (propuesta, en curso, implementada, descartada: <motivo>):
$bad_states"

if [ "${#warnings[@]}" -gt 0 ]; then
  echo "Avisos (no bloquean; corrígelos si puedes):"
  printf -- '- %s\n' "${warnings[@]}"
fi
if [ "${#problems[@]}" -eq 0 ]; then
  echo "OK: $type, $lines líneas, 'En simple' con $words palabras, $rows hechos comprobados."
  exit 0
fi
echo "Errores:"
printf -- '- %s\n' "${problems[@]}"
exit 1
