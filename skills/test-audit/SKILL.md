---
name: test-audit
description: |
  Juzga si los tests prueban de verdad lo que dicen: aserciones que no pueden
  fallar, fixtures y dobles que fabrican el resultado, seams que solo existen
  para el test, tests no deterministas y la puerta de mutación.
  Usar cuando: (1) Revisar tests unitarios, de integración o E2E, (2) Auditar
  una carpeta completa de tests (`--suite`), (3) Antes de dar por terminado un
  test nuevo, (4) Se propone borrar o consolidar tests. `code-audit` la lee
  sola cuando el diff toca tests.
argument-hint: "<qué se pidió y qué queda fuera> [--staged | --branch [base] | --files <ruta> | --suite <ruta>]"
context: fork
---

# Test Audit

Un test vale si protege un comportamiento, una regresión creíble o un
contrato que nada más protege. Esta skill no pregunta si faltan tests (eso es
de `code-audit`): pregunta si los que hay prueban lo que dicen.

Sola (`/test-audit`) corres en un fork sin la conversación: si `ARGUMENTS:`
trae la intención, manda; si no, dilo. Leída por `code-audit`, salta el Paso 1
y el reporte: tus hallazgos van al suyo.

**Lo propio de este repo está en `project.md`**, en esta misma carpeta: el
runner y cómo correr un archivo, cómo repetirlo, la estrategia de tests del
repo, dónde están los payloads reales y las plataformas de E2E. Si no existe o
sigue igual que la plantilla, usa lo que dice esta skill.

## Paso 1: Objetivo

Sin flags, `--staged`, `--branch [base]` o `--files <ruta>`: los tests del
diff más los nuevos sin trackear. `--suite <ruta>`: **todos** los archivos
bajo la ruta, completos. Es test todo `*.test.*`, `*.spec.*`, `e2e/**` o
`**/fixtures/**` (helpers y fakes incluidos). Guarda `git diff --stat` (mismas
flags) y `git status --short` **a secas**. Sin tests: `Sin tests que
auditar.` y termina.

## Paso 2: Puerta 0 — ¿el test se ejecuta?

```bash
grep -nE '\b(test|it|describe)\.(only|skip|todo|if|skipIf|todoIf|failing)\(|\b(test|it)\.fixme\(|\b(fit|fdescribe|xit|xdescribe)\(' <archivo>
```

`.only`, `.skip`, `.todo` o `.failing` incondicionales: **CRITICO**. Un salto
condicional que puede activarse en CI: **MAYOR**.

## Paso 3: Leer y buscar

Lee el test **completo**, el código que dice cubrir y la sección que aplica de
la estrategia de tests del repo (la que cite `project.md`); con `e2e/**`,
también [`reference/e2e.md`](reference/e2e.md). La pregunta de fondo: **qué
dato o qué cambio haría fallar este test.** Si no se puede nombrar, no protege
nada.

- **Aserción que no puede fallar:** umbrales que los datos nunca cruzan
  (`toBeGreaterThan(0)`), un helper que normaliza y borra justo el dato que
  importa (el signo de un monto, la zona horaria).
- **Esperado derivado del código bajo test**, o comparado consigo mismo; o
  la constante del propio módulo cuando el contrato es un literal que lee
  otro proceso (CLI, hook, API externa).
- **Negativa que pasa por otra razón** (otra guarda ya rechaza el input).
- **Fixture fabricado:** el payload de un webhook, un evento o la respuesta
  de un servicio armado a mano en vez de uno real grabado (secretos
  reemplazados). Un fake que acepta lo que el real rechaza (firma, formato,
  rate limit) es lo mismo.
- **Mocks de módulo globales** (`mock.module()` de Bun, `jest.mock` o
  `vi.mock` sin aislar): reemplazan el módulo para otros tests y los
  contaminan. Preferir inyección de dependencias.
- **Estado que se filtra:** relojes falsos o variables de entorno sin reponer
  en `afterEach`, una base de datos compartida entre tests.
- **Esperas por tiempo** en vez de una señal; hora real o zona de la máquina;
  retries o timeouts subidos para tapar.
- **Integración que solo mira el status HTTP**, sin la base ni el efecto.
- **Seam solo para el test:** export, flag o parámetro que producción no usa.
  Compruébalo con `git grep -n '<id>' -- ':!*.test.*' ':!*.spec.*'` y pega la
  salida. El test va a la frontera real y el seam se borra.

## Paso 4: Puertas de determinismo y mutación

**Determinismo**, solo para tests nuevos o modificados que no son E2E: corre
el archivo 5 veces seguidas (con el comando de repetir de `project.md`, o en
un bucle). Un fallo intermitente es **MAYOR**, con la salida real. Si
sospechas contaminación, corre la carpeta en orden aleatorio si el runner lo
permite.

**Mutación:** si el Paso 3 marca un test como sospechoso, o siempre en
`--suite`: rompe el mecanismo que dice cubrir y exige rojo. **Nunca en E2E.**
Lee [`reference/mutation-gate.md`](reference/mutation-gate.md) antes de la
primera mutación.

> ⛔ **Nunca restaurar con `git checkout -- <archivo>`, `git stash` ni
> `git restore`:** borran el cambio revisado sin stagear. Respalda fuera del
> repo (scratchpad o `mktemp -d`); restaura con `cp` y confirma con `cmp -s`.

## Paso 5: Antes de escribir o borrar

Un test nuevo responde: ¿qué protege?, ¿qué regresión creíble lo haría
fallar?, ¿por qué no la detecta otro test (o basta una fila en una tabla de
casos)?, ¿necesita un seam? Si falta una respuesta, no se agrega. Un test de
regresión falla sobre el código sin el arreglo. Para borrar o consolidar, lee
[`reference/deleting-tests.md`](reference/deleting-tests.md).

## Paso 6: Reporte (solo cuando corres sola)

````markdown
# Test Audit: <rama o ruta>

<1 a 3 frases.> Tests revisados: X · Hallazgos: Y

## Hallazgos

1. **[SEVERIDAD]** `ruta/archivo.test.ts:línea` — qué dato o cambio no
   detecta. **Corrección:** el test o la aserción corregidos.

Puertas: `archivo.test.ts` › nombre — repetido ×5: 5/5 verde · mutación de
<mecanismo>: rojo / **verde**. Árbol igual al del Paso 1: sí / no.
Propuestas de borrado: <o "Ninguna">.
````

**CRITICO:** no prueba lo que dice (sobrevive a su mutación, salto
incondicional, fixture o fake que hace pasar lo que producción no hace).
**MAYOR:** prueba menos de lo que promete, es inestable, duplica un contrato,
sostiene un seam o puede saltarse en CI. **MENOR:** mejora sin cambiar lo que
detecta. Si no hay nada serio, dilo en una línea.

## Casos reales

Los tests de este repo que no probaban lo que decían van en `project.md`,
sección "Casos reales", con causa y arreglo.
