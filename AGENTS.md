# Reglas del agente — 3 LINE-AR

## Objetivo
Un videojuego 3D web gratuito en fase beta, PvP por código/QR, con AR nativa cuando sea posible y futura monetización legítima.

## No perder el contexto del usuario
- Valorar el presupuesto: preferir hospedaje y pruebas gratuitos, evitar recursos en la nube de pago sin autorización y estimación de costos.
- No afirmar que existen ingresos publicitarios sin ID real aprobado y anuncios efectivos.
- En modo AR distinguir explícitamente **tablero fijado localmente** de **anclaje espacial verdaderamente compartido** entre dispositivos.
- Mantener la jugabilidad común entre modo AR, 3D, PC y celular.
- Antes de cambiar la lógica PvP, revisar conexiones perdidas, validación de turnos, restricciones de jugadas, sincronización de puntuación y reinicio.

## Versionado estricto
- Cada entrega que cambie el comportamiento de `game.js`, `index.html` o `styles.css` DEBE incrementar la versión mostrada y registrar el cambio en `CHANGELOG.md` y `version.json`.
- Actualizar sincronizadamente versión del HTML, versión de URLs de cache busting y constante VERSION del JS.
- Preferir commits pequeños; no sobrescribir historia ni los archivos originales subidos al chat.
- Verificar GitHub Actions, enlace publicado y comportamiento en dispositivos antes de etiquetar un lanzamiento como estable.

## Pruebas
Ejecutar `node --test tests/static.test.mjs` antes de publicar. Estas pruebas no certifican cámara, AR ni conexión real: completar la lista manual en README.

## AWS
Se requiere conocer el tipo de experiencia AWS, región del proyecto/cuenta y nombre del perfil antes de instalar las reglas oficiales en este AGENTS.md. Conservar el contenido existente. No agregar una segunda sección de reglas AWS: usar marcadores idempotentes. No desplegar recursos ni cargar costos sin consentimiento.


## REGLA ECONÓMICA GLOBAL DEL USUARIO — prioridad permanente (2026-10-17)
- El propietario no dispone actualmente de presupuesto. **Presupuesto por defecto: 0 COP / 0 USD** para desarrollo, alojamientos, credenciales, dominios, servidores, APIs y pruebas. No suponer tarjeta de crédito disponible.
- Objetivo estratégico tras terminar cada proyecto: ayudar a conseguir recursos reales mediante monetización legítima, ventas, convocatorias, alianzas y fondos; nunca declarar ingresos o postulaciones conseguidas sin evidencia.
- Priorizar servicios **oficiales** con planes gratuitos verificables (GitHub Pages/Actions, Cloudflare Pages Free, Firebase Spark), comparando límites, requisitos de cuenta y cuotas antes de recomendar. Nada de pruebas gratis que requieran tarjeta o de configurar Blaze/Pay-as-you-go sin autorización explícita y revisión del riesgo de cobros.
- Mantener aplicaciones utilizables sin servidor de pago; activar OAuth protegido con BFF y secretos en el servidor solo cuando haya plataforma gratuita apropiada y se pruebe su configuración.
- No solicitar ni publicar contraseñas, tokens, claves privadas, cookies, credenciales de OAuth, archivos .env o Firebase Admin. Los valores de configuración **web Firebase** no son contraseñas: proteger el acceso con reglas de Firestore/Realtime Database, IAM, restricciones de API, App Check cuando proceda y límites de uso.
- No romper modos 3D/AR ni inicio de sesión de un juego por trasladar arquitectura de otro. Hacer cambios reversibles y mantener cada repositorio/recursos separados.
- Registrar instrucciones, costos, pruebas reales, despliegues y restricciones en AGENTS.md y documentos de traspaso para que otras IAs o próximas conversaciones no tengan que releer todo.


## Hosting comercial: condición oficial que no debemos olvidar
GitHub Pages es apropiado como **demostración y prueba**. Según los límites oficiales de GitHub, no debe usarse como hosting gratuito principal de un negocio online o software comercial SaaS. Para lanzamiento monetizado, evaluar Cloudflare Pages Free u otro servicio oficial cuyas condiciones permitan la actividad, sin inventar costes ni desplegar servicios cobrables.
Cloudflare Pages puede vincular el repositorio con GitHub y actualizar automáticamente; su URL gratuita es *.pages.dev. Verificar límites en https://developers.cloudflare.com/pages/platform/limits/ .

## DECISIÓN OPERATIVA ACTIVA: coste cero y cuotas de seguridad
Antes de activar Cloudflare, App Check, bases de datos, facturación o lanzar nuevas versiones de producción, leer `docs/PLAN_SEGURIDAD_0_COP.md`. La decisión vigente es: proteger ahora cuentas/código y reglas de acceso necesarias; reservar recursos y despliegues de nube para MVP y releases significativos; no habilitar Blaze ni servicios con tarjeta sin autorización explícita. El siguiente paso del usuario es GitHub passkey/2FA, luego comprobar Spark Firebase sin cambiar servicios.
