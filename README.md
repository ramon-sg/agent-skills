# agent-skills

Skills de agente que sirven en cualquier proyecto: planificar, explicar en lenguaje llano, mostrar mockups en el navegador, revisar un cambio y juzgar tests. Se instalan con [`@ramon-sg/skills-manager`](https://github.com/ramon-sg/skills-manager), que las copia a `.agents/skills/` del repo para que funcionen también en las sesiones de Claude en la nube.

## Skills

| Skill | Categoría | Para qué sirve | Trae también |
|---|---|---|---|
| `planning` | Planes y escritura | Un plan corto en un solo documento, con tope de palabras por tipo (bug, feature, refactor) que comprueba un script | `narrative-summary`, `visual-preview` |
| `narrative-summary` | Planes y escritura | La parte "En simple" de planes e issues, y explicaciones en lenguaje llano | — |
| `visual-preview` | Planes y escritura | Mockups en HTML en una pestaña del navegador que se recarga sola, para decidir pantallas y layouts viéndolos; el usuario elige con un clic. Requiere Node | — |
| `code-audit` | Calidad | Una revisión antes del PR, proporcional al cambio, que termina con un veredicto JSON | `test-audit` |
| `test-audit` | Calidad | Si los tests prueban de verdad lo que dicen, con puertas de determinismo y mutación | — |

Las skills están en español. Cada una es una carpeta en `skills/`, y `skills-catalog.json` las lista con su categoría, lo que necesitan y sus archivos editables.

## Instalar

```sh
npx @ramon-sg/skills-manager@1 add --catalog ramon-sg/agent-skills
```

Se abre un menú agrupado por categoría, con la descripción de cada skill. En un repo sin `.agents/skills.json`, usa `init` en vez de `add`. Sin terminal (por ejemplo desde un agente):

```sh
npx @ramon-sg/skills-manager@1 add --catalog ramon-sg/agent-skills --candidates
npx @ramon-sg/skills-manager@1 add --catalog ramon-sg/agent-skills --select catalog:ramon-sg/agent-skills/planning
```

Commitea lo que queda en `.agents/`: así las skills llegan también a la nube.

## Lo propio de cada repo: `project.md`

`planning`, `code-audit` y `test-audit` traen un `project.md.template`. Al instalarlas se crea `project.md` a partir de él, y ese archivo es del repo:

- **Qué va ahí:** la carpeta de planes y sus topes, la rama base, los comandos de lint y tests, las convenciones por ruta, los riesgos conocidos y los casos reales.
- **Se puede editar:** `check` no lo marca, y las actualizaciones lo conservan.
- **El resto no:** cualquier otro archivo de la skill sigue fijo.

Si `project.md` sigue igual que la plantilla, cada skill usa lo que dice por defecto.

## Actualizar

```sh
npx @ramon-sg/skills-manager@1 update --dry-run   # qué cambiaría
npx @ramon-sg/skills-manager@1 update planning    # solo esa skill
```

Cada skill se actualiza por separado. Una versión publicada es una tag `vX.Y.Z` de este repo.

## Desarrollo

```sh
npm install && npm test
```

Los tests comprueban que el catálogo y las carpetas coincidan, que los links entre skills resuelvan, que ninguna skill nombre el proyecto del que salió, el script de `planning`, el servidor de `visual-preview` y una instalación completa con `skills-manager`.

## Relacionados

- [`issue-flow`](https://github.com/ramon-sg/issue-flow): flujo de issue a PR con worktrees, y las skills que lo usan.
- [`skills-manager`](https://github.com/ramon-sg/skills-manager): instala y actualiza estas skills.

## Licencia

MIT. Los scripts de `visual-preview` vienen del "Visual Companion" de [superpowers](https://github.com/obra/superpowers) (MIT, Copyright (c) 2025 Jesse Vincent) y conservan su aviso.
