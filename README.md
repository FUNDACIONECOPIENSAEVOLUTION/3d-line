# 3 LINE-AR — V56.1.0 beta 2

Juego 3D de estrategia por turnos, desarrollado para Fundación Ecopiensa Evolution.

**Estado:** beta técnica. No se ha certificado como producto terminado ni se han realizado pruebas físicas de WebXR entre dos celulares. Es necesario activar GitHub Pages y probar el enlace con dispositivos reales.

## Probar la beta

1. Abrir la página del juego mediante GitHub Pages en HTTPS. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions → Save**. El archivo .github/workflows/pages.yml hará el despliegue.
2. Si GitHub Pages queda habilitado, la dirección esperada es: `https://fundacionecopiensaevolution.github.io/3d-line/`. Confirmar la publicación antes de difundirla.
3. Para **CPU**, pulsar «JUGAR CONTRA CPU».
4. Para **PvP**, una persona pulsa «CREAR PARTIDA PvP»; comparte el código de **6 caracteres** o la invitación QR. La otra abre la misma página y usa «UNIRME» o escanea el QR.
5. Lanza el dado (1–3 conexiones). Toca dos nodos cercanos. Cada triángulo formado da **10 puntos**. Tras 18 turnos gana quien tenga más puntos.
6. La representación es individual: un dispositivo puede jugar en 3D y el otro en WebXR AR si lo soporta.
7. Desde la partida pulsa «ACTIVAR AR» solo en Android y navegador compatible (WebXR immersive-ar, hit-test y dom-overlay). Apunta a una superficie y pulsa «FIJAR TABLERO».

**Importante sobre AR compartida:** el tablero permanece fijado en el sistema de coordenadas local que rastrea cada teléfono. La versión actual **no comparte anclas espaciales**; dos celulares deberán calibrar orientación y posición manualmente, y pueden ver tableros en sitios ligeramente distintos. El QR identifica solamente la SALA, no una posición física. Para una verdadera AR compartida se requiere un sistema de referencia visual compartido y/o spatial anchors compatibles, con pruebas físicas y gestión de deriva. En Safari/iPhone la experiencia WebXR immersive-ar habitualmente no está disponible; el juego conserva 3D.

## Diagnóstico de celulares y computadores

En el menú principal pulsa **DIAGNÓSTICO DEL DISPOSITIVO**. Se comprueban API WebGL, WebRTC, PeerJS, cámara y WebXR sin pedir autorización de la cámara. **COPIAR INFORME** produce un diagnóstico que se puede compartir para identificar problemas. Ten en cuenta que WebRTC y PeerJS en el dispositivo no garantizan que la conexión con el rival funcione: hay que probar con dos equipos en redes reales.

## Arquitectura y limitaciones

- `index.html` interfaz, `styles.css` estilos y `game.js` reglas, WebRTC y Three.js.
- Tres tecnologías externas descargadas del CDN al abrir la página: **Three.js 0.160.0**, **PeerJS 1.5.5**, **QRCode.js 1.0.0**, **html5-qrcode 2.3.8**.
- PvP utiliza el servidor público de señalización PeerJS y Google STUN, sin servidor propio. Si una red aplica NAT estricto puede necesitar TURN; **no es servicio de producción con garantía de conexión**. No hay cuentas, almacenamiento de partidas ni clasificación permanente.
- El anfitrión calcula tiradas, valida jugadas, determina puntuación y transmite el estado lógico completo. No es antifraude de competición profesional.
- La CPU funciona sin cuentas ni backend, pero hace falta conectividad inicial para obtener Three.js desde CDN.
- Los cambios se identifican con versión visible en cabecera, título, `game.js`, `version.json` y `CHANGELOG.md`. Cualquier nueva entrega debe incrementar versión.

## Monetización

Hay un espacio para Google H5 Games Ads y recompensas por anuncios, **desactivado por defecto** hasta aprobación del editor. Se activa en `game.js`, función `setAds`, cambiando `PUBLISHER_ID` por un ID real con formato `ca-pub-XXXXXXXXXXXXXXXX`. Las monedas solamente se entregan cuando la API reporta el evento `adViewed` de un anuncio real. No se pagan ingresos por anuncios simulados. Se recomienda integrar las recompensas con una identidad/servidor para prevenir alteración local antes de ofrecer compras o ranking monetizado.

No pedir a los usuarios pagar ni afirmar que hay publicidad real hasta completar el proceso de Google. Las reglas y políticas vigentes de AdSense para juegos H5 aplican.

## Pruebas indispensables antes de monetizar

- [ ] Validar que GitHub Pages publica index, CSS y JavaScript, sin errores de consola.
- [ ] Probar CPU en PC y en Android, incluyendo clics, toque, dado, turnos, puntuación y fin de partida.
- [ ] Crear sala con celular A e ingresar con celular B mediante código; jugar todos los turnos y comprobar igual puntuación.
- [ ] Repetir con QR, computador ↔ celular y redes Wi-Fi/datos distintas.
- [ ] Probar desconexión/reconexión y NAT estricto.
- [ ] Probar WebXR AR y colocar/fijar en superficie estable. Comparar con otro teléfono en la misma habitación y medir desalineación.
- [ ] Revisar accesibilidad, privacidad, términos, analíticas y aprobación de AdSense.

## AWS Agent Toolkit

Ver [AWS_SETUP_WINDOWS.md](AWS_SETUP_WINDOWS.md) y [scripts/setup-aws-agent-toolkit.ps1](scripts/setup-aws-agent-toolkit.ps1). **No se han creado recursos de pago en AWS ni se ha instalado el toolkit en el Windows personal del usuario desde esta sesión.**

## Versiones entregadas previamente

Los archivos HTML suministrados identifican internamente V46.2, V51.2, V51.4 y V55.0. Se analizaron como referencias; la V56 usa un motor nuevo simplificado para evitar dependencias conflictivas de Firebase + PeerJS. Los originales no se borraron de la conversación ni se sobrescribieron en sus ubicaciones de origen.
