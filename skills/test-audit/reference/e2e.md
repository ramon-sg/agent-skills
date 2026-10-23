# Tests E2E

Referencia de `test-audit`. Se lee solo cuando hay archivos de `e2e/**` en lo
que se revisa. Los ejemplos son de Playwright; la idea vale para cualquier
runner de E2E. Las plataformas que el repo cubre están en `project.md`.

Antes de juzgar, lee el seed o los datos de partida: cruzar las aserciones con
ellos es la única forma de detectar las tautológicas.

## Puerta 0

`test.only`, `test.skip` o `test.fixme` sin condición: **CRITICO**.
`forbidOnly` solo actúa en CI; en local un `.only` apaga el resto.

## Qué buscar

- **Test fantasma:** solo `goto` + `toHaveURL()` o `toBeVisible()` del
  `body`, sin verificar ningún dato.
- **Lecturas que no reintentan:** `.count()`, `.isVisible()` o
  `.innerText()` guardados en una variable no esperan; solo
  `expect(locator)` reintenta. Usar `toHaveCount`, `toHaveText`.
- **Negativa sin ancla:** `not.toBeVisible()` o `toHaveCount(0)` sin antes
  confirmar que la página cargó: pasan en el primer instante.
- **Asimetría de espera:** si la positiva necesita N ms para ver algo, la
  negativa del mismo elemento no puede mirar menos de N.
- **Esperas por tiempo** (`waitForTimeout`) o `retries` subidos para tapar
  un recorrido inestable: la causa es esperar un estado derivado en vez de la
  señal real.
- **Una sola plataforma:** un recorrido que el repo exige en varias
  plataformas (ver `project.md`) y corre en una sola. Lo que depende de una
  app nativa (gestos, teclado, notificaciones) no se prueba en una simulación
  web: ese recorrido no prueba nada.
- **Page objects y helpers** que tragan excepciones
  (`.then(() => true, () => false)`) apagan la verificación de todos los
  recorridos que los usan.

La puerta de mutación **nunca** se aplica a E2E.
