# 3 LINE-AR — V57.2.0 beta 5

**Juega en:** https://fundacionecopiensaevolution.github.io/3d-line/

Juego 3D táctico por turnos para computador y celular, con sala privada WebRTC por código o QR, IA rival y realidad aumentada experimental.

## V57.2: Firebase del juego conectado al proyecto correcto

La configuración oficial de **la aplicación web ya registrada** en Firebase `d-line-g` fue entregada por el usuario (captura del 15/10/2026). El código `auth.js` contiene desde esta versión la configuración del SDK Web correspondiente a `d-line-g` y deja de usar `ar-3lilne`. El dominio `fundacionecopiensaevolution.github.io` fue mostrado como autorizado en Firebase Authentication por el usuario.

**Pendiente de comprobar con una sesión real:** que el proveedor **Google** esté activado en Authentication → Método de acceso; que la cuenta abra correctamente el popup de Google y que `onAuthStateChanged` restaure la sesión al volver a entrar. **No se verificó** con el conector MCP de Firebase, porque sus herramientas no se cargaron en esta conversación.

La persistencia `browserLocalPersistence` sigue habilitada. **Atención a la migración:** el mismo correo autenticado en proyectos Firebase diferentes puede tener otro `uid`; el progreso que la versión anterior guardaba bajo el UID de `ar-3lilne` puede quedar separado. No se copiaron ni fusionaron datos de jugadores; requiere plan de migración, consentimiento y pruebas.

**Firestore sigue pendiente**: primero se debe consultar en el proyecto `d-line-g` si ya existe una base, su edición y región, y después configurar reglas restrictivas y pruebas. No se ha activado la sincronización de puntuación/niveles entre celulares. Los anuncios de pago y las anclas AR compartidas tampoco están activados.

## V57.1: inicio de sesión, tutorial y desbloqueo

Al abrir se muestra primero una pantalla de acceso. El usuario puede iniciar sesión con Google mediante Firebase Authentication (configuración pública original V51.2) o como invitado. El sistema usa `browserLocalPersistence` para recordar la sesión en el mismo navegador, hasta que el usuario cierre sesión, borre datos o Firebase invalide su acceso. En caso de indisponibilidad de Firebase, se ofrece invitado local con aviso.

**Para verificar Google login**: en Firebase Console, proyecto `ar-3lilne`, ve a **Authentication → Settings → Authorized domains** y comprueba que `fundacionecopiensaevolution.github.io` esté autorizado. Asegura que **Google** y **Anonymous** estén habilitados en **Sign-in method**. Estos son pasos administrativos en Firebase que no se pueden confirmar desde un archivo HTML ni garantizar a priori. La interfaz indica cualquier rechazo de Google; no convierte automáticamente un error de Google en acceso autenticado.

El tutorial tiene un BOT automático como jugador 2. El dado galáctico centrado entre puntuaciones tira aleatoriamente 1 a 6. Si se acaban los enlaces disponibles antes que las tiradas, se termina el turno automáticamente. En AR puedes modificar la escala mediante el control vertical o un gesto de pinza con dos dedos.

Solo se muestra **el nivel desbloqueado**; al ganar al BOT, el siguiente nivel queda disponible y se guarda localmente para ese perfil/dispositivo. La progresión aún no se sincroniza en varios teléfonos: Firebase recupera la sesión, pero no almacena el progreso hasta implementar una base de datos con reglas adecuadas.

Cuando la Fundación obtenga aprobación de Google H5 Games Ads y un identificador válido, el juego tiene preparado un anuncio intersticial en la pausa **entre niveles**. Mientras no haya anuncios aprobados, la beta permite avanzar sin ver publicidad y nunca simula que se ha cobrado por mostrarla. Los anuncios recompensados son voluntarios y separados de la progresión principal.

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

`auth.js` utiliza Firebase Authentication de **`d-line-g`** con `GoogleAuthProvider`, invitado anónimo y persistencia `browserLocalPersistence`. La configuración del SDK web incluye identificadores públicos; **no contiene** credenciales administrativas. El archivo `auth-config.json` era un borrador anterior de Google Identity y está obsoleto: el juego no lo utiliza.

Para probar Google desde GitHub Pages, verifica que el proyecto `d-line-g` tenga el proveedor **Google** activado, **Anonymous** si deseas invitados en la nube, y el dominio autorizado `fundacionecopiensaevolution.github.io`. El dominio ya se ve autorizado en una captura suministrada por el usuario; la habilitación del proveedor y el login real siguen pendientes de prueba.

El progreso, ELO y las monedas permanecen almacenados **localmente por UID y dispositivo**; no se puede dar por realizada una migración de cuentas desde el proyecto previo ni una sincronización entre teléfonos. Antes de lanzar rankings o premios, implementar persistencia en Firestore con reglas restrictivas y validación de recompensas en backend.

La publicidad H5 Games Ads necesita aprobación e ID auténtico. No se habilitaron anuncios ni ingresos simulados.

## Calidad, versión y despliegue

- La versión en cabecera es **V57.2.0** y la versión interna es **57.2.0-beta.1**.
- Cada cambio debe actualizar `version.json`, `CHANGELOG.md` y las etiquetas de recursos del HTML.
- Las pruebas automáticas de CI están en `tests/static.test.mjs`, `tests/rules.test.mjs` y `tests/tutorial.test.mjs`.
- `.github/workflows/pages.yml` prepara GitHub Pages. El estado del despliegue se consulta en la pestaña Actions.

## AWS

El script `scripts/setup-aws-agent-toolkit.ps1` y la guía `AWS_SETUP_WINDOWS.md` están incluidos, pero no se aprovisionan recursos AWS de pago sin autorización expresa. Este proyecto actualmente usa GitHub Pages gratuito.
