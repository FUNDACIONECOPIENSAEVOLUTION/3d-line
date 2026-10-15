# 3 LINE-AR — V57.0.0 beta 3

**Juega en:** https://fundacionecopiensaevolution.github.io/3d-line/

Juego 3D táctico por turnos para computador y celular, con sala privada WebRTC por código o QR, IA rival y realidad aumentada experimental.

## V57: cambios jugables

- Menú retro-cyber neón inspirado en el diseño V51.4, con personalización de **cinco colores** y **cinco insignias**. Nombre, nivel y ELO de invitado se guardan localmente en el navegador.
- **Tutorial de 5 nodos**: abre «TUTORIAL: NIVEL 1», pulsa el dado en el HUD, toca dos nodos y construye triángulos. La IA del tutorial pasa su turno para facilitar el aprendizaje.
- **10 niveles iniciales**: 5, 6, 7, 9, 9, 12, 16, 20, 25 y 30 nodos. Desde nivel 5 los nodos se ubican aleatoriamente con una semilla controlada por el anfitrión para que ambos móviles vean el mismo tablero.
- **Dado de seis caras (1–6 conexiones)** con aleatoriedad derivada de crypto.getRandomValues; no sigue una secuencia fija.
- **Solo base holográfica inferior**, postes y nodos flotantes, sin cubo 3D cerrado.
- Las reglas impiden que una conexión proyectada al suelo (plano XZ) atraviese otras conexiones ya realizadas, y que atraviese nodos intermedios. Al cerrar un triángulo, se bloquean los nodos interiores y se colorea el área y la insignia de su dueño. Se trata de un bloqueo **2D proyectado**, no todavía de detección volumétrica exacta de paredes 3D.
- El anfitrión conserva autoridad sobre el dado, las reglas, los turnos, la puntuación, los puntos y el nivel en partidas PvP.

## Para probar en dos dispositivos

1. Abre la página HTTPS en computador o primer teléfono.
2. Pulsa **CREAR SALA (QR)**. Comparte los seis caracteres o muestra el QR.
3. En el segundo dispositivo abre el enlace y pulsa **UNIRME** escribiendo el código o escaneando el QR.
4. Pulsa el dado luminoso cuando sea tu turno. Elige dos nodos próximos para conectarlos y cierra triángulos para sumar 10 puntos por triángulo.
5. Puedes elegir un nivel en la sección **NIVELES** antes de crear una partida o iniciar un entrenamiento contra CPU.
6. Comprueba puntuación y turnos iguales en ambos dispositivos. En caso de error, usa **DIAGNÓSTICO** y copia el informe.

La beta usa PeerJS y su señalización pública; algunas redes móviles o NAT estrictos pueden requerir TURN, que aquí **no está configurado**. El juego aún no tiene backend propio ni cuenta persistente entre dispositivos.

## Realidad aumentada

La V57 prueba varios espacios de referencia XR (`local`, `local-floor`, `viewer`) antes de ceder el control al motor de Three.js, para evitar que `requestReferenceSpace` quede limitado a un modo no soportado. La búsqueda de superficie pasa a ser opcional; si falla puede mostrar un tablero holográfico sin anclaje estable. **No se garantiza que AR funcione en todos los celulares.**

El modo AR y el modo 3D pueden mostrar una partida compartida, pero **todavía no comparten la misma ancla física**. La alineación exacta entre dos celulares en una habitación necesita identificación de marcadores/anclajes espaciales compatibles, calibración y pruebas reales.

## Google, guardado y monetización

`auth-config.json` trae `clientId` vacío. Para habilitar Google Identity hay que crear un Client ID de aplicación web en Google Cloud y autorizar el origen `https://fundacionecopiensaevolution.github.io`. La identificación visual disponible una vez configurado el Client ID **no es una sesión verificable por sí misma**: hay que validar el token en un backend o usar un proveedor de autenticación verificada (Firebase, etc.) antes de proteger rankings, premios o progreso multi-dispositivo.

No es necesario ni apropiado conectar Google Drive personal como backend de las partidas. No se solicita ninguna contraseña.

El anuncio recompensado permanece desactivado hasta contar con ID publicitario real y aprobación de un programa publicitario apto para juegos HTML5. No se anuncian ingresos inexistentes ni se entregan monedas por anuncios falsos. El ELO y las monedas del navegador son solo progreso local de beta y aún no forman una economía segura.

## Calidad, versión y despliegue

- La versión en cabecera es **V57.0.0** y la versión interna es **57.0.0-beta.1**.
- Cada cambio debe actualizar `version.json`, `CHANGELOG.md` y las etiquetas de recursos del HTML.
- Las pruebas automáticas de CI están en `tests/static.test.mjs` y `tests/rules.test.mjs`.
- `.github/workflows/pages.yml` prepara GitHub Pages. El estado del despliegue se consulta en la pestaña Actions.

## AWS

El script `scripts/setup-aws-agent-toolkit.ps1` y la guía `AWS_SETUP_WINDOWS.md` están incluidos, pero no se aprovisionan recursos AWS de pago sin autorización expresa. Este proyecto actualmente usa GitHub Pages gratuito.
