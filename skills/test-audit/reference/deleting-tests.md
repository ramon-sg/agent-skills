# Borrar o consolidar tests

Referencia de `test-audit`. Se lee solo cuando se propone borrar o
consolidar un test.

## Evidencia que exige el reporte

1. El test exacto y qué puede detectar hoy.
2. La prueba más fuerte que queda cubriendo el mismo contrato.
3. La salida de `git grep` de los llamadores fuera de tests del código que
   sostiene (`git grep -n '<identificador>' -- ':!*.test.*' ':!*.spec.*'`).
4. Por qué existe (`git log --follow <archivo>`).
5. Qué código de producción se va con él (seams que solo existían para el
   test).

Sin esa evidencia, la propuesta no entra al reporte.

## Lo que se conserva

Aunque parezca redundante, se conserva un test que protege sin ayuda un
contrato de API pública, del CLI, de un webhook, de seguridad, de
presupuesto, una migración o un valor por defecto. Lento no es razón para
borrar. El objetivo es confianza, no bajar el conteo.

## Consolidar

Antes que un casi duplicado, una fila más en la tabla del test que ya existe
(`test.each`). Cada contrato tiene un test dueño en el límite más fuerte; otra
capa se justifica solo si cubre un riesgo distinto (transporte, interfaz).
