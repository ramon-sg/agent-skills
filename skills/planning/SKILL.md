---
name: planning
description: |
  Planifica en un solo documento corto, sin spec aparte, un cambio que no
  cabe en una frase: una parte para personas que se lee en un minuto, etapas
  con estado propio, la evidencia de lo que el plan afirma y el detalle para
  agentes. El tope de largo depende del tipo (bug, feature, refactor) y lo
  comprueba un script.
  Usar cuando: (1) Hay que planificar una feature, un refactor o un bug cuya
  causa no es obvia, (2) `start-issue` deriva una issue a plan, (3) Se pide
  revisar o contrastar un plan que ya existe, (4) Una etapa se implementó o
  se descarta y hay que anotarlo, (5) Hay que cerrar un plan.
argument-hint: "<qué se quiere cambiar | ruta del plan> [--check | --stage <n> <estado> | --close]"
---

# Planificar un cambio

Un plan es corto a propósito: un plan largo se lee peor, lo relee el agente
en cada paso y esconde lo importante. Si no cabe en su tope, son dos planes.

Ejemplo completo: `template.md` (sus datos son inventados; no se copian).

**Lo propio de este repo está en `project.md`**, en esta misma carpeta: dónde
van los planes, la guía para personas si hay, los topes si el repo los cambió
y sus convenciones (frontmatter, cierre, comando de tests). Léelo antes de
escribir. Si no existe o sigue igual que la plantilla, vale lo de esta skill.

## ¿Hace falta un plan?

| Situación | Qué se hace |
|---|---|
| El cambio se describe en una frase (un bug con causa clara, un ajuste) | **Sin plan.** Test que falla, arreglo, `code-audit` al final |
| Bug cuya causa no es obvia o cruza varios módulos | Plan `type: bug`, de una etapa |
| Feature nueva o con dudas sobre el enfoque | Plan `type: feature` |
| Refactor que toca varios módulos | Plan `type: refactor`, en etapas que se pueden mergear solas |

## Topes

`bash <carpeta de esta skill>/check-plan.sh <ruta>` los comprueba y, si "En
simple" se pasa, dice cuántas palabras tiene cada parte. Lee los topes de la
tabla "Topes" de `project.md`; un tipo que no está ahí usa los de abajo. Si no cabe porque
hay muchas etapas, "Después" las resume en una frase y cada etapa se
explica en su título. El tope de "En simple" y la forma son duros: un plan no se entrega con errores, se
recorta o se parte, nunca se sube el tope. Los otros dos son una guía: el
script avisa y quien escribe decide si sobra algo.

| Tipo | "En simple" (duro) | Hechos comprobados `V` (aviso) | Plan completo (aviso) |
|---|---|---|---|
| `bug` | 80 palabras | 5 | 80 líneas |
| `feature` | 120 palabras | 10 | 200 líneas |
| `refactor` | 120 palabras | 10 | 200 líneas |

## Escribir un plan

### 1. Conversar e investigar

- Lee el código que el cambio toca antes de preguntar nada. Mira también
  las otras ramas sin hacer checkout (`git fetch`, `git log --all -- <ruta>`,
  `git show <rama>:<ruta>`): el arreglo puede existir ya. Si existe, el plan
  liga la issue a ese arreglo en vez de rehacerlo. Si no existe, lo dice la
  línea de contexto del contraste, no una fila.
- Antes de proponer una pieza nueva (un error, un tipo, una función, una
  tabla), busca si el repo o sus dependencias ya la tienen (`rg`, los tipos
  en `node_modules`). Reutilizar evita cambios de esquema, de contrato y de
  orden de despliegue; si igual creas una, "Decisiones propias" dice por qué
  no sirve la existente.
- Si el cambio toca un contrato entre dos partes que se despliegan por
  separado (API y web, servidor y app móvil), el plan dice qué pasa si una sale
  antes que la otra y en qué orden se despliegan.
- Pregunta solo lo que el código no responde, una pregunta a la vez. Si hay
  dudas reales de enfoque, propón dos o tres opciones con tu recomendación.
- Si una pregunta se entiende mejor viéndola (pantallas, layout, un flujo,
  dos diseños lado a lado), ofrece `visual-preview` y sigue su skill. Lo que
  el usuario elige pasa al plan en palabras ("lista primero, filtros en una
  hoja inferior"); los mockups no se enlazan, porque no se commitean.
- Anota la evidencia de cada hecho en el momento (`archivo:línea`, un
  comando y su salida). Solo de los hechos de los que depende el cambio: si
  el hecho fuera falso, ¿el plan cambiaría? Si no, no va.

### 2. Escribir el documento

Ruta: la carpeta de planes de `project.md`; si no dice, `docs/plans/`. El
archivo se llama `AAAA-MM-DD-<tema>.md` (`<tema>` en inglés, kebab-case). Si el
repo tiene sus propias convenciones de planes (frontmatter, cierre, permisos
para correr tests), mandan; se agrega `type` para que corra el script.
Partes, en este orden y ninguna más:

1. **Frontmatter:** `status: draft`, `type: bug|feature|refactor`,
   `prs: []` y, si hay, `issue: <n>`.
2. **Título:** el cambio en pocas palabras.
3. **En simple:**

   ```markdown
   ## En simple

   **Decisión:** <una frase: qué cambia y para quién>.

   ### Hoy: <el problema, en 6 palabras o menos>
   <1 o 2 frases con un caso concreto> ([V1](#v1))

   ### Después: <el resultado visible>
   <el mismo caso, resuelto> ([etapa 1](#etapa-1))

   ### Riesgo: <cuál>          (opcional)
   <1 frase, comparada con la alternativa> ([S1](#s1))

   ### Nuevo: <qué precedente> (opcional, solo tras buscar el patrón con rg)

   **Fuera:** <lo que no se hace>.
   ```

   Reglas: los títulos dicen algo propio del plan, nunca solo "Hoy";
   oraciones de 25 palabras o menos (el script avisa), una idea cada una, en
   voz activa; sin rutas, código ni hashes (números de issue, nombres de
   producto y un nombre de módulo para poder buscarlo sí, sin acentos
   graves); sin palabras de relleno ("básicamente", "simplemente",
   "robusto"). Cada hecho de "Hoy" enlaza a su `V`; cada resultado de
   "Después", a su etapa. Escribe la "Decisión" al final, cuando lo demás
   ya esté claro.
4. **Preguntas para ti** (si hay): las dudas de alcance o de producto que
   cambian qué se construye y que ni el código ni la issue responden ("¿se
   cierran las sesiones de toda la cuenta o solo las del método nuevo?").
   Una por línea, con la opción que recomiendas y lo que cambia en el plan
   según la respuesta. Un hecho que no pudiste comprobar no va acá: es un
   `S`. Al responderlas, la respuesta pasa al plan y la sección se borra;
   un plan con preguntas no sale de `draft`.
5. **Etapas:** tabla `#`, `Etapa`, `Estado`, `PR`. Cada etapa funciona sola
   y se aprueba o descarta por separado; si necesita otra ya mergeada, su
   título lo dice ("requiere la 1"). Todas nacen `propuesta`. Un bug
   tiene una etapa; una feature puede tener una sola si partirla deja algo
   roto a medias. Una etapa puede no ser código (comentar una issue,
   migrar datos): en `PR` va el link a lo que la prueba.
6. **Decisiones propias** (si hay): lo que decidiste sin preguntar, una o
   dos líneas cada una, con lo que costaría si está mal y su `V` si se
   apoya en un hecho.
7. **Contraste con la realidad:** una línea con fecha, rama y commit, y la
   tabla `Id`, `Afirmación`, `Evidencia`, `Resultado`. `V1`… comprobado,
   `S1`… supuesto (los supuestos no cuentan para el tope). Cada id con su
   ancla (`<a id="v1"></a>`) y citado desde "En simple", "Decisiones
   propias" o el detalle; una fila que nada cita sobra.
8. **Detalle para agentes:** un `### <a id="etapa-1"></a>Etapa 1: …` por
   etapa, con:
   - **Archivos:** los que se crean o cambian.
   - **Tests, en orden:** una línea cada uno, con lo que afirma. Es la
     lista que se ejecuta con TDD: el primero tiene que fallar por la razón
     del problema. Si el comportamiento ya existe (arreglo en otra rama), el
     rojo lo da una mutación: se rompe el código, se ve fallar, se revierte.
   - **Siguen pasando:** los tests que ya existen y cubren lo que se toca.
     Sin esta línea, un agente con TDD rompe más de lo que arregla. De cada
     uno, comprueba que puede fallar si el cambio sale mal: si solo mira
     algo que no cambia (que exista `message`, por ejemplo), la etapa lo
     refuerza y lo dice. Lo mismo con los tests nuevos: una aserción que la
     base de datos cumple sola (filas que un `ON DELETE CASCADE` ya borra)
     no prueba el arreglo.
   - **Ojo** (si hay): el caso que la issue implica pero no nombra, el que
     un implementador pasaría por alto. Es el foco de `code-audit`.
   - **Hecho cuando:** el comando que lo prueba y su resultado esperado (si
     el repo exige permiso para correrlo, el paso dice que se pide).

   Nombres y firmas que quien implementa necesita, sí; cuerpos de funciones
   y pasos con casillas, no: el agente escribe el código. Las reglas del
   repo (`CLAUDE.md`, `AGENTS.md`) mandan sobre este formato.
9. **Desvíos:** vacía al escribir.

### 3. Revisar y entregar

1. Corre `check-plan.sh` hasta que pase.
2. Lee solo "En simple" y las etapas: ¿se entiende sin bajar más? Si no,
   reescríbelo.
3. Despacha un subagente nuevo con `reality-check-prompt.md` y aplica su
   informe (tabla de abajo). En `bug`, el subagente solo repite las
   evidencias e intenta refutar la causa: es la afirmación con más
   probabilidad de ser falsa.
4. Muéstrale al usuario primero las "Preguntas para ti", y después la ruta,
   qué cambió por el contraste (o "nada"), las decisiones propias y los
   supuestos `S`. **No se escribe código hasta que responde y lo aprueba.**
   Sin usuario (sesión desatendida), queda en `draft` con sus preguntas y
   se dice.

| El contraste encuentra | Qué haces |
|---|---|
| Una `V` que no se sostiene | Corrige la afirmación y lo que dependía de ella. Resultado: `✔ corregida: decía "…"` |
| Una afirmación sin evidencia | Compruébala (`V`) o pásala a supuesto (`S`) |
| Un contraejemplo | Ajusta el plan si cambia lo que se construye; si no, a "Decisiones propias" |
| Una pregunta que habría que adivinar | Si el código la responde, al detalle. Si cambia qué se construye, a "Preguntas para ti". Si es un hecho que no se puede comprobar, `S` |

## Ejecutar

Etapa por etapa, en la misma sesión: cada test de la lista en rojo y luego
en verde, y la suite del paquete al final de la etapa.

- **Contexto:** si la conversación para planificar fue larga, propón `/clear`
  y retoma desde el plan; el plan basta para implementar.
- **Registro de avance:** la tabla de etapas y "Desvíos" se actualizan al
  cerrar cada etapa, no al final. Tras un `/clear` o una compactación, se
  retoma leyendo el plan y `git log`.
- **Revisión:** un solo `code-audit` antes de pedir revisión del PR. Si el
  diff de una etapa pasa de unas 400 líneas, uno al cerrar esa etapa. El
  prompt dice qué se pidió, qué queda fuera y el `Ojo:`; nunca qué ignorar.

## Actualizar una etapa (`--stage`)

| Estado | Cuándo | Qué exige |
|---|---|---|
| `propuesta` | Nadie la empezó | — |
| `en curso` | Hay un PR abierto | El PR en la columna `PR` |
| `implementada` | PR mergeado o acción hecha | En "Desvíos", el comando que prueba que funciona, su resultado y lo que salió distinto (o "sin desvíos") |
| `descartada: <motivo>` | Se decide no hacerla | El motivo; la fila nunca se borra |

El frontmatter pasa a `in-progress` con la primera etapa `en curso` o
`implementada`, y cada PR se agrega a `prs`.

## Cerrar (`--close`)

Cuando ninguna etapa está `propuesta` ni `en curso`: `status: applied` y
`git mv` a `applied/` si alguna quedó implementada; `abandoned` y
`abandoned/` si todas se descartaron (salvo que `project.md` diga otra
forma de cerrar). Actualiza las referencias (`rg`). El commit que lo cierra
(por ejemplo `docs(plans): cierra el plan <tema>`, con el formato de
commits del repo) va al final del PR que termina el trabajo; sin PR,
pregunta dónde va.

## `--check`

Corre `check-plan.sh` y el contraste sobre un plan existente, y di qué
cambió.
