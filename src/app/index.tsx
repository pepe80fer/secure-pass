import { Redirect } from 'expo-router';

/**
 * Punto de entrada temporal. La Fase 2 reemplazará esto por lógica real:
 * ¿existe ya un vault? -> (auth)/unlock, si no -> (auth)/setup.
 */
export default function Index() {
  return <Redirect href="/(auth)/setup" />;
}
