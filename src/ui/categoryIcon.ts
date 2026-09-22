import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Categorías son texto libre (el usuario las escribe), así que esto es una
 * heurística por palabras clave, no un catálogo cerrado — solo se usa cuando
 * la categoría no tiene un ícono elegido a mano (ver vaultStore.categoryIcons).
 */
const CATEGORY_ICON_RULES: Array<{ match: RegExp; icon: IoniconName }> = [
  { match: /banc|financ|tarjeta|pago|dinero/i, icon: 'card-outline' },
  { match: /trabajo|empresa|oficina/i, icon: 'briefcase-outline' },
  { match: /correo|email|mail/i, icon: 'mail-outline' },
  { match: /social|red(es)?/i, icon: 'chatbubbles-outline' },
  { match: /compra|tienda|shop/i, icon: 'cart-outline' },
  { match: /salud|medic/i, icon: 'medkit-outline' },
  { match: /juego|entreten|game|pelicul|serie|music/i, icon: 'game-controller-outline' },
  { match: /viaje|vuelo|hotel/i, icon: 'airplane-outline' },
  { match: /educ|escuela|universidad|curso/i, icon: 'school-outline' },
  { match: /person|famil/i, icon: 'person-outline' },
];

export const DEFAULT_CATEGORY_ICON: IoniconName = 'pricetag-outline';

/** Íconos que el usuario puede elegir a mano para una categoría. */
export const SELECTABLE_CATEGORY_ICONS: IoniconName[] = [
  DEFAULT_CATEGORY_ICON,
  'card-outline',
  'briefcase-outline',
  'mail-outline',
  'chatbubbles-outline',
  'cart-outline',
  'medkit-outline',
  'game-controller-outline',
  'airplane-outline',
  'school-outline',
  'person-outline',
  'key-outline',
  'lock-closed-outline',
  'star-outline',
  'heart-outline',
  'home-outline',
  'wifi-outline',
  'tv-outline',
  'car-outline',
  'restaurant-outline',
  'fitness-outline',
  'gift-outline',
  'book-outline',
  'folder-outline',
];

function isSelectableIcon(icon: unknown): icon is IoniconName {
  return typeof icon === 'string' && (SELECTABLE_CATEGORY_ICONS as string[]).includes(icon);
}

/**
 * Ícono efectivo para una categoría: el elegido a mano en `overrides` si
 * existe y es válido, si no la heurística por palabras clave, si no el
 * genérico.
 */
export function iconForCategory(category: string | undefined, overrides?: Record<string, string>): IoniconName {
  if (!category) {
    return DEFAULT_CATEGORY_ICON;
  }
  const override = overrides?.[category];
  if (isSelectableIcon(override)) {
    return override;
  }
  return CATEGORY_ICON_RULES.find((rule) => rule.match.test(category))?.icon ?? DEFAULT_CATEGORY_ICON;
}
