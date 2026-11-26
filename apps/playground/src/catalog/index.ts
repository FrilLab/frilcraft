import type { ComponentCatalogEntry } from "./types.js";

/** Lightweight metadata used by the gallery and route lookup. */
export const componentCatalog: readonly ComponentCatalogEntry[] = [
  {
    id: "envelope-reveal",
    name: "Envelope Reveal",
    description: "An invitation letter that unfolds with a soft, paper-like motion.",
    category: "interaction",
    tags: ["reveal", "invitation", "animation", "click"],
    badges: ["React", "Tailwind"],
    installable: true,
    previewImage: "/previews/envelope-reveal.svg",
    load: async () => (await import("./entries/envelope-reveal.js")).componentDetail,
  },
  {
    id: "wedding-journey",
    name: "Wedding Journey",
    description: "Walk through an illustrated garden and open a real invitation when you meet the couple.",
    category: "interaction",
    tags: ["invitation", "animation"],
    badges: ["React", "CSS", "SVG"],
    installable: true,
    previewImage: "/previews/wedding-journey.svg",
    load: async () => (await import("./entries/wedding-journey.js")).componentDetail,
  },
];

export type { ComponentCategory, ComponentTag } from "./metadata.js";
export type { ComponentCatalogEntry, ComponentDetailRegistration, PlaygroundProps, PlaygroundValue, SourceFile } from "./types.js";
