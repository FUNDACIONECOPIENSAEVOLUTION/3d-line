# Monetización y publicación Android — 3 LINE-AR V57.7

> **Estado actual:** Implementación de recompensas web preparada; ID de H5 Games Ads no configurado y sin anuncios reales. El juego continúa gratuito en GitHub Pages. No existe APK ni AAB firmado todavía, y no se han verificado ingresos.

## Reglas de las insignias

- Insignias originales **gratuitas**: ◆ ⚡ ★ ✦ ☣.
- Insignias especiales: 🛡 1 video, 👑 2, 🐉 3, 🦅 4, 🤖 5, 👾 6, 🔥 7, ❄ 8, ⚔ 9, ☯ 10, ♜ 11.
- Cada video completado incrementa **solo** la insignia elegida, mediante `adViewed` del proveedor real. Si no hay anuncio, se cancela, el jugador lo omite o cierra antes de finalizar, no se acredita.
- El desbloqueo es **permanente en el navegador y cuenta locales**, hasta borrar datos del navegador. Sin Firestore todavía no hay sincronización entre celulares y el jugador podría manipular el almacenamiento local; no debe considerarse economía segura ni asociarse con dinero real.
- Las insignias son solamente cosméticas, no aportan ventaja competitiva y no se cambian por bienes o dinero.

## Volver a intentar nivel

En resultados contra el BOT o en tutorial, aparecerá **REINTENTAR NIVEL** sin volver al menú. Con Google H5 Ads aprobado, se ofrece voluntariamente **VER VIDEO Y REINICIAR**. Si el jugador prefiere no verlo, puede volver al menú y repetir normalmente. Si no existe un anuncio disponible, el jugador puede volver al menú.

**Mientras se configura publicidad**, el botón permite reiniciar gratuitamente desde resultados para poder probar la mecánica y no bloquear a nadie. La partida PvP no tiene reinicios publicitarios que afecten al rival.

## Habilitar monetización web con Google H5 Games Ads

1. Solicitar acceso y aprobación para [H5 Games Ads / Ad Placement API](https://developers.google.com/ad-placement/apis).
2. Cuando se apruebe, colocar el ID real `ca-pub-XXXXXXXXXXXXXXXX` en **`ads-config.json`** (clave `h5PublisherId`). El archivo queda público en GitHub Pages; los identificadores web del editor son públicos.
3. El juego carga la API desde `ads-rewarded.js`, usa `adBreak({type:'reward'})` y acredita solo después de `adViewed`. `adBreakDone` informa falta de inventario, cuota o cancelación.
4. No configurar IDs falsos ni crear un reproductor de video propio para contabilizar anuncios. Un video institucional no es publicidad remunerada por AdSense.
5. Probar con el modo de test oficial y política de privacidad, consentimiento y edad aplicables, sin contabilizar impresiones propias fraudulentas.
6. Antes de recompensas en producción: mover progreso y concesión a backend confiable con reglas de Firestore y verificación de eventos. Los valores de `localStorage` y callbacks cliente son manipulables; esta beta sirve para interfaz y flujos, no para pagar premios.

**Importante:** no convertir la repetición de niveles en un anuncio obligatorio. El anuncio recompensado se ofrece a elección del jugador y hay ruta alternativa para repetir gratis desde el menú.

## Sitio de desarrollador gratis para AdMob

La infraestructura de `d-line-g.web.app` se encuentra preparada en `firebase-admob-site/`. Este sitio Firebase Hosting solo mostrará una presentación del desarrollador y, cuando exista un **Publisher ID de AdMob real**, el archivo `app-ads.txt` requerido para verificar vendedores autorizados. No altera el juego de GitHub Pages.

Guía: [FIREBASE_HOSTING_ADMOB.md](./FIREBASE_HOSTING_ADMOB.md). El despliegue es manual y con confirmación para evitar sobrescribir otro sitio de Firebase Hosting. Google Play debe incluir el dominio del desarrollador y la aplicación debe estar publicada para la verificación final de AdMob. No se ha desplegado todavía.

## Android: APK de pruebas y AAB para Google Play

No basta con cambiar la extensión de HTML a APK.

- Para reutilizar esta web con WebXR, conviene **evaluar una Trusted Web Activity (TWA) con Chrome/Bubblewrap**. Una WebView corriente puede no proporcionar la misma compatibilidad con WebXR y sesiones de cámara.
- Una TWA verificada requiere **Digital Asset Links** en la raíz del origen (`https://fundacionecopiensaevolution.github.io/.well-known/assetlinks.json`), control del origen y huella SHA-256 del certificado de firma. GitHub Pages de proyecto `/3d-line/` no puede por sí mismo publicar ese archivo en la raíz del origen: hace falta acceso al sitio de usuario de GitHub Pages correspondiente o un dominio propio.
- Google Play exige actualmente **Android App Bundle (AAB)** para el flujo de publicación de apps nuevas y, desde el 31 de agosto de 2026, apuntar a **Android 16 / API 36** para nuevas aplicaciones Android comunes. Confirmar otros requisitos actuales en Play Console.
- El **APK de prueba** sirve para instalar en el propio Android; el **AAB firmado** se prepara para envío a Play Console. Hace falta una cuenta de desarrollador de Play, identidad/pagos de registro y clave de firma bajo control del propietario.
- Para monetización nativa suele utilizarse **AdMob (Google Mobile Ads SDK)** con **identificadores de anuncios Android distintos** del ID H5. Antes de producir, probar los anuncios con ID de prueba oficial (nunca con anuncios reales en emuladores o durante pruebas).
- El proveedor debe informar la recompensa mediante `OnUserEarnedRewardListener` (AdMob) en Android. El flujo de recompensas del juego puede conservar la interfaz, pero requiere un puente nativo seguro y verificación real antes de activar monetización nativa.
- Revisar política de anuncios, Data Safety, privacidad, autenticación, clasificación por edades, permisos de cámara y controles parentales. No publicar enlaces con promesas de ingresos garantizados.

### Recomendación de orden

1. Probar en computadora/celular el contador de insignias y el reinicio beta sin anuncios.
2. Obtener **aprobación H5 Ads y publisher ID**; probar anuncio real en el juego web.
3. Conectar Firestore con reglas estrictas y validación de recompensas contra manipulación; habilitar consentimiento.
4. Construir APK de pruebas con TWA y comprobar **AR física + Google Sign-in + WebRTC** (sin suponer que WebXR funciona igual en todas las envolturas).
5. Abrir AdMob, usar IDs de test y preparar Android AAB **firmado** para Play Store.
6. Publicar solo cuando las pruebas, políticas, requisitos de tienda y monetización estén aprobados.

### Enlaces técnicos oficiales
- https://developers.google.com/ad-placement/apis/adbreak
- https://developers.google.com/ad-placement/apis
- https://developers.google.com/admob/android/rewarded
- https://developer.chrome.com/docs/android/trusted-web-activity
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/9857753
