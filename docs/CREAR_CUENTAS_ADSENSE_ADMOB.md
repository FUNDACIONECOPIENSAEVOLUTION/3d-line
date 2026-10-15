# Registro desde cero: AdSense, H5 Games Ads y AdMob para 3 LINE-AR

Actualizado: 15/10/2026. El juego web está en GitHub Pages y la monetización sigue deshabilitada sin cuentas aprobadas.

## Paso 1 — Crear AdSense para la versión web

1. Abre **https://adsense.google.com/start/** e inicia sesión con la cuenta de Google que administrará los ingresos.
2. Completa la información del editor y el país de residencia real (Colombia, si corresponde), tipo de titular (persona u organización) y datos de contacto. **No compartas aquí** datos bancarios, documentos personales ni contraseñas.
3. Indica la web: https://fundacionecopiensaevolution.github.io/3d-line/ . Google puede requerir verificar el dominio completo, no solo la subruta del repositorio. Si el dominio GitHub Pages no puede verificarse/ser aceptado, evalúa un dominio propio que controles.
4. Completa la verificación y espera la revisión. Una cuenta creada **no equivale a cuenta aprobada** y no permite mostrar anuncios hasta aprobación.

Fuentes:
- https://support.google.com/adsense/answer/7402253?hl=es
- https://support.google.com/adsense/answer/7584263?hl=es-419

## Paso 2 — Solicitar H5 Games Ads para el juego HTML5

1. Con una cuenta **AdSense aprobada**, abre el proceso específico en https://developers.google.com/ad-placement/docs/signup o https://support.google.com/adsense/answer/1705831 .
2. Completa el formulario de acceso H5 Games Ads para **3 LINE-AR**. La elegibilidad y la aprobación no están garantizadas.
3. Una vez aprobado, localiza tu ID de editor **ca-pub-XXXXXXXXXXXXXXXX** y colócalo en `ads-config.json` -> `h5PublisherId`. No uses ningún ID inventado ni anuncios reales para generar visualizaciones propias de prueba.
4. El juego ya tiene `ads-rewarded.js` y solo reconoce **adViewed** como video completado. Prueba la publicidad con mecanismos oficiales antes del lanzamiento.

Fuentes:
- https://developers.google.com/ad-placement/docs/signup
- https://developers.google.com/ad-placement/apis

## Paso 3 — Crear AdMob para la futura aplicación Android

1. Abre https://admob.google.com/ con la **misma cuenta de Google** utilizada para AdSense cuando sea posible.
2. Selecciona el país de residencia real y revisa atentamente antes de confirmar: la opción de país no puede modificarse posteriormente.
3. Completa la verificación de teléfono e identidad que te solicite Google.
4. Añade datos de pago verificables y espera la revisión de la cuenta (puede tardar días). Evita compartir aquí información personal/bancaria.
5. Cuando tengamos la app Android probada, registra la aplicación 3 LINE-AR en AdMob, verifica propiedad, crea unidades de anuncio recompensado y prueba con IDs oficiales de test. **Los IDs de AdMob son diferentes del editor H5**.

Fuentes:
- https://support.google.com/admob/answer/7356219?hl=es
- https://support.google.com/admob/answer/15948559?hl=en

## Paso 4 — Google Play y APK

- Abrir Play Console cuando la app Android esté probada. Se necesitan identidad y registro de desarrollador, datos de seguridad y privacidad, y firma de publicación.
- Google Play exige para nuevas apps Android comunes objetivo **API 36 (Android 16)** desde el 31/08/2026.
- El artefacto para Play es **AAB**; el APK de pruebas puede instalarse localmente.
- Como la realidad aumentada funciona mediante Chrome WebXR, evaluar **Trusted Web Activity** antes de encapsular con WebView; algunas WebViews no soportan inmersive-ar del mismo modo.
- La aplicación Android podrá necesitar **AdMob/Google Mobile Ads SDK** además de la web H5; no se deben compartir claves de firma.
- Documentación técnica: `docs/MONETIZACION_ANDROID_PLAY.md`.

Fuente: https://support.google.com/googleplay/android-developer/answer/11926878?hl=es

## Seguimiento breve que traer a ChatGPT

Comparte únicamente estados no sensibles:
- «AdSense: cuenta creada / pendiente / aprobada».
- «H5 Games Ads: solicitud enviada / pendiente / aprobada».
- «AdMob: cuenta creada / pendiente / aprobada».
- Si Google devuelve error, envía captura **ocultando documentos personales, dirección y datos bancarios**.

**La app no genera ingresos todavía.** Los anuncios reales solo podrán funcionar después de autorización/servicio oficial y pruebas.
