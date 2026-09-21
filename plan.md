# secure-pass — Plan de desarrollo (MVP)

> Gestor de contraseñas personal, local-first, para móvil (React Native + Expo).
> Prioridad número uno del proyecto: **seguridad y privacidad de los datos por encima de cualquier feature o velocidad de desarrollo.**

Este documento resume las decisiones de seguridad, el modelo de datos, la arquitectura de carpetas, los lineamientos de diseño y el plan de fases acordados **antes de escribir código**. Debe revisarse y aprobarse (o corregirse) antes de iniciar la implementación.

---

## 1. Modelo de seguridad (decisiones aprobadas)

| Decisión | Elección |
|---|---|
| Raíz del cifrado | **Contraseña maestra** (estándar de la industria: 1Password, Bitwarden) |
| Biometría | Atajo local para desbloquear rápido, nunca reemplaza la contraseña maestra |
| Recuperación si se olvida la contraseña maestra | **Ninguna — zero-knowledge estricto.** Los datos son irrecuperables. El usuario debe custodiar su contraseña maestra por su cuenta (ej. caja fuerte física, otro gestor de confianza) |
| SO mínimo | Android 6.0 (API 23)+ e iOS 13+ (código multiplataforma). **Pruebas por ahora solo en Android** — el usuario no cuenta con dispositivo iOS |
| Backend/nube en MVP | Ninguno — 100% local y cifrado en el dispositivo |
| Analítica/telemetría de terceros | Ninguna, en ninguna fase del MVP |

### Cómo funciona (explicación no técnica)

1. La contraseña maestra **nunca se guarda**. Se usa para derivar matemáticamente la llave real de cifrado mediante **Argon2id** (función de derivación lenta, resistente a fuerza bruta — misma familia que usa Bitwarden).
2. La llave derivada cifra el vault completo con **XChaCha20-Poly1305** (cifrado autenticado moderno de **libsodium**, la misma base criptográfica que usa Signal). Detecta tanto lectura no autorizada como manipulación del contenido.
3. La llave vive **solo en memoria** mientras la app está desbloqueada, y se descarta al bloquearse (auto-lock o background).
4. **Biometría:** al desbloquear con la contraseña maestra, la llave se envuelve y se guarda protegida por **Keychain (iOS) / Keystore (Android)**, accesible solo tras autenticación biométrica. Si el sensor falla, cambias de teléfono, o reinstalas la app, la contraseña maestra sigue siendo la puerta de entrada.
5. **Sin recuperación:** solo se guarda un hash verificador (Argon2id) de la contraseña maestra para validar que se escribió bien — de ese hash **no** se puede derivar la llave real de vuelta. Si se olvida la contraseña, los datos se pierden.
6. **Auto-lock configurable:** tras N minutos de inactividad se descarta la llave de memoria.
7. **Portapapeles:** al copiar una contraseña, se limpia automáticamente tras ~30-60s.
8. **Cero llamadas de red en el MVP.** No se piden favicons remotos (eso filtraría a terceros qué sitios usas) — los íconos de cada entrada se generan localmente (inicial + color).
9. **Sin logs de datos sensibles**, nunca — ni en desarrollo.

---

## 2. Librerías

| Función | Librería | Justificación |
|---|---|---|
| Cifrado + KDF (Argon2id, XChaCha20-Poly1305) | `react-native-libsodium` | Bindings de libsodium, librería criptográfica auditada y madura, usada en apps de seguridad reales |
| Llave protegida por biometría | `expo-secure-store` | Wrapper oficial de Expo sobre Keychain/Keystore, mantenido activamente |
| Prompt biométrico | `expo-local-authentication` | Oficial de Expo |
| Persistencia del vault cifrado | `expo-file-system` | Un único blob cifrado en disco, simple de auditar |
| Navegación | `expo-router` | Estándar actual del ecosistema Expo |
| Animaciones | `react-native-reanimated` + `moti` | Incluidas en Expo, 60fps, poca complejidad |
| Formularios | `react-hook-form` | Ligero |
| Iconos | `@expo/vector-icons` | Offline, sin llamadas de red |

**Explícitamente excluido:** Sentry, Firebase, Amplitude o cualquier SDK de analítica/telemetría de terceros.

**Nota de alcance técnico:** `react-native-libsodium` requiere un *development build* de EAS (no funciona en Expo Go, por incluir código nativo). Las pruebas durante desarrollo se harán con un build propio instalado en el teléfono, no vía Expo Go.

---

## 3. Modelo de datos

**En disco:** un único archivo cifrado `vault.enc` — todo el vault como un blob opaco (ciphertext + nonce + tag de autenticación). Ningún campo, ni siquiera el título de una entrada, queda en texto plano en disco.

Sin cifrar aparte (no son secretos por diseño, se necesitan antes de poder descifrar):
- `kdfSalt`, `kdfParams` (parámetros de Argon2id)
- `verifierHash` (hash de verificación de la contraseña maestra — no permite derivar la llave real)
- `autoLockMinutes`, `biometricEnabled` (preferencias no sensibles)

**En memoria, mientras el vault está desbloqueado**, cada entrada (`VaultEntry`):

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `title` | string | nombre del sitio/app |
| `username` | string | |
| `password` | string | el dato más sensible |
| `url` | string? | opcional |
| `notes` | string? | opcional |
| `category` | string? | opcional; usado en MVP para un filtro minimalista (ver Fase 3) |
| `isFavorite` | boolean | |
| `createdAt` / `updatedAt` | datetime | |
| `passwordChangedAt` | datetime | usado en fase 2 para alertas de "contraseña vieja" |

---

## 4. Estructura de carpetas propuesta

```
secure-pass/
├── app/                       # expo-router — solo pantallas, sin lógica de cifrado
│   ├── (auth)/
│   │   ├── setup.tsx          # creación de contraseña maestra
│   │   └── unlock.tsx         # desbloqueo (biometría / contraseña)
│   ├── (vault)/
│   │   ├── index.tsx          # lista de entradas
│   │   ├── entry/[id].tsx     # ver/editar entrada
│   │   ├── entry/new.tsx      # nueva entrada
│   │   └── settings.tsx       # auto-lock, biometría, cambiar contraseña maestra
│   └── _layout.tsx
├── src/
│   ├── crypto/                 # CAPA DE CIFRADO — aislada, sin conocimiento de UI
│   │   ├── keyDerivation.ts    # Argon2id
│   │   ├── vaultCipher.ts      # cifrar/descifrar blob (XChaCha20-Poly1305)
│   │   ├── secureKeyStore.ts   # expo-secure-store + expo-local-authentication
│   │   └── __tests__/
│   ├── vault/                  # CAPA DE DATOS
│   │   ├── vaultRepository.ts  # leer/escribir el archivo cifrado
│   │   ├── vaultStore.ts       # estado en memoria (se limpia en auto-lock)
│   │   └── types.ts
│   ├── auth/
│   │   ├── session.ts          # auto-lock, temporizador
│   │   └── masterPassword.ts
│   ├── ui/
│   │   ├── components/
│   │   ├── theme/               # design tokens: colores, tipografía, spacing
│   │   └── icons/
│   └── utils/
│       └── clipboard.ts         # copiar + auto-clear
├── eas.json
├── app.config.ts
├── plan.md
└── README.md
```

**Regla de arquitectura:** `src/crypto` y `src/vault` nunca importan de `app/` ni de `src/ui`. La UI solo llama funciones ya seguras expuestas por `vaultRepository`/`session`, nunca maneja bytes de cifrado directamente. Esto permite auditar la seguridad revisando solo 2-3 carpetas.

---

## 5. Lineamientos de diseño

**Estilo:** oscuro, tarjetas, iconografía — similar a 1Password/Bitwarden.

- **Paleta:** fondo casi negro, superficies elevadas gris-azulado oscuro, acento primario azul/violeta (evitar rojo/verde como color de marca, reservados para estados de error/éxito).
- **Tipografía:** sans-serif del sistema para texto general; monoespaciada al mostrar la contraseña en texto plano (evita confundir 1/l/I, 0/O).
- **Componentes clave:**
  - Tarjeta de entrada: ícono con inicial+color (sin favicons remotos), título, usuario, botón de copia rápida.
  - Campo de contraseña: toggle mostrar/ocultar, botón copiar con micro-animación de check y aviso visual de "se borra en Ns".
  - Pantalla de desbloqueo minimalista: logo + prompt biométrico + botón "usar contraseña".
- **Animaciones:** discretas (200-250ms), sin exageraciones.

---

## 6. Plan de fases (MVP)

- [x] **Fase 0 — Setup:** proyecto Expo TS + EAS dev build (perfil de build enfocado en Android por ahora; código y config se mantienen multiplataforma para iOS a futuro), estructura de carpetas, theme tokens, sin dependencias de analítica.
- [x] **Fase 1 — Núcleo de seguridad:** `keyDerivation` (Argon2id), `vaultCipher` (XChaCha20-Poly1305), `secureKeyStore` (biometría); tests de round-trip y detección de manipulación.
- [ ] **Fase 2 — Onboarding y acceso:** creación de contraseña maestra (con advertencia explícita de "sin recuperación"), pantalla de desbloqueo, sesión en memoria + auto-lock configurable.
- [ ] **Fase 3 — CRUD del vault:** modelo `VaultEntry` + repositorio de persistencia, lista con favoritos, crear/editar/eliminar, copiar con auto-clear de portapapeles, filtro de categoría minimalista y no invasivo (ej. chips horizontales discretos sobre la lista, sin pantalla propia, ocultos si no hay categorías creadas).
- [ ] **Fase 4 — Pulido UX/UI:** micro-interacciones (mostrar/ocultar, copiar, loading states), pantalla de settings, estados vacíos/error.
- [ ] **Fase 5 — Endurecimiento y QA:** revisión de que no haya logs de datos sensibles, ocultar contenido sensible en el app switcher, manejo de biometría invalidada (cambio de huellas registradas en el SO).
- [ ] **Fase 6 — Entrega:** plan.md/README final actualizados, build EAS interno para el teléfono del usuario.

---

## 7. Fases futuras (fuera del MVP)

**Segunda entrega:** generador de contraseñas configurable, alertas de contraseñas débiles/duplicadas/viejas, búsqueda y filtros, exportación/backup cifrado local.

**Tercera entrega (a futuro):** backup/sincronización en la nube con cifrado de extremo a extremo (zero-knowledge también para el backend), evaluación de autofill a nivel de sistema operativo.

---

## 8. Decisiones confirmadas (ronda de revisión)

- **SO mínimo:** código multiplataforma (Android 6+ / iOS 13+), pero las pruebas y el primer build EAS serán **solo para Android**, ya que el usuario no cuenta con dispositivo iOS por ahora.
- **Categorías en el MVP:** sí incluidas desde el MVP, con un filtro minimalista y no invasivo (chips discretos sobre la lista de entradas, sin pantalla dedicada, ocultos si no hay categorías definidas).
