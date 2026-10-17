# Seguridad — 3 LINE-AR (base gratuita, 2026-10-17)

## Estado verificado del código
- Modo 3D/AR y PvP por código/QR de un juego en fase beta. Se conserva la jugabilidad original y **no se modificó `game.js`, `index.html`, `styles.css` ni el sistema de autenticación** al agregar esta política.
- `auth.js` utiliza **Firebase Authentication web** del proyecto propio `d-line-g`. Las API keys del SDK **son identificadores públicos por diseño**, no contraseñas ni tokens administrativos. Su protección real: Firebase Security Rules, IAM, restricciones a APIs y App Check cuando proceda.
- Progreso, recompensas e insignias actuales se guardan en `localStorage` por cuenta y dispositivo. Esa información **no debe usarse como evidencia fiable de premios, clasificación oficial o dinero**: puede ser modificada desde el propio navegador.
- Las salas PeerJS usan enlaces/códigos compartidos y dependen de señalización pública; la validación por el anfitrión no equivale a servidor antitrampas independiente. No pedir nombre, teléfono ni datos personales para entrar a una sala.
- Código web público por diseño. No crear archivos con contraseñas ni guardar secretos privados en JavaScript, HTML, GitHub Pages o commits.

## Protección en GitHub
- `.gitignore` bloquea archivos `.env`, credenciales privadas, llaves de firma de APK, Firebase Admin y otros secretos locales. Esto **NO borra secretos ya incluidos en el historial Git**.
- `scripts/security-audit.mjs` inspecciona código web en GitHub Actions buscando patrones de credenciales sensibles, uso de `eval` y dependencias peligrosas. No imprime valores detectados.
- Revisar GitHub → Settings → Security / Code security → Secret scanning y Push protection, activar alertas para repositorios públicos.
- Activar passkey o autenticación de dos factores para la cuenta GitHub, mantener roles mínimos y examinar dependencias actualizadas. Antes de aceptar un PR revisar cambios de autenticación y de premios.

## Configuración de Firebase que debe revisar un administrador
1. `https://console.firebase.google.com/project/d-line-g/overview`: confirmar proyecto, plan **Spark gratuito**, usuarios/servicios actuales.
2. Authentication → Sign-in method: habilitar **Google** y Anonymous solo si se necesita, sin habilitar proveedores innecesarios.
3. Authentication → Settings → Authorized domains: conservar solo dominios usados (por ejemplo, `fundacionecopiensaevolution.github.io` y dominios de hosting usados realmente). Eliminar dominios de prueba no necesarios con precaución.
4. Firestore Database / Realtime Database: **no crear servicios ni tocar reglas sin verificar primero si ya existen**. Si no se usan, mantener cerrados. Nunca configurar lecturas/escrituras globales públicas ni `allow read,write: if true`.
5. Google Cloud Console → APIs & Services → Credentials: limitar la API key web de Firebase a APIs Firebase necesarias (y orígenes web compatibles, probándolo antes de guardar). No compartir credenciales por chat.
6. App Check: evaluar habilitación primero en modo de supervisión, sin bloquear el juego; revisar costos y cuota del proveedor de validación. Las reglas de acceso de datos siempre prevalecen.
7. Firebase Analytics / estadísticas: no guardar correos, nombres, coordenadas ni tokens en datos de analítica o logs.
8. Si más adelante hay economía real, usar **backend confiable** para asignar puntos/recompensas con controles antitrampas y reglas seguras; no fiarse de monedas locales.

## Protección del usuario
Se incluye `privacy.html` como política inicial accesible mediante URL directa. Debe contener el contacto de privacidad oficial antes de lanzar publicidad o un registro con datos remotos.

## Limitaciones
No se ha validado la consola privada de Firebase desde este entorno. No se ha activado App Check, cambiado reglas ni conectado backend. El escáner estático no reemplaza revisión profesional ni garantiza inmunidad a hackeos. No instalar planes de pago sin autorización.
