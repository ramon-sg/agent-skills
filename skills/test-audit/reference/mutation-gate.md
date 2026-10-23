# Puerta de mutación

Referencia del Paso 4 de `test-audit`. Se usa cuando el Paso 3 marca un test
como sospechoso, o siempre en `--suite`. **No es un barrido** sobre cada test.

## Alcance

- **Sí:** tests unitarios y de integración que corren en procesos cortos, sin
  servidor externo (una base en memoria o en un archivo temporal sirve).
- **Con cuidado:** tests que levantan el servidor completo. Corre solo ese
  archivo, nunca la suite entera mientras hay una mutación aplicada.
- **Nunca:** recorridos E2E. Mutar código mientras un E2E puede estar
  corriendo contra el mismo checkout contamina esa corrida.

## Protocolo

1. **Línea base:** corre el archivo tal cual, con el comando de `project.md`.
   Si no está verde, no hay nada que mutar: el hallazgo es que el test está
   roto.
2. **Nombra el mecanismo** que el test dice cubrir: la guarda, el retorno
   temprano, la rama, el cálculo, la verificación de firma. Un log o un
   comentario no son mecanismo.
3. **Respalda y borra el mecanismo** en el código de producción (ver
   "Respaldo"). Borrar, no debilitar: debilitar deja escapatorias.
4. Corre el mismo comando y **exige rojo**, con el mensaje apuntando al
   mecanismo.
5. **Restaura** y verifica.
6. Anota en el reporte qué se mutó y qué pasó.

Un test que sobrevive a la mutación de su propio mecanismo es **CRITICO**: no
es un test débil, es un test que no existe y que impide que alguien lo
escriba, porque el hueco parece cubierto.

## Cuando el verde tiene razón

Si el test sigue verde y hay una razón real (código inalcanzable desde ese
test, texto que nadie lee), no se aprueba solo: ejecuta algo que lo demuestre
(`git grep -n '<identificador>'` sin llamadores) y pega la salida. Sin salida
real, el veredicto es CRITICO.

**Mutante equivalente** (otro mecanismo ya garantiza el mismo resultado):
"siguió verde" es la misma observación que produce un test débil, y la
equivalencia se juzga mal con frecuencia. Nunca se aprueba solo: baja a
**MAYOR** con la nota "posible mutante equivalente, requiere revisión
humana".

## Respaldo

⛔ **Nunca restaurar con `git checkout -- <archivo>`, `git stash` ni
`git restore`.**

El respaldo es una copia en el scratchpad de la sesión (el que indica el
system prompt). Si no hay scratchpad, usa `mktemp -d`, nunca una carpeta
dentro del repo, y anota la ruta. El respaldo **replica la ruta del
archivo**, para que dos `index.ts` no se pisen. Cada llamada a Bash es un
shell nuevo: escribe la ruta completa en cada comando.

```bash
mkdir -p <respaldos>/src/ruta
cp src/ruta/archivo.ts <respaldos>/src/ruta/archivo.ts.bak
test -s <respaldos>/src/ruta/archivo.ts.bak && echo RESPALDO_OK
```

**No mutes hasta ver `RESPALDO_OK`.** Para restaurar:

```bash
cp <respaldos>/src/ruta/archivo.ts.bak src/ruta/archivo.ts
cmp -s <respaldos>/src/ruta/archivo.ts.bak src/ruta/archivo.ts && echo RESTAURADO_OK
```

**Si `RESTAURADO_OK` no aparece, detente.** Es un fallo bloqueante y se
reporta antes que cualquier hallazgo.

Al terminar, vuelve a correr `git diff --stat` (mismas flags del Paso 1) y
`git status --short` (a secas) y compáralos con los guardados. Si no
coinciden, algo quedó sin restaurar.
