---
name: installed-version-docs
description: |
  Hace que el agente use la API de la versión instalada de cada biblioteca,
  no la que recuerda. Un script escribe en `AGENTS.md` (o `CLAUDE.md`) un
  bloque con la versión instalada de cada dependencia directa y dónde está su
  documentación, y lo regenera cuando cambia el lock.
  Usar cuando: (1) Se va a escribir código con una biblioteca del proyecto y
  el bloque no existe o está viejo, (2) Se instalaron, actualizaron o
  quitaron dependencias, (3) Un error muestra que se usó una API vieja,
  (4) Se pide instalar o revisar el índice de versiones.
argument-hint: "[--check]"
---

# Documentación de la versión instalada

El modelo aprendió cada biblioteca como era cuando lo entrenaron. El proyecto
puede usar otra versión, más nueva o más vieja, con otra API: Zod 4 en vez de
3, las relations v2 de Drizzle, un Next.js anterior. Esta skill deja a la
vista del agente qué versión está instalada y dónde leer cómo se usa.

El índice va en `AGENTS.md` y no en esta skill porque ese archivo el agente
lo lee siempre; una skill hay que decidir abrirla, y muchas veces no se abre.

## El bloque

`scripts/library-docs.mjs` escribe un bloque entre
`<!-- BEGIN:installed-version-docs -->` y `<!-- END:installed-version-docs -->`:

| Biblioteca | Versión | Documentación | Error típico |
|---|---|---|---|
| zod | 4.1.5 | types: index.d.ts · README.md · CHANGELOG.md · web: zod.dev | usa `z.email()`, no `z.string().email()` |
| next | 16.2.1 | docs: dist/docs/ · README.md · web: nextjs.org | |

- **Versión:** la de `node_modules`, no el rango de `package.json`. Lo que
  no está instalado queda como `(sin instalar)`.
- **Documentación:** en orden de prioridad. Primero lo del autor (`skill:`,
  `docs:`, `llms:`), después los tipos, el README, el CHANGELOG y el sitio.
  Son referencias, no copias.
- **Error típico:** se escribe a mano y el script lo conserva.
- Solo dependencias directas; los paquetes `@types/*` se omiten.
- El bloque guarda una huella del lock y de las dependencias declaradas.

Fuera del bloque el script no toca nada. Elige `AGENTS.md`; si no existe y
hay un `CLAUDE.md`, usa ese. Si escribe en `AGENTS.md` y el `CLAUDE.md` no lo
importa, avisa: hay que agregarle la línea `@AGENTS.md`.

## Generar o revisar

Requiere Node, sin dependencias. Desde la raíz del proyecto, la del
`package.json`:

```bash
node <carpeta de esta skill>/scripts/library-docs.mjs --check   # ¿está al día?
node <carpeta de esta skill>/scripts/library-docs.mjs           # lo escribe o lo regenera
```

`--project-dir <carpeta>` lo corre en otra (en un monorepo, la de cada app).
`--check` no escribe nada: sale con 0 si está al día y con 1 si falta o
cambió el lock.

- **Antes de escribir código con una dependencia:** `--check`. Si sale con
  1, regenera.
- **Después de instalar, actualizar o quitar dependencias:** regenera.
- **Avisos:** si hay dependencias sin instalar, instálalas y vuelve a
  correrlo. Si el bloque pasa de 8 KB, dilo: llena el contexto.

El bloque se commitea con el cambio. Para que se regenere solo, se puede
agregar a `package.json`, pero solo si el usuario lo pide:

```json
"scripts": { "postinstall": "node .agents/skills/installed-version-docs/scripts/library-docs.mjs" }
```

## Usar una biblioteca

1. **Busca su fila** en el bloque. Si tiene `skill:`, carga esa skill: la del
   autor manda sobre esta.
2. **Lee la documentación en el orden de la fila**, solo la parte que
   necesitas. Las rutas son relativas a `node_modules/<biblioteca>/`, o a la
   carpeta de `en:`. En `web:`, busca `llms.txt` o la documentación de esa
   versión, no la última.
3. **Di qué versión usas**, en una línea: "Zod 4.1.5: uso `z.email()`".
4. **Si la API no aparece en esas fuentes, dilo.** No adivines ni completes
   con lo que recuerdas.
5. **Comprueba con el compilador** si el proyecto lo tiene (`tsc --noEmit`,
   el lint): una API vieja suele fallar ahí.

Cuando un error muestre que se usó una API vieja, anota en "Error típico" de
esa fila qué se usa ahora, en pocas palabras. Así no se repite.

## Qué no hace

- No usa MCP ni servicios externos: lee lo instalado.
- No copia la documentación al repo.
- Solo proyectos con `package.json` (npm, pnpm, yarn, bun).
