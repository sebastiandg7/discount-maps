# Guía para el dueño: cómo pedir cambios con la IA

_(Owner guide, in Spanish because the people who operate Discount Maps read Spanish. The agent-facing rules are in [agent-protocol.md](agent-protocol.md).)_

Esta guía es para quien administra Discount Maps sin ser programador. Explica cómo pedirle cambios a la IA (Claude Code), qué hace ella sola, qué te va a preguntar, cómo revisar y aprobar, y cómo deshacer.

## Cómo funciona un cambio, de principio a fin

1. **Tú pides** en tu idioma, en el chat de Claude Code. No necesitas saber dónde está el código.
2. **La IA trabaja en una rama aparte** (una copia de trabajo). Lo que está en línea no cambia hasta que tú apruebas.
3. **La IA verifica**: corre las pruebas automáticas y abre la app en su navegador para hacer clic donde cambió algo.
4. **La IA abre o actualiza un PR** (_pull request_: la propuesta de cambio) y te deja un resumen en lenguaje normal: qué cambió, qué comprobó, qué te toca a ti, cómo deshacerlo.
5. **Tú revisas y apruebas** el PR en GitHub (botón _Merge_). Ese clic es tuyo; la IA no puede darlo.
6. **Se publica** (cuando exista el despliegue automático de la Fase 10). Mientras tanto, la IA te dice cómo verlo en su navegador.

## Cómo pedir bien

Una buena petición dice **qué**, **dónde** y **cuándo está listo**. Ejemplos que funcionan:

- "Cambia el texto del botón de la pantalla de inicio de 'Soy persona' a 'Quiero descuentos'."
- "Sube el precio de la suscripción a 25.000 pesos. Está listo cuando la pantalla de la tarjeta lo muestre."
- "Agrega la categoría 'Mascotas' al mapa y al registro de negocios."
- "Un cliente dice que no le llegó la notificación del cupón nuevo de Pizzas del Norte. Averigua por qué."
- "Hazme administrador con mi correo x@y.com."

Trucos:

- Describe lo que ve la persona, no la solución técnica. "Que el mapa arranque en Medellín" es mejor que "cambia la constante del centro".
- Si tienes duda entre dos ideas, dilo: la IA propone una y explica por qué.
- Pega capturas o el texto exacto que ves en pantalla cuando reportes un problema.
- Puedes escribir `/owner-request` seguido de tu petición para que la IA siga el protocolo completo (clasificar el riesgo, hacer, verificar, resumir). También existen `/status` (en qué va todo), `/verify` (comprobar que todo sigue bien), `/ship` (cerrar y publicar el cambio) y `/undo` (deshacer el último cambio).

## Qué hace la IA sola y qué te pregunta

| Tipo de cambio                                                                                                                    | Qué pasa                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Verde**: textos, colores, íconos, enlaces de contacto, páginas informativas                                                     | Lo hace, lo verifica y te deja el PR. No pregunta.                                                                                         |
| **Amarillo**: reglas del producto (precio, días de prueba, mínimo de cupones, categorías, campos nuevos en formularios)           | Lo hace, pero te explica en el resumen qué regla cambió y desde cuándo aplica.                                                             |
| **Rojo**: borrar usuarios o negocios, cobros o reembolsos, reglas de reintentos de pago, permisos, claves, publicar en producción | Te explica qué va a pasar y qué no se puede deshacer, y **espera tu "sí" en el chat** antes de hacerlo. Un "sí" vale para una sola acción. |

Además hay un candado automático: los comandos más peligrosos (borrar la base de datos, forzar cambios en el historial, fusionar el PR) están bloqueados para la IA aunque se lo pidas por error.

## Cosas que solo tú puedes hacer

- Pegar claves y secretos (Wompi, Google Maps, Supabase) en los archivos `.env.local` o en el panel del hosting. La IA te dirá el **nombre** de la variable y el archivo; nunca te pedirá el valor por chat.
- Configurar cosas en paneles externos: Wompi (URL de eventos, producción), Google Cloud (restricciones de la clave), Supabase (secretos del Vault), el hosting.
- Aprobar y fusionar los PR.
- Hacer reembolsos en Wompi.

La lista completa de pendientes que dependen de ti está en [external-dependencies.md](external-dependencies.md) (en inglés; pídele a la IA que te la resuma).

## Cómo revisar un PR sin leer código

Abre el PR en GitHub y lee solo la descripción:

1. **Resumen para el dueño**: ¿describe lo que pediste?
2. **Verificación**: ¿dice qué pantallas abrió y qué vio? ¿Dice que las pruebas automáticas pasaron?
3. **Acciones del dueño**: ¿hay algo que te toca hacer antes o después?
4. **Cómo deshacer**: siempre debe existir.

Si algo no cuadra, responde en el chat: "en el PR dice X pero yo pedí Y". No hace falta comentar en GitHub.

Si quieres verlo funcionando antes de aprobar, pide: "muéstrame una captura de la pantalla nueva" o "ábrelo en tu navegador y cuéntame qué ves".

## Cómo deshacer

- Antes de aprobar el PR: escribe `/undo` o "deshaz el último cambio". La IA revierte y actualiza el PR.
- Después de fusionar: "revierte el PR #N". La IA crea un nuevo PR que deshace el anterior; tú lo apruebas.
- Nunca se borra historial; siempre se añade un cambio que deshace otro. Por eso todo se puede rastrear.

## Cuentas de prueba

Existen usuarios de prueba (`…@discountmaps.test`, contraseña compartida en [database.md](database.md)) que la IA usa para verificar. **Antes de lanzar** pide: "limpia los datos de prueba". La IA te mostrará la lista y esperará tu "sí".

## Glosario mínimo

- **PR (pull request)**: propuesta de cambio con su descripción; tú la apruebas con _Merge_.
- **Rama**: copia de trabajo donde la IA hace cambios sin tocar lo publicado.
- **Migración**: cambio en la estructura de la base de datos; se añade, nunca se edita una ya aplicada.
- **Variable de entorno / `.env.local`**: archivo con claves que no se sube al repositorio.
- **Vault**: caja fuerte de secretos dentro de la base de datos.
- **Sandbox**: entorno de pruebas de Wompi; las tarjetas `4242…` y `4111…` son falsas.
- **Fixture**: dato de prueba creado a propósito.

## Qué no esperar de la IA

- No hace despliegues a producción por su cuenta ni aprueba sus propios PR.
- No adivina claves ni entra a tus paneles.
- No cambia reglas de dinero, permisos o borrado de datos sin tu "sí" explícito.
- Si algo no se pudo verificar (por ejemplo, una notificación en un celular real), lo dice en el resumen en vez de darlo por hecho.
