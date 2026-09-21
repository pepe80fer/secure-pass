import { View, type ViewProps } from 'react-native';

import { colors, type ColorToken } from '@/ui/theme/theme';

export type ThemedViewProps = ViewProps & {
  colorToken?: ColorToken;
};

export function ThemedView({ style, colorToken, ...rest }: ThemedViewProps) {
  return <View style={[{ backgroundColor: colors[colorToken ?? 'background'] }, style]} {...rest} />;
}
