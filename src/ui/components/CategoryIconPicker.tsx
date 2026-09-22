import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/ui/components/ThemedText';
import { type IoniconName, SELECTABLE_CATEGORY_ICONS } from '@/ui/categoryIcon';
import { colors, radius, spacing } from '@/ui/theme/theme';

type CategoryIconPickerProps = {
  visible: boolean;
  category: string;
  currentIcon: IoniconName;
  hasOverride: boolean;
  onSelect: (icon: IoniconName) => void;
  onReset: () => void;
  onClose: () => void;
};

/** Selector de ícono para una categoría — el ícono elegido se guarda para todas las entradas de esa categoría. */
export function CategoryIconPicker({
  visible,
  category,
  currentIcon,
  hasOverride,
  onSelect,
  onReset,
  onClose,
}: CategoryIconPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <ThemedText type="subtitle" numberOfLines={1}>
            Ícono para &quot;{category}&quot;
          </ThemedText>
          <View style={styles.grid}>
            {SELECTABLE_CATEGORY_ICONS.map((icon) => {
              const selected = icon === currentIcon;
              return (
                <Pressable
                  key={icon}
                  onPress={() => onSelect(icon)}
                  style={[styles.iconOption, selected && styles.iconOptionSelected]}
                  accessibilityLabel={icon}
                >
                  <Ionicons name={icon} size={22} color={selected ? colors.text : colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
          {hasOverride && (
            <Pressable onPress={onReset} style={styles.resetButton}>
              <ThemedText type="small" colorToken="accent">
                Usar automático
              </ThemedText>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    padding: spacing.four,
    paddingBottom: spacing.six,
    gap: spacing.three,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.two },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  resetButton: { alignSelf: 'flex-start', paddingVertical: spacing.one },
});
