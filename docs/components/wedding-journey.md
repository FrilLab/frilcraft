# Wedding Journey

Wedding Journey is a React invitation experience built from CSS layers and supplied garden illustrations. Guests can follow the path with touch or keyboard controls, skip the journey, and open the invitation after meeting the couple. It does not use Canvas, a game engine, or an animation runtime.

## Preview

Run `npm ci` and `npm run dev` from the repository root, then open <http://localhost:5173/components/wedding-journey>. The preview lets you edit couple names, event date and timezone, venue details, and language. Artwork and CSS load with the component detail; the larger source copy loads only when the Source Files tab opens.

## Copy or install outside this workspace

The `@frillab/interactive` package is private and unpublished. Use FrilAdd or copy the files from the Playground's **Source Files** tab into `src/components/wedding-journey/`:

```text
src/components/wedding-journey/
  WeddingJourney.tsx
  index.ts
  wedding-journey.css
  WeddingJourneyArtwork.ts
  LICENSE
```

The source artwork module embeds the WebP illustrations as data URLs. It keeps the copied component self-contained and avoids external image hosting. The component requires React 19 and Tailwind CSS v4 with `@tailwindcss/vite`; FrilAdd copies files but does not install dependencies or configure Tailwind.

Install from a React project after registering FrilCraft once:

```bash
npx --yes friladd@latest registry add frilcraft https://raw.githubusercontent.com/FrilLab/frilcraft/main/registry.json --global --default
npx --yes friladd@latest add wedding-journey
```

Use the official Tailwind Vite plugin and expose the copied source to Tailwind's scanner:

```ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({ plugins: [tailwindcss()] });
```

```css
@import "tailwindcss";
@source "./components/wedding-journey";
```

Import the stylesheet once and use the component with the generated artwork module:

```tsx
import "./components/wedding-journey/wedding-journey.css";
import { WeddingJourney } from "./components/wedding-journey";
import { weddingJourneyArtwork } from "./components/wedding-journey/WeddingJourneyArtwork";

export function Invitation() {
  return (
    <WeddingJourney
      names="Jisoo & Minseo"
      invitationTitle="A garden wedding"
      startsAt="2027-05-16T05:00:00.000Z"
      timezone="Asia/Seoul"
      venueName="The Garden Hall"
      venueAddress="Seoul, Korea"
      scheduleHref="#event-schedule"
      mapHref="#event-venues"
      rsvpHref="#event-rsvp"
      galleryHref="#event-gallery"
      artwork={weddingJourneyArtwork}
    />
  );
}
```

## Properties

All properties are optional. `names`, `invitationTitle`, `startsAt`, `timezone`, `venueName`, `venueAddress`, and `heroImage` supply invitation content. `locale` selects Korean (`ko`) or English (`en`) interface text. `scheduleHref`, `mapHref`, `rsvpHref`, and `galleryHref` connect existing invitation sections. `artwork` overrides the five illustrated layers, and `preview` constrains height for an editor preview. `reducedMotion` can explicitly disable motion; by default the component follows the browser's reduced-motion setting.

## Input, accessibility, and lifecycle

- Tap or click a point to move along the garden path. Keyboard users can focus the scene and use arrow keys or WASD. A butterfly provides one optional intermediate destination.
- Movement stays on a bounded authored path, with no score, timer, or failure condition.
- The skip link opens the invitation immediately. If the background art fails, the experience falls back to the invitation.
- A live status announces progress to screen readers, focus moves into the opened invitation, and decorative artwork is hidden from assistive technology.
- Reduced motion shortens or removes transition effects. Resize observers, input listeners, animation frames, and timers are removed on unmount.

## Workspace package usage

Inside this repository's npm workspace, import the private package subpath and stylesheet. The package is not available from npm; use copied source or FrilAdd outside the workspace.

```tsx
import "@frillab/interactive/wedding-journey.css";
import { WeddingJourney } from "@frillab/interactive/wedding-journey";

<WeddingJourney names="Jisoo & Minseo" scheduleHref="#event-schedule" />
```

## Source and verification

The component and CSS are read from their canonical package paths. Artwork is embedded into `WeddingJourneyArtwork.ts` only in the lazily loaded source panel; the Playground preview loads its static images from `apps/playground/public/wedding-journey/`. The Registry Manifest v1 lists the component, stylesheet, artwork module, and license for FrilAdd. The isolated source consumer typechecks and builds copied files without importing `@frillab/interactive`.
