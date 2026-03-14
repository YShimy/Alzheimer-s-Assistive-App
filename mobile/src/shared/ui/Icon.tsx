/**
 * Icon helper — wraps @expo/vector-icons for consistent use.
 * Using Ionicons which provides professional, clean icons.
 */
import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { colors } from '../../infrastructure/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = colors.neutral[700] }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
