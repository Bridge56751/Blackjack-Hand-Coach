# Blackjack Coach

A focused, table-side mobile coach that gives blackjack players honest, immediate feedback on their basic strategy decisions.

## Run & Operate

- Preview the app via the Replit workspace (Expo workflow)
- Use Expo Go on a physical device to play with real haptic feedback
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- Expo (React Native) + Expo Router
- `react-native-reanimated` for smooth interaction animations
- `expo-haptics` for tactile feedback
- `@react-native-async-storage/async-storage` for local session history
- pnpm workspaces, Node.js 24, TypeScript 5.9

## Where things live

- **App Code**: `artifacts/blackjack-coach/app/`
- **State & Logic**: `artifacts/blackjack-coach/lib/` (context.tsx, strategy.ts)
- **Theme**: `artifacts/blackjack-coach/constants/colors.ts`
- **Assets**: `artifacts/blackjack-coach/assets/`

## Architecture decisions

- **Frontend-Only**: No backend server or external API is used to ensure maximum speed and offline capability in casino environments.
- **Aggregated Inputs**: Hand cards 10, J, Q, K are aggregated as "T" for basic strategy evaluation.
- **Fast Flow**: Busting automatically triggers outcome collection, bypassing unnecessary actions.
- **Dark Theme Priority**: The app forces a rich "Deep Table Green" theme across both light and dark system settings to guarantee a cohesive casino aesthetic.

## Product

- **Fast Hand Logging**: Touch-first, robust card selector (Dealer Card + 2 or more Player Cards).
- **Basic Strategy Engine**: Evaluates standard decisions (Hit, Stand, Double, Split, Surrender) against a multi-deck, dealer-stands-on-soft-17 chart.
- **Session Tracking**: Records each hand outcome, tracking performance.
- **Session Report**: Evaluates overall accuracy with a letter grade and lists all mistakes (player vs. correct action) made during the session for immediate review.
