---
name: Monad PoP Narrative
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd8e4'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f1fe'
  surface-container: '#f1ecf8'
  surface-container-high: '#ebe6f2'
  surface-container-highest: '#e5e0ec'
  on-surface: '#1c1a23'
  on-surface-variant: '#484554'
  inverse-surface: '#312f38'
  inverse-on-surface: '#f4effb'
  outline: '#787585'
  outline-variant: '#c9c4d6'
  surface-tint: '#5d46d1'
  primary: '#5b43ce'
  on-primary: '#ffffff'
  primary-container: '#745ee9'
  on-primary-container: '#fffbff'
  inverse-primary: '#c8bfff'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5b5c5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#737575'
  on-tertiary-container: '#fdfcfc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5deff'
  primary-fixed-dim: '#c8bfff'
  on-primary-fixed: '#1a0063'
  on-primary-fixed-variant: '#4528b8'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fdf8ff'
  on-background: '#1c1a23'
  surface-variant: '#e5e0ec'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1200px
---

## Brand & Style
The design system for this product is rooted in the intersection of **Physical Ledger Editorial** and **High-Fidelity Fintech**. It aims to transform cold blockchain transactions into tactile, trustworthy "Proof of Purchase" documents. The brand personality is precise, authoritative, and premium, evoking the feeling of a bespoke retail receipt or a high-end gallery ledger.

The design style is a refined mix of **Minimalism** and **Tactile Modernism**. It rejects the typical "web3" tropes of glowing gradients and glassmorphism in favor of high-contrast typography, strict grid alignment, and subtle physical motifs like perforated edges and registration marks. The interface should feel as though it was printed on high-quality stationery, then digitized with pixel-perfect accuracy.

## Colors
The palette is dominated by a warm, paper-like off-white background to reduce eye strain and provide a "material" feel. 

- **Primary:** An electric purple used sparingly for high-action items, replacement statuses, and brand signifiers.
- **Ink:** A near-black gray (#1A1A1A) used for all primary text to maintain a crisp, printed appearance.
- **Paper:** The background (#FDFCFB) and Surface (#FFFFFF) create a subtle contrast for layered receipts and cards.
- **Status Tones:** Functional colors (Green, Orange, Red) are rendered in high-saturation but restrained within small indicators or icons to avoid overwhelming the editorial aesthetic.

## Typography
The typography system uses a three-family structure to define hierarchy:
1. **Playfair Display (Serif):** Used for primary headings and "Statement" titles. It provides the editorial, luxury feel.
2. **Outfit (Sans-Serif):** Used for the primary UI, navigation, and body copy. It is clean and modern, ensuring high legibility.
3. **JetBrains Mono (Monospace):** Reserved for technical data—wallet addresses, transaction hashes, timestamps, and ledger values.

Maintain strict vertical rhythm. Large headlines should use negative letter-spacing for a "tight" editorial look, while mono labels should have increased tracking for clarity at small sizes.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy within a centered container for desktop, mimicking the width of a physical document. 

- **Grid:** A 12-column system for desktop; a 4-column system for mobile.
- **Rhythm:** An 8px base unit (4px for tight details) is used for all padding and margins. 
- **Split Panes:** Heavy use of vertical rules (1px) to divide "Merchant Information" from "Transaction Details."
- **Perforated Breaks:** Horizontal dividers should occasionally use a dashed or "perforated" style to signify a logical break in the "receipt."

## Elevation & Depth
Depth is created through **Tonal Layers** and **Low-Contrast Outlines** rather than shadows. 
- **Surface Tiering:** Elements do not "float" with shadows; they sit on the paper. Use 1px borders (#E2E2E2) to define areas.
- **Stacked Sheets:** To show hierarchy (e.g., a modal or a detail view), stack a white surface on top of the off-white background with a slightly thicker 2px border or a very subtle 4px blur, low-opacity neutral shadow (#000000 05%).
- **Registration Marks:** Use small "L" shaped marks in corners to define the boundaries of the primary content area, enhancing the "printed sheet" metaphor.

## Shapes
The shape language is disciplined and professional. 
- **Radius:** Standard components (buttons, inputs) use a **4px to 6px radius** (`Soft`). This maintains a sharp, precise look while feeling modern.
- **Large Containers:** Cards or "Receipt Sheets" can use up to **10px radius** to differentiate the "physical" document from the UI controls.
- **Status Pills:** Use fully rounded (pill) shapes for status badges to contrast against the otherwise rectangular, structured grid.

## Components
- **Buttons:** Primary buttons are solid #1A1A1A with white text or solid #836EF9. Secondary buttons use a 1px border (#E2E2E2) with no fill.
- **Receipt Cards:** White background (#FFFFFF), 1px border (#E2E2E2), 8px corner radius. Top edge may feature a "serrated" or "perforated" CSS mask.
- **Status Badges:** Small, pill-shaped labels.
    - *Active:* Green dot + text.
    - *Returned/Refunded:* Gray background + mono icon.
    - *Replaced:* Purple background + "Swap" icon.
    - *Revoked:* Red thin border + "X" icon.
- **Input Fields:** Minimalist 1px bottom border only in default state, moving to a full 1px box on focus. Labels use `label-caps` typography.
- **Ledger Rows:** Alternating row highlights or simple 1px horizontal dividers. Use `label-mono` for all numerical and hash data within rows to ensure character alignment.
- **Registration Marks:** Decorative "+" or corner-bracket glyphs placed in the four corners of a container to frame high-value information.