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
| Cifrado + KDF (Argon2id, XChaCha20-Poly1305) | `react-native-libsodium` | Bindings de libsodium, librería criptográfica auditada y madura, usada en apps de seguridad reales. **Nota:** su `outputFormat: 'text'` está roto en la v1.7.0 (issue encontrado y documentado en `src/crypto/vaultCipher.ts`) — se usa `to_string()` de la misma librería en su lugar |
| Llave protegida por biometría | `expo-secure-store` | Wrapper oficial de Expo sobre Keychain/Keystore. `requireAuthentication: true` dispara el prompt biométrico nativo directamente — no hizo falta usar `expo-local-authentication` para eso |
| Chequeo de capacidad biométrica | `expo-local-authentication` | Instalado por sus permisos (`USE_BIOMETRIC`/Face ID); el chequeo real usa `SecureStore.canUseBiometricAuthentication()`, más específico para este caso de uso |
| Persistencia del vault cifrado | `expo-file-system` | Un único blob cifrado en disco (API nueva `File`/`Directory`, síncrona), simple de auditar |
| Portapapeles con auto-borrado | `expo-clipboard` | Oficial de Expo |
| Ocultar contenido en apps recientes / bloquear capturas | `expo-screen-capture` | `FLAG_SECURE` en Android (Fase 5); blur automático en iOS |
| Navegación | `expo-router` | Estándar actual del ecosistema Expo |
| Animaciones | `react-native-reanimated` | Ya incluida por Expo Router; usada directamente (no se agregó `moti`, no hacía falta) |
| Formularios | `useState` de React | Los formularios son simples (una pantalla, sin validación cruzada compleja); no se agregó `react-hook-form` para evitar una dependencia innecesaria |
| Iconos | `@expo/vector-icons/Ionicons` | Se importa el subpaquete específico (no el barrel `@expo/vector-icons`), que metía las 20 familias de íconos (~4MB) al bundle por una sola que se usa |

**Explícitamente excluido:** Sentry, Firebase, Amplitude o cualquier SDK de analítica/telemetría de terceros.

**Nota de alcance técnico:** `react-native-libsodium` requiere un *development build* (no funciona en Expo Go, por incluir código nativo). Como esta máquina de desarrollo no tiene Android SDK instalado, el dev client se genera en la nube con `eas build --profile development` (ver `eas.json` y el README) en vez de `expo run:android` local.

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
├── __mocks__/                   # mocks de Jest para módulos nativos (ver sección de tests)
├── src/
│   ├── app/                     # expo-router — solo pantallas, sin lógica de cifrado
│   │   ├── (auth)/
│   │   │   ├── setup.tsx        # creación de contraseña maestra
│   │   │   └── unlock.tsx       # desbloqueo (biometría / contraseña)
│   │   ├── (vault)/
│   │   │   ├── index.tsx        # lista de entradas (favoritos, chips de categoría, FAB)
│   │   │   ├── entry/[id].tsx   # ver/editar/eliminar entrada
│   │   │   ├── entry/new.tsx    # nueva entrada
│   │   │   ├── settings.tsx     # auto-lock, biometría, cambiar contraseña maestra
│   │   │   └── _layout.tsx      # guard: redirige a /unlock si la sesión no está activa
│   │   ├── index.tsx            # redirige a /setup o /unlock según si ya existe un vault
│   │   └── _layout.tsx          # tema, FLAG_SECURE / app-switcher protection
│   ├── crypto/                   # CAPA DE CIFRADO — aislada, sin conocimiento de UI
│   │   ├── keyDerivation.ts      # Argon2id
│   │   ├── vaultCipher.ts        # cifrar/descifrar blob (XChaCha20-Poly1305)
│   │   ├── secureKeyStore.ts     # llave protegida por biometría (expo-secure-store)
│   │   └── __tests__/
│   ├── vault/                    # CAPA DE DATOS
│   │   ├── vaultRepository.ts    # leer/escribir vault.meta.json y vault.enc
│   │   ├── vaultStore.ts         # estado en memoria + CRUD (se limpia en auto-lock)
│   │   ├── types.ts
│   │   └── __tests__/
│   ├── auth/
│   │   ├── session.ts            # auto-lock, temporizador, AppState
│   │   ├── masterPassword.ts     # crear/desbloquear/cambiar contraseña maestra
│   │   └── __tests__/
│   ├── ui/
│   │   ├── components/           # ThemedText, ThemedView, Button, TextField, CopyButton,
│   │   │                         # EntryCard, EntryForm, ScreenHeader, PlaceholderScreen
│   │   └── theme/                # design tokens: colores, tipografía, spacing
│   └── utils/
│       ├── clipboard.ts          # copiar + auto-clear
│       └── __tests__/
├── eas.json
├── app.json
├── plan.md
└── README.md
```

**Regla de arquitectura:** `src/crypto` y `src/vault` nunca importan de `src/app` ni de `src/ui`. La UI solo llama funciones ya seguras expuestas por `vaultRepository`/`vaultStore`/`session`, nunca maneja bytes de cifrado directamente. Esto permite auditar la seguridad revisando solo 2-3 carpetas.

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
- [x] **Fase 2 — Onboarding y acceso:** creación de contraseña maestra (con advertencia explícita de "sin recuperación"), pantalla de desbloqueo, sesión en memoria + auto-lock configurable.
- [x] **Fase 3 — CRUD del vault:** modelo `VaultEntry` + repositorio de persistencia, lista con favoritos, crear/editar/eliminar, copiar con auto-clear de portapapeles, filtro de categoría minimalista y no invasivo (ej. chips horizontales discretos sobre la lista, sin pantalla propia, ocultos si no hay categorías creadas).
- [x] **Fase 4 — Pulido UX/UI:** micro-interacciones (mostrar/ocultar, copiar, loading states), pantalla de settings, estados vacíos/error.
- [x] **Fase 5 — Endurecimiento y QA:** revisión de que no haya logs de datos sensibles, ocultar contenido sensible en el app switcher, manejo de biometría invalidada (cambio de huellas registradas en el SO).
- [x] **Fase 6 — Entrega:** plan.md/README final actualizados, build EAS interno para el teléfono del usuario.

---

## 7. Fases futuras (fuera del MVP)

**Segunda entrega:** generador de contraseñas configurable, alertas de contraseñas débiles/duplicadas/viejas, búsqueda y filtros, exportación/backup cifrado local.

**Tercera entrega (a futuro):** backup/sincronización en la nube con cifrado de extremo a extremo (zero-knowledge también para el backend), evaluación de autofill a nivel de sistema operativo.

---

## 8. Decisiones confirmadas (ronda de revisión)

- **SO mínimo:** código multiplataforma (Android 6+ / iOS 13+), pero las pruebas y el primer build EAS serán **solo para Android**, ya que el usuario no cuenta con dispositivo iOS por ahora.
- **Categorías en el MVP:** sí incluidas desde el MVP, con un filtro minimalista y no invasivo (chips discretos sobre la lista de entradas, sin pantalla dedicada, ocultos si no hay categorías definidas).
- **Botón de agregar entrada:** movido a un FAB (botón flotante circular, 60px) en la esquina inferior derecha, tras probar en dispositivo real — un ícono pequeño en el header no se sentía bien.
- **Sin modo claro:** el tema oscuro es parte de la identidad visual de la app (no una preferencia de SO); no se implementó alternancia claro/oscuro.
