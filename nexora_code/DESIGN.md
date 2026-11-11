---
name: Nexora Code
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#009eb9'
  on-tertiary-container: '#002f38'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system targets senior software engineers, infrastructure architects, and engineering leadership who demand precision, high throughput, and surgical control over AI-driven development. The brand communicates deep intelligence, hyper-efficiency, and mission-critical reliability. It rejects toy-like conversational paradigms in favor of an advanced IDE-adjacent operational workstation.

The aesthetic fuses **Precision Minimalism** with **Cybernetic Functionalism**:
- **Atmospheric Depth:** Monolithic midnight surfaces punctuated by micro-glows, optical boundaries, and high-legibility telemetry displays.
- **Utilitarian Elegance:** Information-dense layouts without visual noise. Every line, badge, and border corresponds to an operational state, token boundary, or computational status.
- **Tactile Digital Feedback:** Crisp sub-pixel boundaries, controlled luminescence for active agent operations, and low-latency interactive feedback.

## Colors

The palette is engineered exclusively for high-contrast dark environments to reduce optical fatigue during extended deep-work sessions while delineating structural hierarchy.

### Core Palette
- **Canvas Base (`#07090E`):** Pure deep midnight for foundational viewport surfaces, modal underlays, and terminal gutters.
- **Surface Level 1 (`#0B0F19`):** Primary panel background and canvas panels.
- **Surface Level 2 (`#111827`):** Elevated cards, floating command palettes, and inspector drawers.
- **Surface Level 3 (`#1E293B`):** Hover states, active row selections, and docked toolbar ribbons.

### Border & Boundary Tokens
- **Ghost Border (`rgba(255, 255, 255, 0.06)`):** Default structural divider for standard component bounding boxes.
- **Structural Border (`#1E293B`):** High-definition grid lines and panel separators.
- **Focus / Interactive Border (`#334155`):** Subtle hover boundaries on neutral components.

### Spectral & Accent Accents
- **Primary Violet (`#8B5CF6`):** Active agent cycles, intelligence metrics, primary commits, and focal actions.
- **Secondary Indigo (`#6366F1`):** Navigation anchors, structural interactive states, and syntax structural tags.
- **Cyber Cyan (`#06B6D4`):** Real-time telemetry, streaming output indicators, token efficiency metrics, and diff metadata.

### Functional Status Indicators
- **Emerald (`#10B981`):** Verified builds, accepted diffs, model convergence, and idle readiness.
- **Amber (`#F59E0B`):** Token quota thresholds, cache misses, and manual confirmation prompts.
- **Rose (`#F43F5E`):** Execution exceptions, breaking syntax anomalies, and rejected agent actions.

## Typography

The typographic hierarchy enforces a disciplined tripartite separation:
1. **Space Grotesk (Display / Structural Headings):** Delivers a technical, sharp, and confident architectural presence for section titles, views, and modal anchors.
2. **Inter (Interface & Analytical Body):** Applied to prose, operational guidance, documentation, and standard UI interactions. Provides neutral rendering and superior legibility at small sizes.
3. **JetBrains Mono (Telemetry, Code & System States):** Dedicated to diff viewers, token counters, file directories, terminal windows, command payloads, and contextual metadata. Tabular numbers (`tnum`) must be enforced across all telemetry components to eliminate layout shifting during continuous token streaming.

## Layout & Spacing

The system leverages a compact, high-efficiency grid engineered for complex dashboard orchestrations and modular multi-pane splitters:
- **Core Architecture:** Fluid CSS Grid utilizing precise fractional units (`1fr`) combined with rigid side rails (minimum 56px collapsed icon rail, 240px tree navigator).
- **Multi-Split Workspace:** Supports dual or triple vertical splits for source code, runtime agent log, and live telemetry. Panes maintain an internal horizontal padding of `space-md` (0.75rem) to preserve horizontal space.
- **Rhythm & Alignments:** Built on a rigorous 4px baseline rhythm. Component headers are locked to 40px height; toolbars are locked to 32px height to optimize screen density.
- **Responsive Adaptations:**
  - **Desktop (>1280px):** Simultaneous multi-column telemetry, multi-file code diffs, persistent agent action feed.
  - **Tablet (768px - 1279px):** Collapsible file trees into side slide-overs; secondary telemetry switches to tabbed segments.
  - **Mobile (<767px):** Full-bleed single-panel view with bottom docked execution console and modal approval gates.

## Elevation & Depth

Visual depth is achieved through layered surface luminance, backdrop diffusion, and chromatic boundary illumination rather than soft blur-heavy ambient drop shadows.

### Elevation Hierarchy
- **Level 0 (Base Canvas):** Background `#07090E`, flat, zero shadow.
- **Level 1 (Panels & Shell):** Background `#0B0F19`, bordered by `1px solid #1E293B`.
- **Level 2 (Active Cards & Widgets):** Background `rgba(17, 24, 39, 0.75)`, with `backdrop-filter: blur(16px)` and border `1px solid rgba(255, 255, 255, 0.08)`.
- **Level 3 (Overlays, Flyouts & Modals):** Background `rgba(15, 23, 42, 0.90)`, `backdrop-filter: blur(24px)`, framed by `1px solid rgba(139, 92, 246, 0.35)` with an ambient shadow `0 16px 36px -8px rgba(0, 0, 0, 0.85)`.

### Chromatic Glow & State Illumination
Interactive cards, active agent sessions, and executing code pipelines project an ambient edge glow:
- **Default State:** Static perimeter boundary of `1px solid #1E293B`.
- **Streaming / Agent Thinking:** Border shifts to `rgba(139, 92, 246, 0.6)` with an outer box-shadow of `0 0 20px -4px rgba(139, 92, 246, 0.25)`.
- **Success Convergence:** Subtle cyan-emerald peripheral gradient flash (`rgba(6, 182, 212, 0.3)` to `rgba(16, 185, 129, 0.3)`).

## Shapes

The design uses a restrained, crisp aesthetic using **Level 1 (Soft)** corner geometry:
- **Inputs, Buttons, Badges, Table Rows:** `0.25rem` (4px) border-radius. Conveys engineering precision, industrial stability, and structural cohesion.
- **Cards, Telemetry Widgets, Console Windows:** `rounded-lg` (0.5rem / 8px). Creates a subtle, distinct boundary for operational containers without wasting screen real estate.
- **Modal Viewports & Flyouts:** `rounded-xl` (0.75rem / 12px) to softly frame critical workflows against the sharper inner contents.
- **Circular Elements:** Reserved strictly for presence status indicators (e.g., streaming pulsation dots, user avatars) via `border-radius: 9999px`.

## Components

### Buttons & Trigger Controls
- **Primary:** Background `#8B5CF6`, text `#FFFFFF`, border `1px solid rgba(255, 255, 255, 0.2)`. On hover: `#7C3AED` with an inner subtle top specular highlight. Active: transform scale `0.98`.
- **Secondary (Ghost-Framed):** Background `rgba(255, 255, 255, 0.03)`, text `#F3F4F6`, border `1px solid #334155`. On hover: background `rgba(255, 255, 255, 0.07)`, border `#6366F1`.
- **Critical Approval (Destructive/Commit):** Background `rgba(244, 63, 94, 0.1)`, text `#F43F5E`, border `1px solid rgba(244, 63, 94, 0.3)`. Hover shifts to solid `#F43F5E` with white text.

### Telemetry Widgets & Token Gauges
- **Container:** Level 2 surface with subtle glassmorphic blur, locked header containing mono label and latency readout.
- **Token Efficiency Bar:** Height `4px`, track background `#1E293B`, filled dynamically with `#06B6D4` fading into `#8B5CF6`. Micro-tooltips expose context window utilization: active tokens, cached tokens, and predicted cost.

### Code Diff Viewer & Unified Console
- **Diff Structure:** Side-by-side or inline view utilizing `JetBrains Mono` at `13px`.
- **Additions:** Line background `rgba(16, 185, 129, 0.08)`, border-left `2px solid #10B981`, syntax highlighted with high-contrast emerald tint.
- **Deletions:** Line background `rgba(244, 63, 94, 0.08)`, border-left `2px solid #F43F5E`, syntax highlighted with muted rose tint.
- **Agent Attribution Ribbon:** Micro-badge atop mutated blocks indicating model confidence and token execution consumption.

### Command Approval Consoles
- Fixed bottom or inline dock rendering terminal output, auto-generated test suite validation, and one-click manual authorization toggles.
- Features keyboard shortcuts explicitly rendered in `JetBrains Mono` within rounded micro-badges (e.g., `⌘ + ↵`).

### Input Fields & Terminal Prompts
- Background `#07090E`, border `1px solid #1E293B`, inner padding `0.5rem 0.75rem`.
- Focus state activates a distinct glow: border transitions to `#8B5CF6`, outer ring `0 0 0 1px #8B5CF6`.
- Monospaced agent input lines prefixed with an electric violet chevron glyph (`›`).

### Chips & Meta Badges
- Compact height (`20px`), font `JetBrains Mono` (`10px`, uppercase, `0.06em` tracking).
- Filled with low-opacity alpha matching their semantic color (e.g., Cyan token chip: `background: rgba(6, 182, 212, 0.1)`, `border: 1px solid rgba(6, 182, 212, 0.3)`, `text: #06B6D4`).