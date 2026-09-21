import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts, type ColorToken } from '@/ui/theme/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'mono';
  colorToken?: ColorToken;
};

export function ThemedText({ style, type = 'default', colorToken, ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        { color: colors[colorToken ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'subtitle' && styles.subtitle,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'mono' && styles.mono,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  smallBold: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  mono: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 24 },
});
