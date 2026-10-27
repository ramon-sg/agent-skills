---
name: visual-preview
description: |
  Abre en el navegador del usuario una pestaña local con mockups en HTML
  (pantallas, layouts, diagramas, opciones lado a lado) que el agente escribe
  y que se recarga sola. El usuario responde en la terminal y puede hacer
  clic para elegir; los clics quedan en un archivo que el agente lee.
  Usar cuando: (1) Una pregunta se entiende mejor viéndola que leyéndola
  (layout, navegación, flujo de pantallas, comparar dos diseños),
  (2) `planning` llega a una decisión visual, (3) El usuario pide ver un
  mockup o una vista previa.
argument-hint: "[--stop]"
---

# Vista previa en el navegador

Una pestaña para mostrar, no un modo: aceptarla no manda todas las preguntas
al navegador. Requiere Node (sin dependencias).

Muestra **mockups en HTML**, no la app real. Sirve para decidir layout, flujo
y jerarquía; no para validar un widget de Flutter ni un componente de React.
Para eso, la app corriendo (`flutter run -d chrome`, el servidor de
desarrollo).

## ¿Va en el navegador?

Por pregunta, no por sesión: **¿lo entendería mejor viéndolo?**

| Al navegador | A la terminal |
|---|---|
| Mockups de pantallas, layouts, navegación | Alcance y requisitos |
| Un flujo de varias pantallas | Opciones descritas en palabras |
| Dos o tres diseños lado a lado | Ventajas y desventajas |
| Diagramas: arquitectura, estados, flujo de datos | Decisiones técnicas (API, datos) |

Que el tema sea de interfaz no basta. "¿Qué tipo de onboarding quieres?" va
en la terminal; "¿cuál de estos tres onboarding se siente mejor?", al
navegador.

## Ofrecerla

La primera vez que aparece una pregunta visual, nunca antes, en un mensaje
que no lleva nada más:

> "Esto se entiende mejor viéndolo. ¿Abro una pestaña del navegador con unos mockups?"

Si dice que no, se sigue en texto y no se vuelve a ofrecer salvo que lo pida.

## Arrancar

```bash
bash <carpeta de esta skill>/scripts/start-server.sh --project-dir <raíz del repo> --open
```

Devuelve una línea JSON con `url`, `screen_dir` y `state_dir`; guárdalos.
Las pantallas quedan en `<repo>/.visual-preview/`, que trae su propio
`.gitignore`. Con `--open` el navegador se abre solo con la primera pantalla;
igual dale la URL al usuario, por si no se abre (sesión remota o sin
pantalla).

- **La URL lleva `?key=…`:** dala completa, nunca solo `host:puerto`. Sin la
  clave, el servidor responde 403.
- **Sin la salida JSON:** está en `<state_dir>/server-info`.
- **Si el entorno mata los procesos en segundo plano** (Codex, Windows): el
  script pasa solo a primer plano; en otros, `--foreground` y el mecanismo
  de segundo plano del harness (en Claude Code, `run_in_background`).
- **Remoto o en un contenedor:** `--host 0.0.0.0 --url-host localhost`.

## El ciclo

1. **Comprueba que sigue vivo:** existe `<state_dir>/server-info` y no
   existe `<state_dir>/server-stopped`. Si se cayó (se apaga solo tras 4
   horas sin uso), arráncalo con el mismo `--project-dir`: reutiliza puerto
   y clave, y la pestaña abierta se reconecta sola.
2. **Escribe la pantalla** en un archivo nuevo de `screen_dir`, con la
   herramienta de escribir archivos (no `cat` ni heredoc). Nombre que diga
   qué es (`home-layout.html`, `checkout-flow.html`); las versiones,
   `home-layout-v2.html`. Nunca se reusa un nombre: se muestra el más nuevo.
3. **Termina el turno:** la URL, una frase con lo que hay en pantalla y la
   pregunta ("¿Cuál te parece? Puedes hacer clic para elegir").
4. **En el turno siguiente:** lee `<state_dir>/events` si existe (un JSON por
   clic; el último suele ser la elección, pero los anteriores muestran dudas
   que vale la pena preguntar) y júntalo con lo que escribió en la terminal,
   que manda. El archivo se vacía con cada pantalla nueva.
5. **Itera o avanza:** si la respuesta cambia la pantalla, una versión nueva;
   solo se pasa a la siguiente pregunta cuando esta quedó resuelta.
6. **De vuelta a la terminal:** si la siguiente pregunta no es visual,
   escribe `waiting.html` (o `waiting-2.html`…) para que no quede una
   decisión ya tomada en pantalla:

   ```html
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">Seguimos en la terminal…</p>
   </div>
   ```

## Escribir una pantalla

Escribe solo el contenido: el servidor lo envuelve en un marco con tema
claro y oscuro, estado de conexión y las clases de abajo. Si el archivo
empieza con `<!DOCTYPE` o `<html>`, se sirve tal cual (solo se le agrega el
script de clics); úsalo cuando necesites control total.

```html
<h2>¿Qué inicio funciona mejor?</h2>
<p class="subtitle">Piensa en quien abre la app por primera vez</p>

<div class="screens">
  <div class="screen" data-choice="a" onclick="toggleSelect(this)">
    <div class="phone">
      <div class="phone-status"><span>9:41</span><span>●●●</span></div>
      <div class="phone-appbar">Pedidos</div>
      <div class="phone-body">
        <div class="mock-list-item">Pedido 1042<small>En camino</small></div>
      </div>
      <div class="phone-tabbar"><span>Inicio</span><span>Pedidos</span><span>Perfil</span></div>
    </div>
    <div class="caption"><b>A.</b> Lista primero</div>
  </div>
  <!-- B, C… -->
</div>
```

| Clase | Para qué |
|---|---|
| `.options` > `.option` (con `.letter` y `.content`) | Elegir entre A, B, C en texto con algo de apoyo visual |
| `.cards` > `.card` (con `.card-image` y `.card-body`) | Diseños en tarjetas |
| `.screens` > `.screen` > `.phone` | Pantallas de app móvil; dentro, `.phone-status`, `.phone-appbar`, `.phone-body`, `.phone-tabbar`, `.phone-fab` |
| `.mockup` (con `.mockup-header` y `.mockup-body`) | Una pantalla web o de escritorio |
| `.split` | Dos cosas lado a lado |
| `.pros-cons` (con `.pros` y `.cons`) | Ventajas y desventajas |
| `.mock-nav`, `.mock-sidebar`, `.mock-content`, `.mock-button`, `.mock-input`, `.mock-list-item`, `.placeholder` | Piezas de wireframe |
| `h2`, `h3`, `.subtitle`, `.section`, `.label` | Texto |

- Lo que se elige lleva `data-choice="<id>"` y `onclick="toggleSelect(this)"`.
  Con `data-multiselect` en el contenedor, se eligen varias.
- Las imágenes van en `screen_dir` y se piden como `/files/<nombre>`.
- El marco completo está en `scripts/frame-template.html`.

**Cómo se hace bien:** la pregunta escrita arriba de cada pantalla; de 2 a 4
opciones; la fidelidad que pide la pregunta (wireframe para layout, más
detalle si la duda es de estilo); textos reales del producto cuando importan,
nunca "Lorem ipsum".

## Cerrar (`--stop`)

```bash
bash <carpeta de esta skill>/scripts/stop-server.sh <carpeta de la sesión>
```

La carpeta de la sesión es la que contiene `screen_dir` y `state_dir`. Con
`--project-dir`, las pantallas quedan en `.visual-preview/` para revisarlas
después; sin él, se borran.

Adaptada del "Visual Companion" de
[superpowers](https://github.com/obra/superpowers) (MIT, Jesse Vincent).
