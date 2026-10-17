# Política de Seguridad por Fases — Presupuesto Cero
Fecha de decisión: 2026-10-17. Aplicable a ECOAJEDREZ AR y 3 LINE-AR.

## Misión y límites innegociables
1. Presupuesto actual: **0 COP / 0 USD**. Jamás habilitar pagos, Blaze, servicios que exijan tarjeta o cobros automáticos sin consentimiento expreso; no usar períodos gratuitos que después se facturan.
2. La misión tras publicar productos funcionales es **obtener recursos de manera legítima** (ventas, publicidad aprobada, convocatorias, patrocinios, alianzas y fondos); jamás prometer ingresos automáticos.
3. Preferir siempre proveedores oficiales y planes gratuitos comprobados. No almacenar/publicar contraseñas, cookies, claves privadas, tokens, cuentas de servicio ni documentación de identidad.
4. Conservar 3D y AR que funcionan. Nunca copiar/reemplazar automáticamente una configuración de autenticación de un juego en otro.
5. Documentar estado real y evidencia de pruebas. Actualizar AGENTS.md, el estado del proyecto, el plan y versiones antes de liberar cambios funcionales.

## DECISIÓN ADOPTADA: activar seguridad esencial hoy, administrar servicios de producción por hitos
**Etapa A — DESDE YA** (sin cuotas adicionales de servidor):
- Activar 2FA/passkey de cuentas GitHub, Google y Cloudflare (cuando exista). Mantener permisos mínimos.
- Usar revisión CI de sintaxis, dependencias y patrones de secretos, .gitignore, políticas de privacidad, protección de enlaces y CSP/cabeceras donde el hosting las admita.
- Hacer auditoría de reglas de Firebase: si base de datos activa, negar accesos no autorizados desde el primer momento. No postergar una regla de acceso necesaria.
- Conservar Firebase Spark y modalidades invitado/local; no encender App Check enforcement todavía sin instalación y comprobación de clientes.
- GitHub Pages puede alojar prototipos, pero NO es el alojamiento comercial definitivo de un SaaS/producto cuyo objetivo principal sea transaccional.

**Etapa B — DURANTE DESARROLLO**:
- Desarrollar y probar con GitHub + pruebas locales; publicar releases de prueba solo cuando haya cambios funcionales significativos o errores corregidos, no por cada edición de README.
- No conectar Cloudflare Pages por Git a cada commit de `main` todavía. Reservar sus 500 builds/mes; al conectar, configurar Branch deployment controls y/o Build watch paths para no construir documentación o cambios de rutina.
- No crear Firestore/Realtime Database ni escribir tráfico innecesario si no existe necesidad real. Las cuentas Google del 3 LINE-AR existentes pueden seguir usando Firebase Auth en Spark.
- ECOAJEDREZ en GitHub Pages funciona de invitado, Google BFF requiere servidor seguro Cloudflare Pages en el mismo origen: solo activarlo en la fase de pruebas OAuth.
- No aplicar rate limits que rompan AR o PvP ni habilitar servicios beta que cobren por uso.

**Etapa C — PRIMERA VERSIÓN ESTABLE DE PRUEBA (MVP)**:
Requisitos: modo 3D y AR funcionan en 2 celulares compatibles; partidas legales/locales; navegación móvil; errores bloqueantes cerrados; ausencia de credenciales privadas públicas; reglas Firebase comprobadas cuando haya datos; autorización explícita del responsable del proyecto.
Entonces conectar Cloudflare Pages Free para un **único lanzamiento de prueba por juego** con `npm run build`, salida `dist`, subdominio gratuito pages.dev. Verificar política de uso comercial y cuotas actuales.
Configurar BFF Google de ECOAJEDREZ con secretos en panel Cloudflare, nunca en GitHub. Validar login/logout/cookies HTTPS; no inventar resultados.
Configurar preview branch builds en OFF o restringir a release según posibilidades, usar watch paths para excluir docs. Planear cada release conjunto.

**Etapa D — PvP público y monetización**:
Solo entonces activar almacenamiento remoto, control antitrampas en servidor, reglas de autenticación estrictas, supervisión de App Check y activar enforcement una vez comprobado el tráfico real. Elegir soluciones dentro de cuotas Free.
No asociar premios, dinero o Elo FIDE oficial a valores guardados en LocalStorage ni a validación solo del anfitrión de PeerJS.
Antes de vender: comprobar política comercial del hosting, licencias de modelos, privacidad, mecanismos de eliminación de datos, reglas de acceso y términos de Google Play. No lanzar pagos hasta contar con consentimiento y cuentas aprobadas.

## Cuotas oficiales consultadas (17/10/2026), susceptibles de cambiar
- Cloudflare Pages Free: **500 builds por mes por cuenta**. Documentación: https://developers.cloudflare.com/pages/platform/limits/
- Workers/Pages Functions Free: **100.000 requests/día**, 10 ms CPU por invocación Free. No usarlos para cada movimiento local/AR. https://developers.cloudflare.com/workers/platform/limits/
- Firebase Spark: no requiere método de pago, Authentication métodos normales, App Check sin costo base sujeto a proveedor. Firestore Free en Standard: **50.000 lecturas/día**, **20.000 escrituras/día**, **1 GiB**. Un proyecto dispone de solo una base Firestore con cuota gratis. https://firebase.google.com/pricing y https://firebase.google.com/docs/firestore/pricing
- Firebase App Check web con reCAPTCHA Enterprise: **10.000 evaluaciones al mes sin costo**; NO activarlo en producción a ciegas, monitorizar primero y evaluar proveedor/cuotas. https://firebase.google.com/docs/app-check?hl=es-419
- GitHub Actions: ejecuciones estándar gratis en repos públicos. Evitar runners grandes/pagos. https://docs.github.com/en/actions/concepts/billing-and-usage
- Cloudflare Pages permite controlar ramas y excluir cambios de documentación para evitar builds inútiles: https://developers.cloudflare.com/pages/configuration/branch-build-controls/ y https://developers.cloudflare.com/pages/configuration/build-watch-paths/
- GitHub Pages no es para alojar un negocio transaccional o SaaS comercial como servicio principal: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Activación / consumo por decisión
| Medida | Ahora | MVP / cuando se use |
|---|---|---|
| GitHub 2FA/passkey | Activar inmediatamente | Mantener |
| Escaneo de secretos y controles de código | Activos/pruebas CI | Mantener |
| Reglas Firebase si se usa base | Auditar y cerrar accesos no permitidos | Ajustar para tráfico real |
| Cloudflare cuenta Free | Opcional crear ahora sin desplegar | Conectar en release MVP |
| Cloudflare Pages hosting | Preparado en repositorio | Activar en MVP |
| Cloudflare Workers y BFF OAuth | Código Ecoajedrez preparado | Activar al probar acceso Google real |
| App Check enforcement | NO | Solo tras comprobar SDK y métricas reales |
| Firestore/Realtime DB remoto para PvP | NO si innecesario | Solo al implementar PvP respaldado por servidor |
| Turnstile o CAPTCHA | NO antes de necesitar endpoint público vulnerable | Activar y verificar cuota gratuita, con validación servidor |
| AdMob y facturación | NO | Tras aprobación comercial y políticas de menores |

## Primera tarea que debe ejecutar el usuario
**Solo una ahora:** revisar/activar passkey o 2FA de GitHub en https://github.com/settings/security, sin compartir ni mostrar códigos. Después confirmar únicamente "2FA activado" o "ya estaba activado". La siguiente instrucción se dará de una en una: comprobar plan Spark de d-line-g, sin cambiar servicios.
