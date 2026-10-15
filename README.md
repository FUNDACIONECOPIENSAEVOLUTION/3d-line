# 3 LINE-AR — V57.8.0 beta 11

**Juega en:** https://fundacionecopiensaevolution.github.io/3d-line/

Juego 3D táctico por turnos para computador y celular, con sala privada WebRTC por código o QR, IA rival y realidad aumentada experimental.

## V57.6.1: regreso al juego después del bloqueo del teléfono

Al apagar la pantalla, Android puede terminar la **sesión WebXR de cámara** por razones de gestión de recursos. El estado de la partida se recupera por PeerJS al volver, pero una sesión de AR terminada **no se puede reabrir automáticamente sin interacción del usuario**. Esta versión muestra un aviso neón para que vuelvas a pulsar **ACTIVAR AR** y **FIJAR TABLERO**. La sala, puntuaciones y conexiones no se borran por salir de AR. Se necesita prueba real de suspensión/reanudación en teléfono.

## V57.8: dos modalidades y niveles dobles

Al empezar una partida contra BOT o crear una sala PvP, elige una de dos modalidades:

- **⚄ MODO GALÁCTICO** (existente): el dado genera aleatoriamente entre **1 y 6 conexiones** por turno.
- **↗ MODO ASCENSO** (nuevo): **cada jugador, por separado**, dispone de 1 conexión en su primer turno, 2 en el segundo, 3 en el tercero y así sucesivamente. Se activa pulsando el núcleo central del marcador; no hay azar. Si quedan menos conexiones legales de las asignadas, se reduce al número disponible. El anfitrión define el modo de una sala; el invitado lo recibe junto con el estado y lo ve en la cabecera.

**Para desbloquear el nivel siguiente, tienes que ganar el nivel actual tanto en GALÁCTICO como en ASCENSO contra el BOT.** Después de ganar el primer modo aparece un botón para jugar directamente el modo pendiente. Los niveles ya ganados en versiones anteriores no se bloquean de nuevo: el nuevo requisito rige al progresar desde el nivel actualmente disponible. Se conserva el tutorial de cinco puntos (reglas aleatorias para aprender).

**Insignias:** las cinco originales quedan visibles de forma predeterminada. Usa **••• VER INSIGNIAS ESPECIALES** para desplegar una fila desplazable con las once restantes; conservan candado y contador de videos. Al cerrar, el menú recupera su diseño compacto. El selector de modo tiene brillo animado ligero y respeta la opción del sistema operativo de reducir movimiento.

**Crear las cuentas de monetización** después de la reunión: guía paso a paso en [docs/CREAR_CUENTAS_ADSENSE_ADMOB.md](./docs/CREAR_CUENTAS_ADSENSE_ADMOB.md). No se ha creado ninguna cuenta en nombre del propietario ni se han activado anuncios reales.

## V57.7: videos recompensados, insignias y reintento contra BOT

La primera fila de insignias (◆ ⚡ ★ ✦ ☣) está **gratis y desbloqueada**. Las otras once se desbloquean con **1, 2, 3… hasta 11 videos reales completados**, uno por cada nueva insignia según su posición. El contador se guarda por insignia y usuario en este navegador, sin borrar la elección de nivel, AR o PvP. Los cosméticos no mejoran los resultados competitivos.

Los botones bloqueados muestran la cantidad de videos necesaria. **No hay proveedor publicitario aprobado todavía**, por eso no se puede contabilizar ni simular su reproducción. La conexión está preparada en `ads-rewarded.js`, con ID público pendiente en `ads-config.json`. Solo se concede progreso después de `adViewed` de Google H5 Games Ads.

**Reintento sin regresar al menú:** en el resultado de partidas contra BOT y en tutorial se ofrece **REINTENTAR NIVEL**. Sin publicidad aprobada funciona gratuitamente durante la beta. Cuando exista H5 Ads real, el usuario podrá optar por video para reiniciar directamente o regresar al menú y repetir gratis. El anuncio no interrumpe un turno ni afecta a otro jugador PvP.

**Monedas:** solo se acreditan las 20 monedas cosméticas por un video realmente completado; se guardan localmente por perfil, no en el antiguo contador global. Los datos de recompensas cliente no son seguros contra manipulación: antes de lanzar monetización comercial o ranking, implementar un backend confiable y verificación de eventos.

**Preparación Android:** guía completa en [docs/MONETIZACION_ANDROID_PLAY.md](./docs/MONETIZACION_ANDROID_PLAY.md). El APK y AAB aún no se han generado; hay que comprobar WebXR y servicios de anuncios nativos antes de Play Store.

## V57.6: bloqueo por cara y Academia táctica interactiva

La regla de captura distingue tres situaciones:
1. **Punto atravesado por superficie:** una cara triangular sombreada bloquea cualquier punto que se encuentre físicamente dentro de su superficie (incluido el borde) si ese punto no pertenece a sus tres vértices.
2. **Vértices del propio triángulo:** siguen disponibles para nuevas conexiones y triángulos. La excepción deja de aplicar si **otra** cara triangular cubre físicamente ese vértice como punto no perteneciente a sus tres esquinas.
3. **Altura y volumen:** un nodo por encima o debajo de una cara permanece libre si la superficie no lo toca. Los nodos estrictamente dentro de un volumen 3D completamente sellado también quedan bloqueados.

Las caras triangulares y las líneas son barreras físicas 3D para nuevos segmentos; ya no se bloquea únicamente por la proyección del suelo.

**Reglamento interactivo:** desde el menú principal pulsa **ACADEMIA · REGLAS Y EJERCICIOS**, o desde una partida pulsa **REGLAS**. Se enseñan siete ejercicios ilustrados y con dos respuestas posibles: dado, líneas, cruces prohibidos, conquistar triángulos, altura, puntos atravesados por la cara y volúmenes cerrados. Puedes regresar, corregir una respuesta equivocada, cerrar y reabrir la academia. Se recuerda qué ejercicios acertaste en este navegador.

**Nivel 1 con BOT:** pulsando **PRACTICAR EL NIVEL 1 CON EL BOT**, o el botón del tutorial, tendrás una partida de cinco nodos. Las instrucciones del entrenamiento cambian desde tirar el dado y crear la primera línea hasta intentar conquistar un triángulo. El BOT juega automáticamente. No se bloquean niveles posteriores por preguntas académicas, y la academia no cobra ni exige ver publicidad.

**Prueba con dos dispositivos:** verifica que un nodo coplanar atravesado por una cara quede gris/bloqueado; que sus tres vértices conserven el color y puedan hacer nuevas conexiones, salvo cobertura por otra cara; que un nodo elevado permanezca libre; y que al suspender el celular se reciba el estado actualizado desde el PC.

## V57.5: colisiones tridimensionales, recuperación tras bloqueo y mensajes de videojuego

El juego **ya no usa solo la sombra XZ** para decidir qué conexiones atraviesan zonas. Calcula las intersecciones geométricas en los tres ejes (X,Y,Z).

- Un punto situado por encima o debajo de una cara triangular abierta **permanece libre**. Una única cara conquistada no equivale a una caja ni bloquea automáticamente todos los puntos bajo su proyección.
- Una conexión no puede atravesar físicamente otra línea ni una cara triangular conquistada en 3D; una conexión que cruza su proyección en otra altura sí puede pasar si no existe contacto real.
- Solo se considera encerrado un nodo situado dentro de un **volumen de caras triangulares completamente cerrado**. El motor exige un grupo de al menos cuatro caras, con cada arista compartida por exactamente dos caras, e interior comprobado por tres rayos 3D. Esta comprobación geométrica es apropiada para envolventes cerradas simples; aún deben probarse mallas auto-intersecadas o topologías complejas.
- El anfitrión sigue teniendo autoridad sobre jugadas y snapshots. El cliente del celular pide un `SYNC_REQUEST` al regresar de segundo plano y, si no hay respuesta, intenta reconectarse a la **misma sala y partida**, sin borrar el tablero anterior. Esto mitiga la pérdida de conexiones al bloquear el teléfono; si el sistema finaliza toda la pestaña no se garantiza la recuperación automática.
- Los avisos del juego siguen el estilo neón; las confirmaciones para salir y cerrar sesión utilizan una ventana propia. Si no hay permiso para copiar, el enlace aparece en un cuadro gamer con texto seleccionable.

**Cómo comprobar:** abre PvP entre PC y celular, construye 1 o 2 líneas, bloquea/desbloquea el móvil y comprueba que tras regresar aparezcan TODAS las jugadas del anfitrión. En AR, intenta conectar un punto elevado con uno libre sin atravesar la cara, y confirma que un nodo se bloquea solamente con una envolvente 3D sellada. Los cambios todavía requieren validación física sobre los dispositivos.

## V57.4: dos métodos de selección AR y barreras de líneas y territorios

**Regla definitiva:** toda línea colocada previamente bloquea cruces posteriores en el tablero. Un triángulo conquistado y sombreado también prohíbe atravesar su zona. Se pueden crear líneas desde un mismo vértice y no hay límite de distancia si no existe barrera. Los cálculos de colisión siguen proyectados al plano XZ.

**Realidad aumentada, opción 1 — TOCAR PUNTO:** toca los nodos que ves en la pantalla del teléfono para elegir origen y destino.

**Realidad aumentada, opción 2 — APUNTAR EN AR:** mueve el teléfono hasta que la cruz del centro esté sobre un nodo holográfico. El texto mostrará «OBJETIVO: NODO #». Pulsa **SELECCIONAR PUNTO APUNTADO**; después apunta y confirma otro nodo. En dispositivos con entradas WebXR, también se atiende al evento `select`. Este sistema **no detecta dedos en el aire** en Android común: la selección espacial se realiza con la cámara y confirmación. Detección de mano real requiere capacidades adicionales del dispositivo.

**Insignias:** 16 figuras elegibles antes de jugar; cada jugador transmite insignia y color al rival. Las zonas coloreadas muestran el símbolo de su dueño.

**Pantallas pequeñas:** la barra de herramientas AR usa grilla de 3–4 columnas con tamaño mínimo de botones, safe-area para barras del sistema y una distribución horizontal compacta. Prueba los controles en 320–430 px de ancho, en vertical y horizontal; los dispositivos reales pueden variar.

## V57.3: selección de nodos AR y paredes de zonas conquistadas

El usuario pudo jugar desde PC en 3D contra un celular en AR y vio las líneas sincronizadas, pero no pudo tocar nodos desde AR. En la versión anterior `Raycaster.setFromCamera` recibía `renderer.xr.getCamera()`, una `ArrayCamera`, que no es la cámara perspectiva requerida por el raycaster. La V57.3 usa las cámaras perspectiva internas, toca la proyección del nodo sobre la pantalla y habilita tanto eventos de puntero del DOM overlay como `XRSession.select`. Amplía la tolerancia táctil para esferas pequeñas, pero evita pulsaciones accidentales sobre controles y acciones duplicadas.

**Para comprobarlo:** 1) abre una sala en el PC, 2) entra desde celular, 3) toca **ACTIVAR AR** y fija el tablero, 4) espera tu turno y toca el dado del HUD, 5) toca dos nodos sucesivos: deberían resaltarse y sincronizarse en el PC. Si no funciona, informa si cambia el rótulo «Nodo seleccionado», modelo de celular, navegador y captura.

**Reglas actualizadas:** los segmentos o líneas sin área triangular completada **no** bloquean cruzar por encima. No se aplica límite de distancia entre nodos. En cuanto tres líneas cierran un triángulo y aparece su sombreado, ese territorio impide conectar puntos a través de su interior en la proyección XZ; también se bloquean los nodos encerrados. Siguen prohibidas líneas duplicadas y líneas que pasan directamente por un nodo intermedio. Las reglas aún usan geometría plana XZ para territorios; no equivalen a colisión tridimensional exacta.

No cambió Firebase `d-line-g` ni el modelo de cuenta, el funcionamiento de la sala o la monetización. La selección WebXR requiere **pruebas físicas en teléfono** antes de considerarse totalmente validada.

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
- Las reglas bloquean cruces tanto con líneas ya colocadas como con triángulos conquistados (proyección XZ), además de nodos intermedios. Al cerrar un triángulo, se bloquean los nodos interiores y se colorea el área y la insignia de su dueño. Se trata de un bloqueo **2D proyectado**, no todavía de detección volumétrica exacta de paredes 3D.
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

- La versión en cabecera es **V57.6.0** y la versión interna es **57.6.0-beta.1**.
- Cada cambio debe actualizar `version.json`, `CHANGELOG.md` y las etiquetas de recursos del HTML.
- Las pruebas automáticas de CI están en `tests/static.test.mjs`, `tests/rules.test.mjs`, `tests/tutorial.test.mjs` y `tests/ar-picking.test.mjs`.
- `.github/workflows/pages.yml` prepara GitHub Pages. El estado del despliegue se consulta en la pestaña Actions.

## AWS

El script `scripts/setup-aws-agent-toolkit.ps1` y la guía `AWS_SETUP_WINDOWS.md` están incluidos, pero no se aprovisionan recursos AWS de pago sin autorización expresa. Este proyecto actualmente usa GitHub Pages gratuito.
