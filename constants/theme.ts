/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';
const errorColorLight = '#ff4444';
const errorColorDark = '#ff6b6b';
const successColorLight = '#4caf50';
const successColorDark = '#66bb6a';
const warningColorLight = '#ff9800';
const warningColorDark = '#ffb74d';

// Gradient colors
const gradientColorsLight = ['#667eea', '#764ba2', '#f093fb'] as const;
const gradientColorsDark = ['#1a1a2e', '#16213e', '#0f3460'] as const;

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    textMuted: '#9BA1A6',
    background: '#fff',
    backgroundSecondary: '#f8f9fa',
    tint: tintColorLight,
    tintSecondary: '#b3d9e8',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#e1e5e9',
    borderSecondary: '#f0f0f0',
    error: errorColorLight,
    success: successColorLight,
    warning: warningColorLight,
    // Auth specific colors
    buttonPrimary: tintColorLight,
    buttonDanger: errorColorLight,
    buttonText: '#ffffff',
    inputBorder: tintColorLight,
    placeholderText: '#9BA1A6',
    // Gradient colors
    gradientColors: gradientColorsLight,
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textMuted: '#687076',
    background: '#151718',
    backgroundSecondary: '#1e2124',
    tint: tintColorDark,
    tintSecondary: '#cccccc',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#2f3136',
    borderSecondary: '#36393f',
    error: errorColorDark,
    success: successColorDark,
    warning: warningColorDark,
    // Auth specific colors
    buttonPrimary: tintColorDark,
    buttonDanger: errorColorDark,
    buttonText: '#000000',
    inputBorder: tintColorDark,
    placeholderText: '#687076',
    // Gradient colors
    gradientColors: gradientColorsDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
