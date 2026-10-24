---
name: narrative-summary
description: |
  Explica algo en lenguaje llano para quien tiene poco tiempo: la parte "En
  simple" de un plan, la cabecera de una issue, o una explicación en la
  conversación cuando algo no se entiende.
  Usar cuando: (1) Se escribe o reescribe la parte para personas de un plan
  o de una issue, (2) Un plan o una issue cuesta entenderlo, (3) Piden que
  se explique o narre algo que no se entiende, sin que vaya a un documento.
---

# Explicar en simple

La meta: quien lee entiende lo importante en menos de un minuto. En pantalla
se lee poco (cerca del 20 % del texto) y sobre todo el comienzo de cada
línea, así que lo importante va primero y cada título dice algo.

## Reglas de estilo

Valen en todos los modos:

1. **La primera frase dice la decisión o la respuesta.** El contexto viene
   después.
2. **Oraciones de 25 palabras o menos**, idealmente 15 a 20, con una idea
   cada una.
3. **Sujeto, verbo y complemento, en voz activa**, con quién hace qué
   ("El servidor reintenta", no "Se reintenta").
4. **Palabras de todos los días.** Cliente, sesión, aviso, servidor, base de
   datos están bien. Nombres de función, archivo o variable no van: viven en
   el detalle.
5. **Un caso concreto** vale más que una descripción general: un actor, lo
   que hace y lo que ve.
6. **Títulos con contenido:** "Hoy: los avisos se pierden", no "Cómo es
   hoy". Las dos primeras palabras dicen algo propio de este texto.
7. **Sin relleno ni promoción:** fuera "básicamente", "simplemente",
   "quizás", "en principio", "robusto", "potente".
8. **Listas solo para cosas paralelas**, sin anidar, y párrafos de tres
   oraciones como máximo.
9. **Lo malo también se dice:** el riesgo que se acepta, comparado con la
   alternativa, y lo que queda fuera.

## Modo documento: plan

La forma exacta y los topes están en la skill `planning` (paso 2, "En
simple") y los comprueba su `check-plan.sh`: "Decisión", "Hoy", "Después",
"Riesgo" y "Nuevo" opcionales, "Fuera". Cada hecho de "Hoy" enlaza a su
evidencia y cada resultado de "Después" a su etapa.

"Nuevo" solo va después de buscar el patrón en el repo (`rg`): un "esto es
nuevo" falso le quita credibilidad a todo el plan.

## Modo documento: issue

La cabecera de la issue son tres líneas, antes de todo lo demás. La forma
completa está en la skill `github-issues`.

```markdown
**Qué falla:** <actor y efecto, en una frase>.      (o **Qué se pide:**)
**Por qué importa:** <una frase, con un número o un caso>.
**Hecho cuando:** <el resultado observable principal>.
```

## Modo lista (por defecto en la conversación)

Alguien pide que le expliquen algo, sin documento de por medio:

- Un ítem por idea, de 3 a 7 ítems; si hay más, se agrupan.
- Todos empiezan con el mismo tipo de palabra (todos con verbo o todos con
  sustantivo). Las condiciones van al final ("…si el banco rechaza").
- Sin títulos, sin negritas y sin forzar antes y después: se responde lo que
  se preguntó.
- Si la respuesta es una sola idea, va directa, sin viñeta.

Ejemplo: "¿cómo funcionan los reintentos de pago?"

```
- Cobra el monto apenas el cliente toca "Pagar".
- Muestra "Reintentar pago" si el banco rechaza por fondos.
- Reintenta solo hasta tres veces, con espera creciente, si falla la red.
- Registra cada intento fallido en la orden, con el motivo.
```

## Modo prosa

Lo mismo, en párrafos cortos. Solo si lo piden ("cuéntamelo corrido") o si
los ítems no se entienden sin leer el anterior.

## Ejemplo: antes y después

Antes (cuesta entenderlo):

> ### 1. Cómo es hoy
> - El `RetryLink` aplica `maxRetries=3` por operación, lo que, sumado a la
>   ausencia de un mecanismo de coordinación global, puede derivar en una
>   amplificación de carga significativa durante incidentes.

Después:

> **Decisión:** la app dejará de reintentar cuando la API esté caída.
>
> ### Hoy: una caída multiplica la carga
> Cada consulta reintenta tres veces por su cuenta. Si la API cae, recibe el
> triple de pedidos justo cuando intenta volver.
