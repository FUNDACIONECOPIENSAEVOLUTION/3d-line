# Plan gratuito de seguridad para 3 LINE-AR — 2026-10-17

**Condición del propietario:** 0 COP / 0 USD. Usar alojamiento oficial en planes gratuitos, no pedir tarjeta, no activar pagos de servicios ni despliegues Blaze sin autorización. Meta futura: monetizar legítimamente cuando el juego esté terminado.

## Ya disponible
- GitHub Pages `https://fundacionecopiensaevolution.github.io/3d-line/` aloja el juego actual con HTTPS.
- Proyecto Firebase `d-line-g` usado para **Authentication**. El código actual NO escribe todavía progreso validado en Firestore.
- Multiplayer privado PeerJS/WebRTC beta y modo invitado/local.
- `AGENTS.md`, `SECURITY.md`, `.gitignore` y scanner CI de credenciales.

## Tu configuración personal, sin mostrar valores a la IA
1. **GitHub:** entrar a github.com, abrir cuenta → Settings → Password and authentication → activar passkey/2FA. En el repo `FUNDACIONECOPIENSAEVOLUTION/3d-line`, abrir Settings → Security / Code security → Secret scanning y Push protection si aparecen habilitables. No subir `.env`, certificados ni claves de APK. Ver resultados en pestaña Actions.
2. **Firebase:** visitar https://console.firebase.google.com/project/d-line-g/overview; comprobar `Spark` (sin facturación). Abrir Build → Authentication → Sign-in method; revisar Google y Anonymous. En Settings → Authorized domains verificar `fundacionecopiensaevolution.github.io`. El acceso Google puede fallar si se elimina este dominio.
3. **Reglas:** abrir Build → Firestore Database o Realtime Database solo si existe. Primero copiar reglas actuales a un documento privado y comprobar si se usan; **no pegar nuevas reglas a ciegas**. Si no hay base de datos, dejarla sin crear por ahora. Nunca usar reglas que permitan lectura/escritura de todo.
4. **API pública Firebase:** en Google Cloud Console seleccionar `d-line-g` → APIs y servicios → Credenciales. Revisar que la clave de navegador de Firebase esté limitada a **APIs de Firebase**. Puede estar expuesta en código web sin ser una contraseña; no habilitar otras APIs de pago. Revisión previa antes de cambiar restricciones para no romper Google.
5. **App Check:** revisarlo más adelante si empezamos a usar Firestore/Realtime Database. Probar antes en modo observación y verificar cuota sin costo. No poner enforcement sin pruebas.
6. **Monetización:** AdMob/AdSense no generan dinero hasta tener cuentas verificadas, anuncios verdaderamente aprobados y políticas publicitarias cumplidas. No incluir ID ficticios ni habilitar pagos hasta completar pruebas.

## Cuando necesitemos más privacidad y servidor intermedio
- Para web estática, GitHub Pages sigue siendo gratis. Para funciones con secretos privados se puede migrar a **Cloudflare Pages Free** y usar Pages Functions. Para evitar problemas con Google OAuth, habrá que diseñar una **nueva autenticación compatible** con el proyecto (mismo dominio con BFF o Firebase Auth mediante SDK) sin romper la que ya funciona.
- Cloudflare no exige comprar dominio: un subdominio `*.pages.dev` está incluido en Pages Free. Confirmar cuotas y la política de uso antes de publicar.
- Los juegos `3d-line` y `Ecoajedrez-AR` deben tener archivos, datos de partidas y permisos separados incluso si comparten cuenta de propietario.

**No compartas contraseñas, claves, accesos de administrador, tokens, códigos 2FA ni credenciales OAuth por chat.**


## Cloudflare Pages Free: configuración preparada para 3 LINE-AR
El repositorio incorpora `package.json`, `scripts/build-static.mjs` y `_headers`; no cambia el juego en GitHub Pages. Para publicarlo también en Cloudflare, entra a https://dash.cloudflare.com/ → Workers & Pages → Create application → Pages → Import an existing Git repository.
- Autoriza acceso a GitHub **únicamente** al repositorio `FUNDACIONECOPIENSAEVOLUTION/3d-line` cuando Cloudflare lo permita.
- Production branch: `main`.
- Root directory: raíz del repositorio (vacío/default).
- Build command: `npm run build`.
- Build output directory: `dist`.
- Plan: Free. Usa el subdominio `*.pages.dev` asignado, no compres dominio.
- Después de desplegar: verifica visualmente el juego en 3D/AR, QR, tutorial y modos Ascenso y Galáctico. No desactives GitHub Pages hasta que todo funcione.
- Cuando el dominio *.pages.dev esté definido, si Google requiere acceso directo Firebase, agrega **el dominio exacto** a Authentication → Settings → Authorized domains en `d-line-g`; nunca usar * ni abrir todos los dominios.
- Cambiar Firebase a BFF en este juego requerirá una migración separada y pruebas de login; no simplemente copiar `auth.js` del otro juego.
- Cuidar el presupuesto: Cloudflare Free y Firebase Spark; no vincular tarjeta ni usar Blaze.

**Atención comercial:** GitHub Pages no permite usar su hosting gratuito como plataforma principal de negocio online/SaaS; conservarlo como prototipo y usar hosting con condiciones comerciales apropiadas cuando los juegos empiecen a generar recursos. Consulta https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits .
