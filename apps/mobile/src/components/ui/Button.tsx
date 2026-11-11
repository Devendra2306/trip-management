import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { PALETTE } from '@yatra/shared';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E0';
    switch (variant) {
      case 'primary':
        return PALETTE.saffron;
      case 'secondary':
        return PALETTE.navy;
      case 'outline':
        return 'transparent';
      case 'danger':
        return PALETTE.rust;
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return PALETTE.navy;
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      style={[
        styles.button,
        styles[size],
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineBorder,
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${size}Text`], { color: getTextColor() }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: PALETTE.navy,
  },
  sm: {
    height: 36,
    paddingHorizontal: 12,
  },
  md: {
    height: 44,
    paddingHorizontal: 16,
  },
  lg: {
    height: 52,
    paddingHorizontal: 24,
  },
  text: {
    fontWeight: '700',
    fontFamily: 'System',
  },
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 16,
  },
});
