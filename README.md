# Not To Be Cooked (NTCB)

A modern cross-platform application monorepo powered by **Turborepo**, **pnpm Workspaces**, **Vite**, **React 19**, **Tailwind CSS v4**, and **Tauri v2**.

This repository is architected for **zero code duplication** across **Web**, **Desktop** (Linux, Windows, macOS), and **Android Tablets / Mobile**.

---

## 🏗️ Architecture Overview

```
                        ┌───────────────────────────────┐
                        │   packages/ui (@workspace/ui) │
                        │  Single Source of Truth (UI)  │
                        │  - shadcn/ui (Base UI / Vega) │
                        │  - Shared Views & Components  │
                        │  - Tailwind v4 (globals.css)  │
                        └──────────────┬────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
    ┌───────────▼───────────┐                     ┌───────────▼───────────┐
    │       apps/web        │                     │     apps/desktop      │
    │   (Vite Web Client)   │                     │  (Tauri v2 App Core)  │
    └───────────────────────┘                     └───────────┬───────────┘
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            │                                   │
                                ┌───────────▼───────────┐           ┌───────────▼───────────┐
                                │     Desktop Target    │           │     Android Target    │
                                │ (Linux/macOS/Windows) │           │   (Tablets & Mobile)  │
                                └───────────────────────┘           └───────────────────────┘
```

* **`packages/ui` (`@workspace/ui`)**: The single source of truth for design system primitives, theme styles, shadcn components, and shared view layouts.
* **`apps/web`**: Web application client.
* **`apps/desktop`**: Tauri v2 application compiled into native Desktop executables or Android `.apk`/`.aab` tablet packages.

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (>= 20)
* [pnpm](https://pnpm.io/) (`pnpm@10.33+`)
* [Rust toolchain](https://www.rust-lang.org/tools/install) (for Tauri Desktop/Android builds)
* [Android Studio & SDK](https://developer.android.com/studio) (optional, for Android Tablet builds)

### Installation

From the workspace root directory:

```bash
pnpm install
```

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev:web` | Start the Web application dev server |
| `pnpm dev:desktop` | Launch the Tauri Desktop application (Linux/macOS/Windows) |
| `pnpm dev:android` | Launch the app in Android Tablet emulator or device |
| `pnpm dev` | Run dev servers for all targets simultaneously via Turborepo |
| `pnpm typecheck` | Perform TypeScript typechecking across all workspace packages |
| `pnpm build` | Build production assets for all apps & packages |

---

## 🧩 Managing UI & `shadcn` Components

All UI components live in `packages/ui/src/components`.

### Adding New `shadcn` Components

> **IMPORTANT**: Component names MUST be **lowercase** (e.g. `card`, `field`, `button`, `dialog`) and targeted to `packages/ui`.

From the project root:

```bash
# Add a card component
pnpm dlx shadcn@latest add card --cwd packages/ui

# Add a field/label component
pnpm dlx shadcn@latest add field --cwd packages/ui
```

### Consuming Components Across Apps

Import directly from `@workspace/ui/components/...`:

```tsx
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Field } from "@workspace/ui/components/field";
```

### Sharing Entire App Views

Write shared view components in `packages/ui/src/app.tsx` (or inside feature folders):

```tsx
// packages/ui/src/app.tsx
import { SharedMainApp } from "@workspace/ui/app";

// apps/web/src/App.tsx & apps/desktop/src/App.tsx:
export default function App() {
  return <SharedMainApp platform="tauri" />;
}
```

---

## 📱 Android Tablet Setup

To compile `apps/desktop` into an Android Tablet target:

1. **Initialize Android target harness**:
   ```bash
   cd apps/desktop
   pnpm tauri android init
   ```
2. **Run on Android Emulator / Physical Device**:
   ```bash
   pnpm dev:android
   ```