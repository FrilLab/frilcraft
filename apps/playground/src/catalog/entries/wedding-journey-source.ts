import componentSource from "../../../../../packages/interactive/src/components/wedding-journey/WeddingJourney.tsx?raw";
import componentIndexSource from "../../../../../packages/interactive/src/components/wedding-journey/index.ts?raw";
import componentStyles from "../../../../../packages/interactive/src/components/wedding-journey/wedding-journey.css?raw";
import artworkSource from "../../../../../packages/interactive/src/components/wedding-journey/WeddingJourneyArtwork.ts?raw";
import licenseText from "../../../../../LICENSE?raw";
import type { SourceFile } from "../types.js";

export const weddingJourneySourceFiles: readonly SourceFile[] = [
  { path: "WeddingJourney.tsx", content: componentSource },
  { path: "index.ts", content: componentIndexSource },
  { path: "wedding-journey.css", content: componentStyles },
  { path: "WeddingJourneyArtwork.ts", content: artworkSource },
  { path: "LICENSE", content: licenseText },
];
