# Registro de versiones — 3 LINE-AR

## 57.1.0-beta.1 — 2026-10-15

- Recuperado el acceso previo al menú de la edición V51.2, con Google Firebase Auth, invitado anónimo y persistencia de sesión mediante `browserLocalPersistence`. El acceso sigue en modo invitado local cuando Firebase falla, con aviso explícito.
- Recuperados del diseño V51.2 el dado galáctico animado centrado entre los dos marcadores y la barra vertical de escala AR. Añadido gesto de pinza para escalar con dos dedos.
- Corregido el tutorial: jugador 2 es el BOT, que lanza el dado, dibuja una conexión y devuelve el turno. Además, se termina el turno cuando no quedan enlaces válidos aunque sobren movimientos del dado.
- Ocultada la selección abierta de los diez niveles: solo se ve el nivel desbloqueado actual; al ganar contra BOT se habilita el siguiente y se conserva por perfil local.
- Colocado un punto de inserción de anuncios H5 tipo `next` al finalizar un nivel, únicamente si hay proveedor aprobado y ID real. Si no hay anuncio, la beta no bloquea avanzar ni finge publicidad.
- La configuración Firebase pública corresponde a la versión V51.2; hace falta autorizar el dominio nuevo `fundacionecopiensaevolution.github.io` y verificar en los dispositivos que Google sign-in está permitido. No se importó ni habilitó Firestore del código anterior ni se presupone sincronización de progreso entre dispositivos.
- Siguen pendientes anclas AR compartidas y pruebas de uso real con dos celulares.

## 57.0.0-beta.1 — 2026-10-15

- Se reconstruyó el menú retro-cyber en azul, verde, rosa y dorado, basado en el estilo V51.4 mostrado por el usuario.
- Selector persistente de color de láser, insignia y avatar local.
- Diez niveles de juego; nivel 1 es tutorial con 5 nodos, niveles 2-4 composición guiada y niveles 5-10 distribución aleatoria creada por el anfitrión.
- Dado visual integrado en el HUD que usa `crypto.getRandomValues` para un resultado de 1 a 6 movimientos, sin patrón secuencial intencional.
- Eliminación del cubo envolvente; únicamente base holográfica, postes y nodos flotantes.
- Se impiden conexiones que cruzan líneas y que atraviesan nodos (proyección XZ); los nodos que quedan dentro de un triángulo cerrado se bloquean.
- Triángulos con color de zona e insignia del jugador.
- PvP conserva salas de 6 caracteres, QR y estado autoritativo del anfitrión con nodos y niveles sincronizados.
- WebXR permite que la sesión intente los espacios de referencia `local`, `local-floor`, `viewer` antes de iniciar el renderer; detección de superficies opcional y holograma flotante degradado. Esto **no equivale** a anclaje compartido.
- Google Identity se dejó preparado detrás de `auth-config.json`, sin credenciales. Google verificable en backend, guardado entre dispositivos y publicidad pagada siguen pendientes.
- El código queda preparado en rama para pasar tests de integración y publicación.


## 56.1.0-beta.2 — 2026-10-15

- Diagnóstico de compatibilidad dentro de la interfaz: WebGL2, WebRTC, PeerJS, cámara, HTTPS y WebXR.
- Opción para copiar informe de cada teléfono o computador sin solicitar acceso a cámara ni activar AR.
- Los tests estáticos verifican que el nuevo panel y sus funciones están presentes.
- Sigue pendiente activar GitHub Pages en la configuración del repositorio para disponer del enlace público.


## 56.0.0-beta.1 — 2026-10-15

- Nueva interfaz separada de CSS y JavaScript, adaptable a Android y PC.
- Motor de reglas unificado, 18 nodos 3D, validación de conexiones, triángulos, puntuación y turnos.
- Entrenamiento contra CPU.
- PvP mediante señalización pública PeerJS/WebRTC, salas con código de seis caracteres y QR, anfitrión autoritativo.
- WebXR AR mediante detección de superficies; posición local, no ancla compartida entre celulares.
- Se deshabilitó explícitamente cualquier publicidad simulada; API de premios preparada solo para anuncios reales y aprobados.
- Pruebas de sintaxis y consistencia con CI.

### Histórico de fuentes originales (archivos entregados)

- V46.2 Connect Fix — `3d-line-inicial.html`.
- V51.2 Cloud Sync — `casi listo 3_line_ar_v51_2_commercial_edition.html`.
- V51.4 Cloud Sync — `23_line_ar_v50_0_commercial_edition.html`.
- V55.0 P2P Multiplayer & Universal AR — `3_line_ar_v50_0_commercial_edition.html` (el nombre externo no corresponde a su versión interna).

Estas cuatro versiones se compararon, pero NO se han reproducido todas sus funciones en la nueva beta. Se conservan como referencia para futuras migraciones.
