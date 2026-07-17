# Monad PoP — Design Language & Motion Specification

## 1. Purpose

This document defines the visual and motion system for **Monad PoP**, a proof-of-purchase marketplace and transaction experience running on Monad testnet.

Behavioral reference: [Nexora Motion Studio](https://nexora-motion-studio.synth-llano-68.chatgpt.site/#contact)

Use the reference for its **kinetic rhythm, editorial scale, section choreography, and interaction confidence**. Do not copy its branding, copywriting, logo, artwork, or exact compositions. Monad PoP should feel native to a Web3 marketplace: trustworthy, fast, legible, and unmistakably purple.

## 2. Creative Direction

### Core idea: “Proof in Motion”

The interface should make a transaction feel like a visible journey. Products enter the marketplace, buyer and seller roles connect, value moves into escrow, and a permanent proof resolves onchain. Motion is not decoration; it explains that lifecycle.

### Personality

- Bold and technically credible, but not intimidating.
- Editorial rather than template-like.
- Light-first, with deep-purple feature stages for contrast.
- Energetic during storytelling; calm during forms, wallet actions, and confirmations.
- Premium enough for high-value physical goods such as watches, collectibles, and electronics.

### Design principles

1. **Proof is visible.** Always expose status, counterparties, amount, and transaction evidence clearly.
2. **One motion idea per section.** Avoid simultaneous effects competing for attention.
3. **Scale creates drama; spacing creates trust.** Use oversized headlines with generous negative space.
4. **Purple communicates action.** Reserve saturated purple for primary actions, active states, and transaction progression.
5. **Motion follows the transaction.** Movement should generally travel forward: left to right or bottom to top.

## 3. Color System

This is a Monad-inspired white-and-purple system. Keep approximately 65–75% of the total page area white or pale lavender.

```css
:root {
  --purple-950: #16002e;
  --purple-900: #200043;
  --purple-800: #351069;
  --purple-700: #5e2bc7;
  --purple-600: #836ef9;
  --purple-500: #9b87ff;
  --purple-300: #c7b8ff;
  --purple-100: #eee9ff;
  --purple-50:  #f8f6ff;

  --white:      #ffffff;
  --ink:        #150d20;
  --ink-soft:   #51475e;
  --success:    #168a5b;
  --warning:    #d97706;
  --danger:     #d64059;

  --line:       rgba(53, 16, 105, 0.14);
  --line-dark:  rgba(255, 255, 255, 0.18);
  --glow:       rgba(131, 110, 249, 0.34);
}
```

### Surface sequence

Alternate surfaces to create the same cinematic chapter changes as the reference:

1. Hero — white with lavender atmospheric glow.
2. Marketplace introduction — pale lavender.
3. Pinned product stories — deep purple.
4. Manifesto — saturated purple with white type.
5. Roles and capabilities — white.
6. Transaction process — pale lavender.
7. Onchain proof — deep plum.
8. Final CTA — purple with animated white rings.

Avoid pure black. Use `--purple-950` for dark stages so every section remains part of the Monad identity.

## 4. Typography

Use **Geist Sans** for display and interface text and **Geist Mono** for wallet data, labels, prices, timestamps, and transaction hashes. If unavailable, use Inter and IBM Plex Mono respectively.

```css
--font-display: "Geist", "Inter", sans-serif;
--font-mono: "Geist Mono", "IBM Plex Mono", monospace;
```

### Type scale

```css
.display-xl {
  font-size: clamp(4rem, 10.5vw, 9rem);
  line-height: 0.84;
  letter-spacing: -0.075em;
  font-weight: 820;
  text-transform: uppercase;
}

.display-lg {
  font-size: clamp(3.2rem, 7.5vw, 7rem);
  line-height: 0.88;
  letter-spacing: -0.065em;
  font-weight: 800;
  text-transform: uppercase;
}

.heading-md {
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 0.95;
  letter-spacing: -0.045em;
  font-weight: 760;
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  line-height: 1.4;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
```

Headlines may use outline text for one meaningful word such as `PROOF`, but never outline more than one line in a composition. Transactional copy must remain conventionally spaced and highly legible.

## 5. Layout and Spacing

- Desktop grid: 12 columns, `clamp(20px, 3.2vw, 52px)` page gutter.
- Tablet grid: 8 columns, 28px gutter.
- Mobile grid: 4 columns, 18px gutter.
- Section padding: `clamp(88px, 12vw, 180px)` vertically.
- Use full-width hairline dividers between editorial rows.
- Content maximum: 1440px, while backgrounds and showcase stages remain full bleed.
- Use asymmetry deliberately: large headline on the left, compact explanation or metadata aligned to the right edge.
- Default card radius: 20px. Pills use `999px`; transaction panels can use 24px. Do not make every container a floating rounded card.

## 6. Page Choreography

### 6.1 Branded loader

Show on the first visit of a session only.

- Full-screen purple surface.
- Top-left: `MONAD PoP` wordmark.
- Top-right: `INITIALIZING TESTNET EXPERIENCE` in mono.
- Bottom-left: numeric progress from `000%` to `100%`.
- Bottom: thin white progress line.
- Exit by lifting the purple panel upward while the hero reveals from below.
- Total duration: 900–1500ms. Never delay an already-ready application merely to finish the animation.

### 6.2 Fixed navigation

- Transparent over the top of the hero.
- After 40px scroll: compact height, translucent white or deep-purple background depending on section, `backdrop-filter: blur(16px)`.
- Left: Monad PoP mark.
- Center: Marketplace, How It Works, Proofs.
- Right: network badge and `Connect Wallet` pill.
- Mobile: circular menu trigger opening a full-screen purple panel.
- Header state transition: 280–320ms.

### 6.3 Hero

Suggested composition:

```text
BUY. SELL.
PROVE IT
ONCHAIN.
```

- White base with a soft violet radial glow and faint grain.
- Render `PROVE IT` as outlined purple text and `ONCHAIN.` as solid saturated purple.
- Place an abstract transaction orbit on the right: product token, buyer, seller, and proof nodes moving on three imperfect rings.
- Supporting line: “A peer-to-peer marketplace where every purchase ends with verifiable proof on Monad.”
- Primary CTA: `Explore Listings`.
- Secondary CTA: `Create a Listing`.
- Small mono metadata: `MONAD TESTNET / ESCROW ENABLED / PUBLIC PROOFS`.

On scroll, move the headline upward by approximately 55px and fade it toward 20% opacity while the orbit drifts in the opposite direction. Keep this tied directly to scroll progress.

### 6.4 Activity marquee

A narrow edge-to-edge ticker separates hero and marketplace:

`LIST • MATCH • ESCROW • TRANSFER • VERIFY •`

- Deep purple background, white mono text.
- Two duplicated tracks for a seamless loop.
- Duration: 24–32s; pause on hover.
- Treat this as ambient texture, not essential information.

### 6.5 Marketplace introduction

Use a pale-lavender editorial section with a large statement:

`REAL PRODUCTS. REAL COUNTERPARTIES. PERMANENT PROOF.`

Pair it with a concise explanation and a live testnet statistic or clearly marked demo statistic. Do not present mocked numbers as real network data.

### 6.6 Pinned horizontal product story

On desktop, vertical scroll pins a one-viewport stage and translates a horizontal track through four chapters:

| Chapter | Visual | Onscreen idea |
|---|---|---|
| Issue | Seller listing form and watch image | Product details become a testnet listing |
| Match | Buyer request and role state | Wallets become transaction-specific buyer and seller |
| Escrow | 10 MON moving into a contract | Funds are visibly locked pending completion |
| Verify | Proof card and explorer link | Final purchase proof is written onchain |

Each chapter fills 75–90vw and uses one oversized word behind the interface mockup. Product mockups can tilt 2–5 degrees and parallax at different rates. Keep real controls readable and do not rotate forms themselves.

On tablet and mobile, remove pinning and stack these chapters vertically.

### 6.7 Manifesto panel

Use a saturated purple full-height section with oversized white copy:

`OWNERSHIP SHOULD NOT DEPEND ON A SCREENSHOT.`

Highlight `ONCHAIN.` or `PROOF.` in pale lavender. Add a small point-of-view paragraph and a link to the proof explorer. The headline reveals line by line as the panel enters.

### 6.8 Buyer and seller roles

Present two full-width capability rows rather than generic cards.

- **SELLER** — creates a listing, defines price, reviews requests, deposits or confirms the product, and completes fulfillment.
- **BUYER** — submits a purchase request, funds escrow, confirms receipt, and receives proof.

Roles are transaction-specific, not permanent global identities. A wallet may be a buyer in one deal and a seller in another. Show role assignment after the user takes the relevant action; never assign buyer status merely because a wallet has sufficient balance.

Rows enter from the right by 70–90px. On hover, the label shifts 10px and the circular arrow rotates 45 degrees while its background fills purple.

### 6.9 Transaction process

Create a light section with four numbered steps connected by a progress line:

1. Create listing.
2. Request and accept trade.
3. Fund and release escrow.
4. Mint or record proof.

The line scales from left to right based on section progress. Cards reveal with a 70ms stagger and slight alternating vertical offsets. On mobile, use a vertical progress line.

### 6.10 Onchain proof

Use a deep-plum stage containing one large, premium proof card:

- Product name and image.
- Listing ID.
- Buyer and seller addresses, shortened visually but copyable in full.
- Amount and network.
- Status: pending, funded, completed, disputed, or cancelled.
- Block number, timestamp, and transaction hash.
- `View on Explorer` action.

The card enters from 60–70px below. When a transaction completes, animate one restrained purple sweep across the card, then reveal the proof seal. Do not use confetti.

### 6.11 Final CTA and footer

- Saturated purple background.
- Copy: `READY TO MAKE IT PROVABLE?`
- Primary white pill: `Launch App`.
- Three large concentric outline rings expand behind the CTA on a 4s loop, staggered by roughly 1.3s.
- Keep links and network/legal information below a thin translucent divider.

## 7. Product Component Language

### Buttons

- Primary: purple fill, white label, arrow in a circular inset.
- Secondary: transparent with 1px purple border.
- On dark stages: white primary and translucent-white secondary.
- Height: 48px desktop, 46px mobile.
- Hover: lift 2px, brighten fill, translate arrow 3–4px.
- Active: return to baseline and scale to 0.98.
- Focus: 3px lavender outline with 3px offset.

### Listings

- Large product image with a 4:3 crop.
- Price is prominent and mono: `10.00 MON`.
- Show status, seller address, and listing ID without crowding the image.
- On hover, scale the image no more than 1.035 and raise the card 4px.
- Use a purple status strip or badge; never rely on color alone.

### Forms

- Forms are calm zones: no continuous animation near active inputs.
- Labels remain visible above fields.
- Show wallet balance beside the price/funding field.
- Validate network, balance, approval, and gas before submission.
- Use a clear transaction stepper: `Review → Sign → Pending → Confirmed`.

### Status vocabulary

Use the same labels everywhere:

`Draft`, `Open`, `Requested`, `Accepted`, `Funded`, `Shipped`, `Completed`, `Disputed`, `Cancelled`.

Pair every status color with an icon and text label.

### Wallet and chain data

- Use mono type.
- Shorten addresses only in display, never in copied values.
- Provide copy feedback for 1.2–1.8s.
- Always show `Monad Testnet` near transaction actions during development.

## 8. Motion System

### Motion tokens

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-standard: cubic-bezier(0.22, 0.61, 0.36, 1);
  --duration-fast: 180ms;
  --duration-ui: 280ms;
  --duration-reveal: 800ms;
  --duration-chapter: 1000ms;
}
```

### Motion hierarchy

| Level | Use | Timing |
|---|---|---|
| Micro | Button, badge, copy feedback | 180–320ms |
| Reveal | Headlines, rows, cards | 700–1000ms |
| Scroll | Parallax, progress, horizontal story | Scrubbed to scroll |
| Ambient | Orbit rings, glow, CTA pulses | 8–14s, except 4s CTA pulse |

### Standard reveal

- Start: `opacity: 0; transform: translateY(56px)`.
- End: `opacity: 1; transform: translateY(0)`.
- Duration: 0.8s.
- Ease: `--ease-out-expo`.
- Child stagger: 60–90ms.

### Orbit motion

Use three rings with distinct periods to avoid mechanical synchronization:

- Outer ring: 13s, alternate.
- Middle ring: 10s, alternate-reverse.
- Inner signal ring: 8s, alternate.
- Keep translation/rotation subtle and preserve readable node labels.

### Custom cursor

Desktop fine-pointer devices may use a 5px purple dot plus a 42px translucent ring. Expand it over links and product cards. Disable it on touch devices, coarse pointers, forms, and reduced-motion mode. Never hide the native cursor until the custom cursor is initialized.

## 9. Implementation Guidance

For a React or Next.js build, use CSS transitions for micro-interactions and GSAP with ScrollTrigger for the pinned horizontal showcase, scrubbed parallax, progress lines, and section-aware navigation. Scope animations to components and clean up every trigger on unmount.

Recommended behavior:

```js
// Conceptual settings, not drop-in code.
reveal: { y: 56, opacity: 0, duration: 0.8, ease: "power4.out" }
stagger: 0.07
scrub: 0.6
horizontalEnd: () => track.scrollWidth - window.innerWidth
```

- Animate `transform` and `opacity`; avoid layout-affecting properties during scroll.
- Use `will-change` only on elements actively animating.
- Recalculate pinned distances after images and fonts load.
- Store loader completion in `sessionStorage`.
- Use CSS gradients and SVG for rings; do not ship large video backgrounds for simple effects.
- Preserve normal document flow before JavaScript initializes.

## 10. Responsive Behavior

### Desktop, 1200px+

- Full display scale.
- Pinned horizontal showcase enabled.
- Custom cursor allowed.
- Hero orbit occupies approximately 38–44% of viewport width.

### Tablet, 768–1199px

- Reduce headline scale and letter-spacing.
- Horizontal story may remain swipeable but should not be scroll-pinned.
- Collapse centered navigation into the menu trigger.

### Mobile, below 768px

- Stack all storytelling chapters vertically.
- Remove custom cursor and nonessential parallax.
- Use `clamp(3.2rem, 18vw, 5.4rem)` for hero display text.
- Keep CTAs full width where helpful.
- Ensure wallet addresses, hashes, and price rows wrap without horizontal page overflow.
- Preserve the loader, line reveals, progress stepper, and restrained orbit so the experience still feels intentional.

## 11. Accessibility and Performance

Honor `prefers-reduced-motion: reduce`:

- Skip the loader counter and reveal the hero immediately.
- Disable pinning, scrubbed parallax, marquee, custom cursor, and ambient loops.
- Stack showcase panels and show all content at full opacity.
- Keep only essential state transitions under 150ms.

Also:

- Maintain WCAG AA contrast for text and controls.
- Do not place body copy over moving glows without an opaque surface.
- Keep keyboard focus visible and navigation order logical.
- Make all hover information available through focus or persistent text.
- Use semantic headings and landmarks.
- Target a smooth 60fps on a typical laptop and a stable 30–60fps on mid-range mobile hardware.
- Lazy-load below-the-fold product media and reserve its aspect ratio to prevent layout shift.

## 12. Do / Do Not

### Do

- Use oversized typography to state the product promise.
- Let white space separate transactional information.
- Change section surfaces decisively.
- Animate progress in the same direction as the transaction journey.
- Keep forms and signature moments calm and explicit.
- Label every demo/testnet value honestly.

### Do not

- Copy Nexora’s assets, wording, exact colors, or project layouts.
- Turn every section into a glassmorphism card grid.
- Add perpetual movement to product forms or confirmation dialogs.
- Use purple gradients everywhere; reserve them for atmospheric depth.
- obscure prices, parties, status, or explorer evidence for visual drama.
- Imply that wallet balance assigns a permanent buyer or seller identity.

## 13. Acceptance Checklist

- [ ] The site is predominantly white/pale lavender with intentional deep-purple stages.
- [ ] The hero communicates marketplace, escrow, and onchain proof within one viewport.
- [ ] The first-session loader completes in no more than 1.5s.
- [ ] Desktop includes one stable pinned horizontal story with four transaction chapters.
- [ ] Mobile replaces the pinned story with accessible vertical content.
- [ ] Buyer and seller roles are transaction-specific and explained clearly.
- [ ] All transaction states use consistent wording across listings, dashboards, and proof views.
- [ ] Motion uses the defined timings and easings.
- [ ] Reduced-motion mode removes all nonessential animation.
- [ ] Forms, wallet prompts, and transaction results remain readable without animation.
- [ ] Testnet state is visible near wallet and transaction actions.
- [ ] No branding, copy, or artwork is duplicated from the reference website.

