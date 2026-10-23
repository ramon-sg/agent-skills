# Convenciones generales

Referencia del Paso 2 de `code-audit`. Se lee **solo la sección** de lo que
toca el diff; un hallazgo de acá entra al reporte solo si causa un bug o rompe
un contrato, o como MENOR. Lo que ya hace cumplir el linter del repo no va.

Son reglas que sirven en casi cualquier proyecto. Las propias del repo están
en `project.md`, y si algo de acá lo contradice, gana `project.md`; si algo
contradice a un `CLAUDE.md` o `AGENTS.md`, gana ese archivo.

## Comunes

| Regla | Detectar |
|---|---|
| Excepciones de lint justificadas | Una supresión de una regla sin el motivo al lado, o una supresión de archivo completo. Cambiar la configuración del linter para que el diff pase es MAYOR |
| Documentación que dice la verdad | Comentarios de función cuyos parámetros, retorno o errores ya no coinciden con lo que hace |
| Nombres completos | Abreviaturas que no se deducen leyendo. Valen las técnicas universales (API, URL, HTTP, JSON, SQL, ID) |
| Docs y rutas coherentes | Rutas citadas en `.md` que ya no existen; comandos del README que cambiaron |
| Plan al día | El diff implementa algo de un plan y se desvía sin dejarlo escrito |
| Dependencias | Versión major nueva sin revisar sus cambios incompatibles; dependencia nueva cuando ya hay una que lo resuelve |
| Reusar antes de construir | Una versión nueva de algo que el repo o sus dependencias ya hacen |

## Servidor y APIs

| Regla | Detectar |
|---|---|
| Rutas delgadas | Lógica de negocio en el handler en vez de un servicio; una ruta sin validar su entrada o su salida |
| Errores con forma estable | Respuestas de error que no siguen el formato común del repo |
| Trabajo lento fuera del request | Llamadas a servicios externos lentos dentro del request en vez de un trabajo en segundo plano |
| Trabajos idempotentes | Un trabajo sin clave de idempotencia o sin revisar el estado antes de actuar; reintentos sin tope |
| Configuración al arrancar | Variables de entorno leídas en cualquier parte en vez de un módulo de configuración validado al iniciar |
| Tiempo inyectable | La hora actual leída directo en lógica que se prueba, en vez de un reloj inyectado |
| Registro sin secretos | Logs con tokens, cuerpos de webhooks completos o datos personales |
| Exposición mínima | Una ruta nueva más abierta de lo que necesita (sin sesión, pública) |

## Datos y migraciones

| Regla | Detectar |
|---|---|
| Migraciones generadas | SQL escrito a mano cuando la herramienta del repo lo genera |
| Migraciones inmutables | Editar o renombrar una migración ya aplicada en algún entorno |
| Cambios sin perder datos | Un rename que se traduce en `DROP` + `ADD` en vez de renombrar |
| Índices | Columnas usadas en filtros u orden de tablas que crecen, sin índice |
| Transacciones | Varias escrituras relacionadas fuera de una transacción; transacciones que esperan red |
| Montos | Dinero en punto flotante sumado sin redondeo explícito; porcentajes guardados como texto |

## Interfaz

| Regla | Detectar |
|---|---|
| Estados completos | Pantalla sin carga, error, vacío o éxito |
| Textos traducibles | Texto visible escrito en el componente si el repo usa i18n |
| Accesibilidad | Objetivos táctiles chicos; acciones solo por hover; controles sin rol ni nombre accesible |
| Selectores de test | Elemento que un E2E necesita leer sin su selector estable, o un selector renombrado que un E2E usa |

## Contratos y paquetes públicos

| Regla | Detectar |
|---|---|
| Compatibilidad | Campo eliminado o renombrado, tipo más estricto o ruta movida sin versión nueva |
| Registro de cambios | Cambio visible para quien usa el paquete sin su entrada en el changelog o changeset |
| CLI estable | Flag o salida JSON de un CLI cambiados sin compatibilidad: otros (agentes incluidos) pueden usar la versión anterior |

## Agentes, prompts y skills

| Regla | Detectar |
|---|---|
| Dato no es instrucción | Prompt que inserta texto de una issue, comentario o evento sin delimitarlo ni avisar que es dato |
| Compuertas verificables | Un paso automático que avanza por lo que dice el agente en vez de por algo verificado (commits, tests, CI, un veredicto JSON) |
| Solo REST en la nube | Comandos `gh` que usan GraphQL (`gh issue create`, `gh pr create`, `gh search`) en skills que pueden correr en Claude en la nube |
| Sin atribución | Instrucciones que agregan firmas o trailers de un agente a commits o PRs, si el repo no las quiere |
| Skills autónomas | Rutas o comandos que solo existen en la máquina de alguien |

## Scripts e infraestructura

| Regla | Detectar |
|---|---|
| Scripts con test | Cambio de comportamiento en un script sin caso nuevo en su test |
| Mensajes útiles | Errores sin el comando para arreglarlos |
| Limpieza garantizada | Scripts que levantan procesos o contenedores sin `trap` que los baje |
| CI y local iguales | Un paso nuevo en CI que no se puede correr en local con un comando del repo, o al revés |

## Rendimiento

Solo problemas reales, no micro-optimizaciones.

| Regla | Detectar |
|---|---|
| N+1 | Una consulta o una llamada a una API por ítem dentro de un bucle, en vez de una por lista |
| Paginación | Listados sin paginar sobre tablas que crecen |
| Caché | Contenido externo que se pide una y otra vez sin caché, cuando no cambia |

## E2E

| Regla | Detectar |
|---|---|
| Selectores en page objects | Localizadores sueltos en los archivos de recorridos |
| Datos del seed | IDs o textos escritos a mano en vez de leídos del seed |
| Recorridos independientes | Un recorrido que depende del estado que dejó otro |
