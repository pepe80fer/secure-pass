import { Redirect } from 'expo-router';

import { vaultExists } from '@/vault/vaultRepository';

export default function Index() {
  return <Redirect href={vaultExists() ? '/(auth)/unlock' : '/(auth)/setup'} />;
}
