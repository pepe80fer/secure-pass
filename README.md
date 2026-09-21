# secure-pass

Gestor de contraseñas personal, local-first, para Android (React Native + Expo).

El plan completo del proyecto — modelo de seguridad, librerías, modelo de datos,
arquitectura de carpetas, diseño y fases — vive en [`plan.md`](./plan.md). Léelo
antes de tocar código.

## Desarrollo

Este proyecto usa un *development build* de EAS (no Expo Go), porque las fases
siguientes agregan módulos nativos de cifrado.

```bash
npm install
npx expo run:android   # primera vez: compila e instala el dev client en el emulador/dispositivo
npm start               # siguientes veces: solo levanta Metro contra el dev client ya instalado
```

## Estado

Ver el checklist de fases en [`plan.md`](./plan.md#6-plan-de-fases-mvp).
