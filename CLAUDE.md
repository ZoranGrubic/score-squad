# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Score Squad is a React Native mobile application built with Expo and TypeScript. The project uses Expo Router for file-based navigation and supports iOS, Android, and web platforms.

## Development Commands

### Core Commands
- `npm install` - Install dependencies
- `npx expo start` or `npm start` - Start development server
- `npm run android` - Start on Android emulator
- `npm run ios` - Start on iOS simulator
- `npm run web` - Start web version
- `npm run lint` - Run ESLint checks
- `npm run reset-project` - Reset to blank project (moves starter code to app-example/)

### Testing
No test configuration detected - check with user for testing setup if tests are needed.

## Architecture

### Navigation Structure
- File-based routing using Expo Router
- Root layout at `app/_layout.tsx` with theme provider and navigation stack
- Tab-based navigation at `app/(tabs)/_layout.tsx` with Home and Explore tabs
- Modal support configured in root layout

### Key Directories
- `app/` - File-based routing structure
- `components/` - Reusable UI components including themed components
- `hooks/` - Custom React hooks (color scheme, theme color)
- `constants/` - Theme colors and fonts configuration
- `assets/images/` - App icons and images

### Theming System
- Dual light/dark theme support via `constants/theme.ts`
- Custom themed components (ThemedText, ThemedView)
- Platform-specific font handling (iOS system fonts, web font stacks)
- Color scheme detection hooks with platform-specific implementations

### Component Architecture
- Platform-specific components using `.ios.tsx` and `.web.tsx` extensions
- Haptic feedback integration for tab interactions
- Icon system using Expo Symbols with SF Symbols on iOS

### TypeScript Configuration
- Strict TypeScript enabled
- Path aliases configured with `@/*` mapping to root
- Expo TypeScript base configuration extended

## Key Features
- Cross-platform support (iOS, Android, Web)
- Automatic theme switching
- Haptic feedback
- Edge-to-edge Android support
- New React Native architecture enabled
- React Compiler experimental feature enabled