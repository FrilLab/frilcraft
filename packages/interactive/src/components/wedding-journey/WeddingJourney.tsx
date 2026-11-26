/* eslint-disable react-refresh/only-export-components -- The component module also exports its public props and artwork types. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, PointerEvent as ReactPointerEvent } from "react";

export type WeddingJourneyLocale = "ko" | "en";

export type WeddingJourneyArtwork = {
  landscape: string;
  portrait: string;
  guestWalkCycle: string;
  couple: string;
  foreground: string;
};

export const DEFAULT_WEDDING_JOURNEY_ARTWORK: WeddingJourneyArtwork = {
  landscape: "/wedding-journey/garden-landscape.webp",
  portrait: "/wedding-journey/garden-portrait.webp",
  guestWalkCycle: "/wedding-journey/guest-walk-cycle.webp",
  couple: "/wedding-journey/couple.webp",
  foreground: "/wedding-journey/foreground-blooms.webp",
};

export interface WeddingJourneyProps {
  /** Display names already approved for the public invitation. */
  names?: string;
  invitationTitle?: string;
  startsAt?: string | null;
  timezone?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  heroImage?: { url: string; altText: string } | null;
  locale?: WeddingJourneyLocale;
  reducedMotion?: boolean;
  /** Existing public page anchors; no route or event data is created here. */
  scheduleHref?: string;
  mapHref?: string | null;
  rsvpHref?: string | null;
  galleryHref?: string | null;
  /** Consumers may host the component artwork at any same-origin asset path. */
  artwork?: Partial<WeddingJourneyArtwork>;
  /** Constrains the experience for a Studio or Playground preview surface. */
  preview?: boolean;
  id?: string;
}

type Point = { x: number; y: number };
type PathSample = Point & { distance: number };
type WorldSize = { width: number; height: number };
type WorldFrame = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  source: WorldSize;
};
type JourneyPhase = "journey" | "meeting" | "arrived";

const landscapeSize: WorldSize = { width: 1536, height: 1024 };
const portraitSize: WorldSize = { width: 1024, height: 1536 };

const paths: Record<"landscape" | "portrait", readonly Point[]> = {
  landscape: [
    { x: 780, y: 990 },
    { x: 875, y: 900 },
    { x: 1000, y: 795 },
    { x: 1040, y: 690 },
    { x: 1010, y: 625 },
    { x: 915, y: 585 },
    { x: 790, y: 600 },
    { x: 660, y: 590 },
    { x: 550, y: 525 },
    { x: 635, y: 455 },
    { x: 755, y: 385 },
    { x: 840, y: 350 },
    { x: 930, y: 340 },
  ],
  portrait: [
    { x: 505, y: 1505 },
    { x: 540, y: 1360 },
    { x: 500, y: 1225 },
    { x: 385, y: 1115 },
    { x: 300, y: 1005 },
    { x: 330, y: 900 },
    { x: 465, y: 805 },
    { x: 620, y: 700 },
    { x: 705, y: 605 },
    { x: 655, y: 535 },
    { x: 550, y: 465 },
    { x: 510, y: 420 },
  ],
};

const couplePositions: Record<"landscape" | "portrait", Point> = {
  landscape: { x: 950, y: 342 },
  portrait: { x: 510, y: 415 },
};

const bridgePositions: Record<"landscape" | "portrait", Point> = {
  landscape: { x: 920, y: 608 },
  portrait: { x: 710, y: 600 },
};

function catmullRom(points: readonly Point[], amount: number): Point {
  const position = Math.min(1, Math.max(0, amount)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position));
  const local = position >= points.length - 1 ? 1 : position - index;
  const first = points[Math.max(0, index - 1)]!;
  const second = points[index]!;
  const third = points[index + 1]!;
  const fourth = points[Math.min(points.length - 1, index + 2)]!;
  const interpolate = (a: number, b: number, c: number, d: number) => 0.5 * (
    2 * b + (-a + c) * local
    + (2 * a - 5 * b + 4 * c - d) * local ** 2
    + (-a + 3 * b - 3 * c + d) * local ** 3
  );
  return {
    x: interpolate(first.x, second.x, third.x, fourth.x),
    y: interpolate(first.y, second.y, third.y, fourth.y),
  };
}

function makePath(points: readonly Point[]): PathSample[] {
  const samples: PathSample[] = [];
  let distance = 0;
  let previous: Point | null = null;
  for (let index = 0; index <= 220; index += 1) {
    const point = catmullRom(points, index / 220);
    if (previous) distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ ...point, distance });
    previous = point;
  }
  return samples;
}

function pointAtDistance(samples: readonly PathSample[], distance: number): Point {
  const last = samples[samples.length - 1];
  if (!last) return { x: 0, y: 0 };
  const target = Math.min(last.distance, Math.max(0, distance));
  let upperIndex = samples.findIndex((sample) => sample.distance >= target);
  if (upperIndex <= 0) return samples[0] ?? { x: 0, y: 0 };
  if (upperIndex < 0) upperIndex = samples.length - 1;
  const lower = samples[upperIndex - 1]!;
  const upper = samples[upperIndex]!;
  const span = upper.distance - lower.distance || 1;
  const ratio = (target - lower.distance) / span;
  return {
    x: lower.x + (upper.x - lower.x) * ratio,
    y: lower.y + (upper.y - lower.y) * ratio,
  };
}

function nearestPathDistance(
  samples: readonly PathSample[],
  point: Point,
  around?: number,
  searchRadius = Number.POSITIVE_INFINITY,
) {
  let closest = samples[0];
  let smallest = Number.POSITIVE_INFINITY;
  for (const sample of samples) {
    if (around !== undefined && Math.abs(sample.distance - around) > searchRadius) continue;
    const distance = (sample.x - point.x) ** 2 + (sample.y - point.y) ** 2;
    if (distance < smallest) {
      smallest = distance;
      closest = sample;
    }
  }
  return closest?.distance ?? 0;
}

function imageFrame(width: number, height: number, source: WorldSize): WorldFrame {
  const safeWidth = width || source.width;
  const safeHeight = height || source.height;
  const scale = Math.max(safeWidth / source.width, safeHeight / source.height);
  return {
    width: safeWidth,
    height: safeHeight,
    scale,
    offsetX: (safeWidth - source.width * scale) / 2,
    offsetY: (safeHeight - source.height * scale) / 2,
    source,
  };
}

function stagePoint(point: Point, frame: WorldFrame): Point {
  return {
    x: frame.offsetX + point.x * frame.scale,
    y: frame.offsetY + point.y * frame.scale,
  };
}

function formatEventDate(value: string | null | undefined, locale: WeddingJourneyLocale, timezone: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
      timeZone: timezone,
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return null;
  }
}

function arrowDirection(key: string): Point | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w": return { x: 0, y: -1 };
    case "arrowdown":
    case "s": return { x: 0, y: 1 };
    case "arrowleft":
    case "a": return { x: -1, y: 0 };
    case "arrowright":
    case "d": return { x: 1, y: 0 };
    default: return null;
  }
}

export function WeddingJourney({
  names = "Jisoo & Minseo",
  invitationTitle = "Wedding Invitation",
  startsAt = "2027-05-16T05:00:00.000Z",
  timezone = "Asia/Seoul",
  venueName = "The Garden Hall",
  venueAddress = "Seoul, Korea",
  heroImage = null,
  locale = "en",
  reducedMotion = false,
  scheduleHref = "#event-schedule",
  mapHref = "#event-venues",
  rsvpHref,
  galleryHref,
  artwork,
  preview = false,
  id = "wedding-journey",
}: WeddingJourneyProps) {
  const assets = { ...DEFAULT_WEDDING_JOURNEY_ARTWORK, ...artwork };
  const stageRef = useRef<HTMLElement>(null);
  const invitationRef = useRef<HTMLElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<WorldFrame | null>(null);
  const playerDistanceRef = useRef(0);
  const targetDistanceRef = useRef(0);
  const meetingTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<JourneyPhase>("journey");
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [playerDistance, setPlayerDistance] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [frame, setFrame] = useState<WorldFrame | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasArtwork, setHasArtwork] = useState(true);
  const [foregroundAvailable, setForegroundAvailable] = useState(true);
  const [coupleAvailable, setCoupleAvailable] = useState(true);
  const [invitationImageFailed, setInvitationImageFailed] = useState(false);
  const [returnVisible, setReturnVisible] = useState(false);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const artKey = isPortrait ? "portrait" : "landscape";
  const sourceSize = isPortrait ? portraitSize : landscapeSize;
  const samples = useMemo(() => makePath(paths[artKey]), [artKey]);
  const pathLength = samples[samples.length - 1]?.distance ?? 0;
  const coupleWorldPosition = couplePositions[artKey];
  const bridgeWorldPosition = bridgePositions[artKey];
  const dateLabel = formatEventDate(startsAt, locale, timezone);
  const isKorean = locale === "ko";
  const shouldReduceMotion = reducedMotion || prefersReducedMotion;
  const canExplore = phase === "journey" || (phase === "arrived" && !invitationOpen);

  const currentPosition = pointAtDistance(samples, playerDistance);
  const beforePosition = pointAtDistance(samples, Math.max(0, playerDistance - 8));
  const afterPosition = pointAtDistance(samples, Math.min(pathLength, playerDistance + 8));
  const directionAngle = Math.atan2(afterPosition.y - beforePosition.y, afterPosition.x - beforePosition.x) * 180 / Math.PI + 90;
  const meetingPosition = frame ? stagePoint(coupleWorldPosition, frame) : null;
  const bridgeScreenPosition = frame ? stagePoint(bridgeWorldPosition, frame) : null;
  const playerScreenPosition = frame ? stagePoint(currentPosition, frame) : null;
  const playerHeight = frame
    ? Math.max(46, sourceSize.height * 0.104 * frame.scale * (0.78 + 0.32 * currentPosition.y / sourceSize.height))
    : 0;
  const playerWidth = playerHeight * 0.78;
  const coupleHeight = frame ? sourceSize.height * 0.1 * frame.scale : 0;
  const progressRatio = pathLength > 0 ? playerDistance / pathLength : 0;
  const progressStatus = isKorean
    ? progressRatio > 0.78 ? "아치가 가까워졌어요." : progressRatio > 0.48 ? "꽃향기를 따라 작은 다리를 건너요." : "정원 길을 따라 걷고 있어요."
    : progressRatio > 0.78 ? "The wedding arch is close now." : progressRatio > 0.48 ? "Crossing the little bridge among the flowers." : "Wandering through the garden.";
  const status = statusOverride ?? progressStatus;

  const startMovementTo = useCallback((distance: number) => {
    if (!canExplore || pathLength <= 0) return;
    const nextDistance = Math.min(pathLength, Math.max(0, distance));
    targetDistanceRef.current = nextDistance;
    setIsMoving(Math.abs(nextDistance - playerDistanceRef.current) > 3);
  }, [canExplore, pathLength]);

  const beginArrival = useCallback(() => {
    setIsMoving(false);
    setInvitationOpen(true);
    setPhase("meeting");
    setStatusOverride(isKorean ? "드디어 만났어요. 초대장을 펼치고 있습니다." : "You found us. The invitation is opening.");
    if (meetingTimerRef.current !== null) window.clearTimeout(meetingTimerRef.current);
    meetingTimerRef.current = window.setTimeout(() => setPhase("arrived"), shouldReduceMotion ? 80 : 1450);
  }, [isKorean, shouldReduceMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const width = bounds.width || window.innerWidth || 1024;
      const height = bounds.height || window.innerHeight || 768;
      const portrait = window.matchMedia?.("(max-width: 720px)").matches ?? width <= 720;
      const nextFrame = imageFrame(width, height, portrait ? portraitSize : landscapeSize);
      frameRef.current = nextFrame;
      setIsPortrait(portrait);
      setFrame(nextFrame);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!canExplore || !stage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = arrowDirection(event.key);
      if (!direction) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("a, button, input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      const currentDistance = playerDistanceRef.current;
      const current = pointAtDistance(samples, currentDistance);
      const candidate = {
        x: current.x + direction.x * 175,
        y: current.y + direction.y * 175,
      };
      let nextDistance = nearestPathDistance(samples, candidate, currentDistance, 310);
      if (Math.abs(nextDistance - currentDistance) < 26) {
        const before = pointAtDistance(samples, Math.max(0, currentDistance - 8));
        const after = pointAtDistance(samples, Math.min(pathLength, currentDistance + 8));
        const tangent = {
          x: after.x - before.x,
          y: after.y - before.y,
        };
        const dot = direction.x * tangent.x + direction.y * tangent.y;
        const forward = dot >= 0;
        nextDistance = currentDistance + (forward ? 150 : -150);
      }
      startMovementTo(nextDistance);
    };
    stage.addEventListener("keydown", handleKeyDown);
    return () => stage.removeEventListener("keydown", handleKeyDown);
  }, [canExplore, pathLength, samples, startMovementTo]);

  useEffect(() => {
    if (!isMoving || !canExplore) return;
    let frameId = 0;
    let previousTime = 0;
    let previousPaint = 0;
    const tick = (now: number) => {
      if (!previousTime) previousTime = now;
      const delta = Math.min(0.055, (now - previousTime) / 1000);
      previousTime = now;
      const current = playerDistanceRef.current;
      const target = targetDistanceRef.current;
      const difference = target - current;
      const next = current + Math.sign(difference) * Math.min(Math.abs(difference), 112 * delta);
      playerDistanceRef.current = next;
      if (now - previousPaint >= 1000 / 30 || Math.abs(difference) < 2) {
        previousPaint = now;
        setPlayerDistance(next);
      }
      if (Math.abs(target - next) <= 2) {
        playerDistanceRef.current = target;
        setPlayerDistance(target);
        setIsMoving(false);
        if (phase === "journey" && target >= pathLength - 2) beginArrival();
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [beginArrival, canExplore, isMoving, pathLength, phase]);

  useEffect(() => () => {
    if (meetingTimerRef.current !== null) window.clearTimeout(meetingTimerRef.current);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || phase !== "arrived" || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setReturnVisible(Boolean(entry && !entry.isIntersecting));
    }, { threshold: 0.24 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [phase]);

  useEffect(() => {
    if (phase !== "arrived") return;
    (invitationOpen ? invitationRef.current : reopenRef.current)?.focus({ preventScroll: true });
  }, [invitationOpen, phase]);

  const screenToWorld = (event: ReactPointerEvent<HTMLElement>) => {
    const currentFrame = frameRef.current;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!currentFrame || !bounds) return null;
    return {
      x: (event.clientX - bounds.left - currentFrame.offsetX) / currentFrame.scale,
      y: (event.clientY - bounds.top - currentFrame.offsetY) / currentFrame.scale,
    };
  };

  const moveToPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (!canExplore) return;
    const target = screenToWorld(event);
    if (!target) return;
    startMovementTo(nearestPathDistance(samples, target));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const element = event.target;
    if (element instanceof Element && element.closest("a, button")) return;
    if (event.pointerType !== "mouse") event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveToPointer(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.buttons === 0 || event.pointerType === "mouse" || !canExplore) return;
    moveToPointer(event);
  };

  const handleSkip = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    targetDistanceRef.current = pathLength;
    playerDistanceRef.current = pathLength;
    setPlayerDistance(pathLength);
    setIsMoving(false);
    setPhase("arrived");
    setInvitationOpen(true);
    setStatusOverride(isKorean ? "초대장을 바로 펼쳤습니다." : "The invitation is ready to open.");
  };

  const handleArtworkError = () => {
    setHasArtwork(false);
    setPhase("arrived");
    setInvitationOpen(true);
    setStatusOverride(isKorean ? "정원 그림을 열지 못해 초대장부터 보여 드립니다." : "The garden could not load, so the invitation is ready here.");
  };

  const playerStyle: CSSProperties & { "--direction-angle": string } = {
    left: playerScreenPosition?.x ?? 0,
    top: playerScreenPosition?.y ?? 0,
    width: playerWidth,
    height: playerHeight,
    zIndex: currentPosition.y > coupleWorldPosition.y ? 4 : 2,
    "--direction-angle": `${directionAngle}deg`,
  };
  const coupleStyle: CSSProperties = {
    left: meetingPosition?.x ?? 0,
    top: meetingPosition?.y ?? 0,
    height: coupleHeight,
    zIndex: currentPosition.y > coupleWorldPosition.y ? 3 : 2,
  };
  const butterflyStyle: CSSProperties = {
    left: bridgeScreenPosition ? bridgeScreenPosition.x - 46 : 0,
    top: bridgeScreenPosition ? bridgeScreenPosition.y - 84 : 0,
  };
  const cameraStyle: CSSProperties = {
    transformOrigin: frame && meetingPosition
      ? `${meetingPosition.x}px ${meetingPosition.y}px`
      : "50% 35%",
  };

  return (
    <section
      ref={stageRef}
      id={id}
      className={`fc-wedding-journey${preview ? " fc-wedding-journey--preview" : ""}`}
      data-phase={phase}
      data-template="wedding-journey"
      data-motion-reduced={shouldReduceMotion}
      aria-label={isKorean ? "신랑 신부를 만나러 가는 길" : "A walk to meet the couple"}
      aria-describedby={`${id}-instructions`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <div className={`fc-wedding-journey__world${hasArtwork ? "" : " is-fallback"}`} style={cameraStyle}>
        <picture className="fc-wedding-journey__background-layer">
          <source srcSet={assets.portrait} media="(max-width: 720px)" />
          <img src={assets.landscape} alt="" fetchPriority="high" onError={handleArtworkError} />
        </picture>
        <div className="fc-wedding-journey__environment-layer" />

        {frame && progressRatio > 0.44 && progressRatio < 0.72 ? (
          <svg
            className="fc-wedding-journey__bridge-ripples"
            aria-hidden="true"
            style={{ left: bridgeScreenPosition?.x, top: bridgeScreenPosition?.y }}
            viewBox="0 0 180 80"
          >
            <ellipse cx="90" cy="40" rx="30" ry="8" />
            <ellipse cx="90" cy="40" rx="54" ry="16" />
            <ellipse cx="90" cy="40" rx="78" ry="25" />
          </svg>
        ) : null}

        {frame ? (
          <button
            className="fc-wedding-journey__butterfly"
            type="button"
            style={butterflyStyle}
            aria-label={isKorean ? "나비를 따라 작은 다리까지 걷기" : "Follow the butterfly to the little bridge"}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              startMovementTo(pathLength * 0.58);
            }}
            tabIndex={canExplore ? 0 : -1}
          >
            <svg viewBox="0 0 48 40" aria-hidden="true">
              <path d="M23 19C14 4 3 7 8 19c3 7 10 6 15 3Zm2 0C34 4 45 7 40 19c-3 7-10 6-15 3Z" />
              <path d="M24 16v12M24 17c-2-5-5-6-7-7m7 7c2-5 5-6 7-7" />
            </svg>
          </button>
        ) : null}

        {meetingPosition && coupleAvailable ? (
          <img
            className={`fc-wedding-journey__couple-layer${phase === "meeting" || phase === "arrived" ? " is-revealed" : ""}`}
            src={assets.couple}
            alt=""
            style={coupleStyle}
            onError={() => setCoupleAvailable(false)}
          />
        ) : null}

        {frame && playerScreenPosition ? (
          <div className={`fc-wedding-journey__character-layer${isMoving ? " is-walking" : ""}`} style={playerStyle}>
            <img src={assets.guestWalkCycle} alt="" draggable={false} />
          </div>
        ) : null}

        {foregroundAvailable ? (
          <div className="fc-wedding-journey__foreground-layer">
            <img src={assets.foreground} alt="" draggable={false} onError={() => setForegroundAvailable(false)} />
            <img src={assets.foreground} alt="" draggable={false} onError={() => setForegroundAvailable(false)} />
          </div>
        ) : null}

        <div className={`fc-wedding-journey__effects-layer${phase === "meeting" || phase === "arrived" ? " is-celebrating" : ""}`}>
          {Array.from({ length: 14 }, (_, index) => (
            <span
              className="fc-wedding-journey__petal"
              key={index}
              style={{
                "--petal-index": index,
                "--petal-x": `${(index * 37 + 9) % 96}%`,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className="fc-wedding-journey__shade" aria-hidden="true" />
      <div className={`fc-wedding-journey__arrival-copy${phase === "meeting" || (phase === "arrived" && !invitationOpen) ? " is-visible" : ""}`} aria-hidden={phase === "journey" || invitationOpen}>
        <p>{isKorean ? "오늘, 저희가 기다리는 곳" : "AT THE END OF THIS LITTLE WALK"}</p>
        <h2>{names}</h2>
      </div>

      {phase === "journey" ? (
        <div className="fc-wedding-journey__arrival-heading">
          <p>{isKorean ? "A GARDEN INVITATION" : "A GARDEN INVITATION"}</p>
          <h1>{isKorean ? <>정원 끝에서<br />기다릴게요</> : <>A little walk<br />to meet us.</>}</h1>
        </div>
      ) : null}

      {phase === "journey" ? (
        <a className="fc-wedding-journey__skip" href={scheduleHref} onClick={handleSkip}>
          {isKorean ? "초대장 바로 보기" : "Skip to the invitation"}
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}

      {phase === "journey" ? (
        <p className="fc-wedding-journey__hint" id={`${id}-instructions`}>
          <span aria-hidden="true" className="fc-wedding-journey__hint-flower">✳</span>
          {isKorean ? "길을 터치하거나 방향키로 천천히 걸어 보세요" : "Tap the path or use the arrow keys to wander"}
        </p>
      ) : (
        <p className="fc-wedding-journey__instructions-sr" id={`${id}-instructions`}>
          {isKorean ? "방향키 또는 WASD로 정원을 다시 걸을 수 있습니다." : "Use the arrow keys or WASD to walk through the garden again."}
        </p>
      )}

      <p className="fc-wedding-journey__status-sr" role="status" aria-live="polite">{status}</p>

      {phase === "arrived" && invitationOpen ? (
        <article ref={invitationRef} tabIndex={-1} className="fc-wedding-journey__invitation" aria-labelledby={`${id}-invitation-title`}>
          <button
            className="fc-wedding-journey__fold"
            type="button"
            onClick={() => setInvitationOpen(false)}
            aria-label={isKorean ? "초대장을 접고 정원으로 돌아가기" : "Fold the invitation and return to the garden"}
          >
            <span aria-hidden="true">×</span>
          </button>
          <p className="fc-wedding-journey__invitation-eyebrow">{isKorean ? "초대합니다" : "WITH JOY IN OUR HEARTS"}</p>
          <h2 id={`${id}-invitation-title`}>{names}</h2>
          {invitationTitle ? <p className="fc-wedding-journey__invitation-title">{invitationTitle}</p> : null}
          {heroImage && !invitationImageFailed ? <img
            className="fc-wedding-journey__invitation-image"
            src={heroImage.url}
            alt={heroImage.altText}
            loading="lazy"
            onError={() => setInvitationImageFailed(true)}
          /> : null}
          <div className="fc-wedding-journey__invitation-rule" aria-hidden="true"><span /></div>
          {dateLabel ? <p className="fc-wedding-journey__invitation-date">{dateLabel}</p> : null}
          {venueName ? <p className="fc-wedding-journey__invitation-venue">{venueName}</p> : null}
          {venueAddress ? <p className="fc-wedding-journey__invitation-address">{venueAddress}</p> : null}
          <nav className="fc-wedding-journey__invitation-actions" aria-label={isKorean ? "초대장 정보" : "Invitation details"}>
            {rsvpHref ? <a href={rsvpHref}>{isKorean ? "참석 여부" : "RSVP"}<span aria-hidden="true">↗</span></a> : null}
            {mapHref ? <a href={mapHref}>{isKorean ? "장소 안내" : "Directions"}<span aria-hidden="true">↗</span></a> : null}
            {galleryHref ? <a href={galleryHref}>{isKorean ? "사진 보기" : "Gallery"}<span aria-hidden="true">↗</span></a> : null}
            <a className="is-primary" href={scheduleHref}>{isKorean ? "초대장 펼쳐 보기" : "Open invitation"}<span aria-hidden="true">→</span></a>
          </nav>
        </article>
      ) : null}

      {phase === "arrived" && !invitationOpen ? (
        <button ref={reopenRef} className="fc-wedding-journey__reopen" type="button" onClick={() => setInvitationOpen(true)}>
          {isKorean ? "초대장 펼쳐 보기" : "Open the invitation"}<span aria-hidden="true">↗</span>
        </button>
      ) : null}

      {returnVisible && phase === "arrived" ? (
        <a className="fc-wedding-journey__return" href={`#${id}`}>
          <span aria-hidden="true">⌃</span>{isKorean ? "정원으로 돌아가기" : "Return to the garden"}
        </a>
      ) : null}
    </section>
  );
}

