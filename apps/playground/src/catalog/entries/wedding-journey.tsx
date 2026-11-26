import "@frillab/interactive/wedding-journey.css";
import { WeddingJourney } from "@frillab/interactive/wedding-journey";
import type { WeddingJourneyProps } from "@frillab/interactive/wedding-journey";
import { registerComponent } from "../codegen.js";

type WeddingJourneyPlaygroundProps = {
  names: string;
  invitationTitle: string;
  startsAt: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  locale: "ko" | "en";
};

function WeddingJourneyPreview(props: WeddingJourneyPlaygroundProps) {
  const artwork: NonNullable<WeddingJourneyProps["artwork"]> = {
    landscape: "/wedding-journey/garden-landscape.webp",
    portrait: "/wedding-journey/garden-portrait.webp",
    guestWalkCycle: "/wedding-journey/guest-walk-cycle.webp",
    couple: "/wedding-journey/couple.webp",
    foreground: "/wedding-journey/foreground-blooms.webp",
  };

  return (
    <WeddingJourney
      {...props}
      locale={props.locale}
      scheduleHref="#event-schedule"
      mapHref="#event-venues"
      rsvpHref="#event-rsvp"
      galleryHref="#event-gallery"
      artwork={artwork}
      preview
    />
  );
}

const defaultProps: WeddingJourneyPlaygroundProps = {
  names: "Jisoo & Minseo",
  invitationTitle: "A garden wedding",
  startsAt: "2027-05-16T05:00:00.000Z",
  timezone: "Asia/Seoul",
  venueName: "The Garden Hall",
  venueAddress: "Seoul, Korea",
  locale: "ko",
};

export const componentDetail = registerComponent<WeddingJourneyPlaygroundProps>({
  componentName: "WeddingJourney",
  workspaceImportPath: "@frillab/interactive/wedding-journey",
  workspaceCssImportPath: "@frillab/interactive/wedding-journey.css",
  sourceImportPath: "./WeddingJourney",
  sourceCssImportPath: "./wedding-journey.css",
  sourceUsageImports: ['import { weddingJourneyArtwork } from "./WeddingJourneyArtwork";'],
  sourceUsageProps: [{ name: "artwork", value: "weddingJourneyArtwork" }],
  Preview: WeddingJourneyPreview,
  defaultProps,
  controls: [
    { key: "names", label: "Couple names", description: "The names shown at the garden arch and on the invitation.", kind: "text" },
    { key: "invitationTitle", label: "Invitation title", description: "A short line between the names and event details.", kind: "text" },
    { key: "startsAt", label: "Event date and time (ISO)", description: "An ISO date and time, formatted in the event timezone.", kind: "text" },
    { key: "timezone", label: "Event timezone", description: "An IANA timezone such as Asia/Seoul.", kind: "text" },
    { key: "venueName", label: "Venue name", description: "The ceremony venue.", kind: "text" },
    { key: "venueAddress", label: "Venue address", description: "The venue address shown on the invitation.", kind: "text" },
    { key: "locale", label: "Language", description: "Choose Korean or English interface copy.", kind: "text" },
  ],
  sourceFiles: [],
  sourceFileCount: 5,
  loadSourceFiles: () => import("./wedding-journey-source.js").then((module) => module.weddingJourneySourceFiles),
  sourceInstructions: "Copy all five files into src/components/wedding-journey/. Import wedding-journey.css from your application once, and add @source \"./components/wedding-journey\"; to the application CSS entry so Tailwind can scan the component. The generated local usage imports the bundled WeddingJourneyArtwork.ts asset module. Requires React 19 and Tailwind CSS v4 with @tailwindcss/vite; FrilAdd copies source files but does not install dependencies or configure Tailwind.",
  previewHint: "Follow the garden path with the arrow keys or tap a point; use Skip to see the invitation now.",
  previewFeatures: ["Touch and keyboard controls", "Reduced motion", "Invitation fallback"],
});
