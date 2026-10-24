---
status: draft
type: feature
prs: []
issue: 42
---

# La app avisa cuando una sesión pasa de su presupuesto

## En simple

**Decisión:** cada sesión tendrá un presupuesto y un aviso al teléfono cuando lo pase.

### Hoy: el gasto excesivo se descubre tarde
Una sesión puede gastar el doble de lo pensado sin que nadie se entere ([V1](#v1)). El costo solo se ve al abrir la sesión ([V2](#v2)).

### Después: el aviso llega mientras corre
Eliges un presupuesto al lanzar la sesión ([etapa 1](#etapa-1)). Si lo pasa, llega un aviso, una sola vez ([etapa 2](#etapa-2)).

### Riesgo: el aviso llega con un minuto de atraso
El costo se actualiza cada minuto ([V3](#v3)). Consultarlo más seguido gasta cuota de la API ([S1](#s1)).

**Fuera:** cortar la sesión al pasar el presupuesto.

## Etapas

| # | Etapa | Estado | PR |
|---|---|---|---|
| 1 | Presupuesto por sesión | propuesta | — |
| 2 | Aviso al pasar el presupuesto | propuesta | — |

## Decisiones propias

- El presupuesto por defecto es el del último lanzamiento. Si está mal, solo cambia un valor inicial.

## Contraste con la realidad

Comprobado el 2026-10-21 sobre `main` en `abc1234`.

| Id | Afirmación | Evidencia | Resultado |
|---|---|---|---|
| <a id="v1"></a>V1 | Ningún aviso usa el costo | `rg -n "cost" src/notifications`: sin resultados | ✔ |
| <a id="v2"></a>V2 | El costo solo se ve en el detalle de la sesión | `rg -n "sessionCost" src/app`: solo `SessionDetail.tsx:48` | ✔ |
| <a id="v3"></a>V3 | El servidor actualiza el costo cada minuto | `src/session-cost/poll-cost.ts:12` (`POLL_INTERVAL_MS = 60_000`) | ✔ corregida: decía "cada 30 segundos" |
| <a id="s1"></a>S1 | Consultar cada 10 segundos agota la cuota diaria | Sin evidencia: no hay métricas de cuota | supuesto |

## Detalle para agentes

### <a id="etapa-1"></a>Etapa 1: Presupuesto por sesión

- **Archivos:** `src/session-cost/launch-hooks.ts`, `src/session-cost/db/schema.ts` y una migración nueva.
- **Tests, en orden** (`launch-hooks.integration.test.ts`):
  1. Lanzar con `limitUsd: 5` guarda el presupuesto de esa sesión.
  2. Lanzar sin presupuesto usa el del último lanzamiento.
  3. Un presupuesto negativo se rechaza con 400.
- **Siguen pasando:** `launch-session.integration.test.ts` (lanzar sin presupuesto no cambia).
- **Ojo:** una sesión relanzada hereda el presupuesto de la original, no el último.
- **Hecho cuando:** `npm test -- session-cost` pasa.

### <a id="etapa-2"></a>Etapa 2: Aviso al pasar el presupuesto

- **Archivos:** `src/session-cost/poll-cost.ts`, `src/session-cost/budget-alert.ts`.
- **Tests, en orden** (`budget-alert.integration.test.ts`, reloj falso):
  1. Un costo que pasa el presupuesto encola un aviso.
  2. Un segundo costo sobre el presupuesto no encola otro.
  3. Una sesión sin presupuesto no avisa.
- **Siguen pasando:** `poll-cost.integration.test.ts`.
- **Hecho cuando:** `npm test -- session-cost` pasa.

## Desvíos

