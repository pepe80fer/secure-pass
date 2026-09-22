# secure-pass

Gestor de contraseñas personal, local-first, para Android (React Native + Expo).

El plan completo del proyecto — modelo de seguridad, librerías, modelo de datos,
arquitectura de carpetas, diseño y fases — vive en [`plan.md`](./plan.md). Léelo
antes de tocar código.

## Desarrollo

Este proyecto usa un *development build* propio (no Expo Go), porque usa
módulos nativos de cifrado (`react-native-libsodium`) que Expo Go no incluye.

**Si tienes Android SDK instalado localmente:**

```bash
npm install
npx expo run:android   # primera vez: compila e instala el dev client en el emulador/dispositivo
npm start               # siguientes veces: solo levanta Metro contra el dev client ya instalado
```

**Si no tienes Android SDK local** (por ejemplo, en esta máquina de desarrollo):
genera el dev client en la nube con EAS Build y luego levanta Metro para conectarlo:

```bash
npx eas-cli login                                       # una sola vez, con tu cuenta de Expo
npx eas-cli build --profile development --platform android
# instala el APK resultante en tu teléfono (el comando da un link de descarga)
npm start                                                 # levanta Metro; el teléfono debe estar en la misma red Wi-Fi
```

Solo hace falta un build nuevo de EAS cuando se agrega o actualiza un módulo
nativo (ej. una nueva librería con código Android/iOS); los cambios de
JS/TSX se recargan solos en el dev client ya instalado.

## Estado

Ver el checklist de fases en [`plan.md`](./plan.md#6-plan-de-fases-mvp). El MVP
(Fases 0-5) está implementado, probado (63 tests automatizados) y validado en
un dispositivo Android real.
