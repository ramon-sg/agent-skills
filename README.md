# agent-skills

Skills de agente que sirven en cualquier proyecto: planificar, explicar en lenguaje llano, revisar un cambio y juzgar tests. Se instalan con [`@ramon-sg/skills-manager`](https://github.com/ramon-sg/skills-manager), que las copia a `.agents/skills/` del repo para que funcionen también en las sesiones de Claude en la nube.

> **Estado:** en construcción. El repo todavía no tiene skills.

## Qué va a tener

| Skill | Para qué sirve |
|---|---|
| `planning` | Un plan corto en un solo documento, con tope de palabras por tipo (bug, feature, refactor) que comprueba un script |
| `narrative-summary` | La parte "En simple" de planes e issues, y explicaciones en lenguaje llano |
| `code-audit` | Una revisión antes del PR, proporcional al cambio, que termina con un veredicto JSON |
| `test-audit` | Si los tests prueban de verdad lo que dicen, con puerta de mutación |

Cada skill es una carpeta en `skills/`. `skills-catalog.json` las lista con su descripción, su categoría y las skills que necesita (`planning` necesita `narrative-summary`).

## Cómo se va a instalar

```sh
npx @ramon-sg/skills-manager add --catalog ramon-sg/agent-skills
```

Se abre un menú para marcar qué skills quieres. Cada una se actualiza por separado (`skills-manager update planning`). Lo propio de cada repo, como la carpeta de planes o las convenciones de revisión, va en el `project.md` de la skill, que las actualizaciones no tocan.

## Relacionados

- [`issue-flow`](https://github.com/ramon-sg/issue-flow): flujo de issue a PR con worktrees, y las skills que lo usan.
- [`skills-manager`](https://github.com/ramon-sg/skills-manager): instala y actualiza estas skills.

## Licencia

MIT
