# FrilCraft Experience Library: Direction and Delivery Plan

> **Status: Proposed architecture / implementation roadmap (not yet implemented).**
>
> This document explains what to build, why, and in what order. It is **not** an API reference and does not claim that the described runtime, adapters, templates, or WASM packages exist.
>
> **Start here:** Read "The goal", "One example", and "Delivery slices" first. Read the contracts and technology sections when implementing.

## The goal in one minute

**FrilCraft is a library for building, configuring, and reusing interactive web experiences.** It is not intended to become a replacement for Three.js, a full 3D modeling application, or the FrilStudio product backend.

A reusable experience must be able to:

1. Accept externally supplied **content** (words, images, assets, data).
2. Accept validated **configuration** (layout, colors, motion, navigation, camera).
3. Render and react to input, without hard-coded demonstration data.
4. Be previewed, edited, serialized, restored, and distributed.
5. Avoid importing product-specific concepts such as accounts, weddings, RSVP storage, payments, or publishing.

**The key test for reuse:** Adding a second experience must not require rewriting the first one's core contract or the host editor.

## One example: from demo to reusable experience

`demo-test5` currently shows a six-phase Paper Theater with fold/swap/unfold transitions, direct book click-to-detail, scrolling, touch, and keyboard controls.

- **Prototype:** Fictional invitation data and application behavior are bundled with the demo.
- **FrilCraft experience:** The same interaction accepts a typed set of phases and configuration. The demo fixture is only an example.
- **Playground:** Change text, phase artwork settings, and motion options, then export/import a versioned configuration. Preview the actual reusable component.
- **Consumer:** Supply its own content/configuration and handle actions, with no dependency on Playground or FrilStudio.

The Paper Theater's CSS/DOM rendering need not be forced into a 3D mesh model. A later Gallery Walk experience will use real Three.js meshes while sharing the relevant configuration, state, and editor concepts.

## What exists today (do not confuse this with the proposal)

- `packages/interactive` owns the reusable **React 19** Envelope Reveal component; it is private/unpublished.
- `apps/playground` previews that component, edits its properties, shows source files, and generates usage examples.
- `registry.json` and FrilAdd support the **copied-source** workflow.
- `packages/interactive/src/core/stage` and `core/view` contain **type-only** Stage/View contracts. There is **no** working GPU Stage runtime.
- `AGENTS.md` and [Rendering Foundations](rendering-foundations.md) currently recommend R3F as a future React integration for 3D. This proposal recommends **evaluating a shared Vanilla Three.js runtime with a thin React adapter instead**. That is a **proposed change**, not a silently adopted contributor rule.
- Rust/WASM, a framework-independent experience runtime, WebGPU/WebGL2 fallback validation, a full scene editor, and production-ready demo ports are **not implemented**.

Keep the existing Envelope Reveal distribution and DOM-only dependency boundary working throughout this work.

## Shared vocabulary

- **Experience:** An interactive presentation with rendering and behavior, such as Paper Theater or Gallery Walk.
- **Content:** User- or application-supplied words, media references, and semantic data. Content is not owned by FrilCraft.
- **Config:** Validated presentation options specific to an experience: layout, appearance, motion, navigation, camera, and optional behavior.
- **Definition:** The experience's stable ID, version, defaults, validation, capabilities, and lazy implementation entry.
- **Runtime:** Owns the running experience's lifecycle, updates, input wiring, rendering resources, and cleanup.
- **Adapter:** A thin integration layer for a framework, such as React; it must not recreate the engine.
- **Playground:** A consumer and editing/testing tool; never a runtime dependency of an experience.

**Keep content, configuration, transient editor state, and GPU state separate.**

- Publishable document: content references and a pinned experience/config version.
- Editor-only state: selected node, active gizmo, undo/redo history, panel state.
- Runtime-only state: Canvas, renderer, GPU buffers, loaded textures, animation frame handles.

## Proposed dependency direction

```text
FrilStudio or another application (product-owned data, auth, RSVP, publishing)
                   |                      |
             Vanilla API             React Adapter
                   \                      /
                    v                    v
                FrilCraft Experience Runtime
                          |
             +------------+-------------+
             |                          |
       DOM/CSS experiences        Vanilla Three.js runtime
                                       |
                                 WebGPU / WebGL2
             |
       Pure data/config, editing commands, motion/layout helpers
             |
       Optional Rust/WASM calculation module (only if justified)
```

The diagram illustrates **conceptual dependencies**, not a directory tree or implemented exports.

Rules:

1. The core experience contract must not import React, R3F, Drei, Three.js, FrilStudio, or Playground.
2. A reusable **Three.js runtime** must not import React. React integration wraps its explicit lifecycle.
3. DOM-only components may remain React-first where a Vanilla rewrite adds no user value; they must not require Three.js, a GPU Stage, or WASM.
4. Do not make both Vanilla Three.js and R3F renderers for the same experience by default; that would duplicate behavior.
5. Use Three.js for meshes, loaders, cameras, materials, and GPU rendering. R3F/Drei are **not required by the proposed new 3D runtime**. Existing R3F demos remain source references until deliberately ported.
6. Prefer available Three.js add-ons (for example OrbitControls, TransformControls, GLTFLoader) rather than immediately reimplementing them.
7. Rust/WASM is **optional**, focused on measurable spatial/layout/motion workloads. Small calculations should stay in TypeScript unless profiling justifies a boundary.
8. Choose/verify WebGPU and WebGL2 capabilities per browser; do not promise transparent parity for every material, postprocessing feature, or device.
9. Keep Stage ownership explicit: no nested Canvas or implicit renderer allocation, and disposal must release owned resources.

The present Stage/View RFC is **type-only**. Do not implement a generic multi-view engine until a real experience requires it.

## Proposed contracts (illustrative, not shipped)

The host chooses an experience by `id`, pins a `version`, and passes `content` and `config` separately. A published version must remain resolvable (or be explicitly migrated); changing a version label without keeping compatible behavior is not sufficient.

```ts
type ExperienceDocument<TContent, TConfig> = {
  schemaVersion: 1;                 // Format of this document
  experienceId: string;             // e.g. "paper-theater"
  experienceVersion: string;        // e.g. "1.0.0"; pinned
  content: TContent;
  config: TConfig;
};

// Intended framework-neutral runtime shape; exact signatures are still open.
type ExperienceHandle<TContent, TConfig> = {
  update(next: { content: TContent; config: TConfig }): void;
  dispose(): void;
};

type ExperienceDefinition<TContent, TConfig> = {
  id: string;
  version: string;
  defaultConfig: TConfig;
  parseContent(value: unknown): TContent;
  parseConfig(value: unknown): TConfig;
};
```

Example host usage after the runtime exists:

```ts
// Illustrative only. These exports do not exist yet.
const experience = await createExperience({
  id: "paper-theater",
  target: document.getElementById("experience")!,
  content: myContent,
  config: myConfig,
});
experience.update({ content: revisedContent, config: revisedConfig });
experience.dispose();
```

The optional React adapter should create/dispose the **same runtime** on mount/unmount and forward prop updates. It must handle StrictMode remounts safely. It is not a second rendering implementation.

### Scene documents are not universal mesh trees

A future 3D scene may have a hierarchical node model with local `position`, `rotation`, `scale`, parent IDs, assets, camera targets, and motion tracks. Paper Theater may instead have ordered phases and CSS paper layers.

Share **commands and concepts** where useful; do not require every experience to serialize itself as Three.js meshes.

For 3D, distinguish:

- **Local transform vs. world transform** and parent/child relationships.
- **Pivot** (rotation center), **radius/path** (where an object moves), and **camera target** (what the viewer looks at).
- **Auto**, **relative override**, and **manual** placement. A template may choose which modes to expose.
- **Time/progress-driven motion** (deterministic seek and reverse) vs. realtime decoration.
- Input bounds and validation before any configuration is accepted or stored.

## What to extract from the existing demos

Treat each demo as a **behavior specification and tested reference**, not an application to copy wholesale.

1. [demo-test](https://github.com/mors119/demo-test) — Gallery Walk **and editor reference**. Inspect `src/scene/config.ts` (versioning, normalization), `src/scene/history.ts` (undo/redo), `src/scene/layout.ts` (wall auto-placement/camera stops), `src/editor/` (hierarchy, selection, inspector, gizmos), and `src/viewer/`. Extract pure commands and tests; **keep gallery wall constraints and Leva UI out of generic core**.
2. [demo-test2](https://github.com/mors119/demo-test2) — 3D book page state, fold/turn mechanics, front/back page content, camera transitions. Preserve DOM-on-paper behavior, not its fixed wedding fixture.
3. [demo-test3](https://github.com/mors119/demo-test3) — Camera path/progress, clouds, in-world gallery layout, direct scene actions. Separate navigation algorithms from sanctuary artwork.
4. [demo-test4](https://github.com/mors119/demo-test4) — Solar journey, orbit/planet placement, lazy asset initialization, interaction targets, input de-duplication. Keep planet-to-action mappings configurable and product actions external.
5. [demo-test5](https://github.com/mors119/demo-test5) — Paper Theater's ordered phases, fold-swap-unfold state machine, paper layers, direct click-to-detail, keyboard/touch, reduced motion. Start here for the first complete reusable experience.

Before porting a demo, capture its user-visible behaviors and existing tests. Preserve working behavior while removing fixtures, product integration, and unnecessary controls.

## Delivery slices: finish one thing before starting another

A slice is **done** only when its public API, actual example, automated tests, manual interaction check, documentation, and relevant isolated consumer build are complete. Don't mark planned features as shipped.

### Slice 0 — Architecture agreement (this PR)

- Review this proposal, keep current implemented behavior unchanged.
- Confirm which APIs must be framework-neutral and which DOM components may remain React-only.
- Make an extraction checklist from demo-test and demo-test5.
- **Done when:** the maintainers agree on boundaries and the first implementation issue is actionable.

### Slice 1 — Complete Paper Theater experience

- Extract demo-test5's data-driven phases, fold/swap/unfold logic, direct phase detail interaction, and responsive/reduced-motion behaviors.
- Separate fixtures from the reusable presentation and validate a versioned config.
- Expose editable properties and real preview in Playground; support JSON export/import of settings.
- Keep existing React DOM component conventions if appropriate. Do **not** block this DOM milestone on a new GPU runtime or Rust.
- **Done when:** two unrelated content fixtures render correctly, configuration edits survive export/import, navigation and accessibility match the demo, and an isolated consumer runs the component.

### Slice 2 — Reusable editing foundations from demo-test

- Extract pure editing commands and history first: create/update/remove/reorder, selection contract, commit/undo/redo, validation.
- Distinguish editable document data from transient editor UI state.
- Adapt hierarchy and inspector UI in Playground only where a real experience uses it.
- **Done when:** the same tested command/history logic edits at least two different document shapes without Gallery-specific imports, and saving/loading preserves each document.

### Slice 3 — Minimal framework-neutral Three.js runtime

- One Canvas / Renderer per explicit host Stage; mount, update, resize, dispose.
- Render a primitive scene; support transforms and camera, pointer cleanup, resize and context-error handling.
- Provide a Vanilla API **and** a thin React adapter against the same runtime, without R3F or Drei.
- Verify WebGPU startup and WebGL2 fallback on supported target environments. Document actual supported capabilities; no blanket parity claim.
- **Done when:** identical scene settings render in a Vanilla page and React page, remount/dispose tests pass, and ordinary DOM consumers do not load GPU code.

### Slice 4 — Gallery Walk as the 3D editor proof

- Port a small representative Gallery scene through the shared 3D runtime.
- Preserve auto placement, add relative/manual transform editing and pivot/camera controls as needed.
- Wire demo-test's inspector/history patterns without importing the demo application.
- **Done when:** place/edit/undo/redo/export/import/reload and guided viewing work in Playground and an isolated consumer.

### Slice 5 — Remaining experiences, one by one

- Popup Storybook, Cloud Sanctuary, Solar Journey: each new experience must contribute only genuinely shared helpers to core.
- Reuse existing motion, content, actions, and lifecycle contracts; add template-specific extensions where necessary.
- **Done when:** each port meets the same real-example, test, accessibility, cleanup, and distribution gate.

### Slice 6 — Optional Rust/WASM evaluation

- Identify a measured hotspot (e.g. large batch spatial layout or deterministic motion evaluation).
- Compare a plain TypeScript baseline against batched WASM calls under the same conditions.
- Keep WASM lazy/optional; account for bundle size, initialization, memory transfer, and fallback.
- **Done when:** a reproducible benchmark and consumer test justify the extra dependency. Otherwise, retain TypeScript.

## How FrilStudio uses this (without coupling development)

FrilStudio is a **separate product track**. It owns accounts, events, authorization, media uploads, RSVP persistence, commercial rules, and publishing. It can later map public-safe content into a FrilCraft experience and store a pinned `experienceId + experienceVersion + config`.

FrilCraft **does not** fetch FrilStudio data, submit RSVPs, or expose private event records. Instead it can emit a semantic action such as `"open-details"`, `"open-map"`, or `"rsvp"`; the host decides what that means.

**Independence test:** A developer can use a FrilCraft experience with fictional, non-wedding content in a separate Vanilla or React project without connecting to FrilStudio.

## First implementation issue after this proposal

**Title:** `feat(experience): extract configurable Paper Theater with a versioned contract`

**Scope:**
- Create the smallest shared content/config/version contract needed by Paper Theater (do not build a universal mesh schema).
- Port the demo-test5 behavior without changing its verified navigation UX.
- Move fixtures outside reusable runtime code; demonstrate two distinct content sets.
- Add Playground property controls and import/export settings.
- Add focused tests, accessibility checks, cleanup, and isolated consumer verification.

**Not in scope:** FrilStudio integration, generic 3D editor, Rust/WASM, new GPU Stage, multi-view rendering, or porting all five demos.

## Questions to resolve in review

1. Should the first 3D runtime target a single Stage/Scene before multi-view work? **Recommendation: yes.**
2. Should every React-only DOM component be rewritten for Vanilla? **Recommendation: no; require portability only where it provides value.**
3. Is Rust/WASM required for the first 3D experience? **Recommendation: no; benchmark a concrete workload later.**
4. When should existing R3F guidance be updated? **After approval of this architecture proposal, in a follow-up implementation/change to `AGENTS.md` and [Rendering Foundations](rendering-foundations.md).**

## Related documents

- [Current architecture and source map](project-map.md)
- [Current rendering design contract (type-only)](rendering-foundations.md)
- [How to add an existing React component](../adding-components.md)

**This PR is documentation only.** It does not add packages, modify component exports, install a renderer, or change any existing behavior.
