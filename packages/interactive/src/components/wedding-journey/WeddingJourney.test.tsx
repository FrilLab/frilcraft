import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeddingJourney } from "./WeddingJourney.js";

const artwork = {
  landscape: "/garden.webp",
  portrait: "/garden-portrait.webp",
  guestWalkCycle: "/guest.webp",
  couple: "/couple.webp",
  foreground: "/foreground.webp",
};

describe("WeddingJourney", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 12));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("opens the invitation from the skip link and keeps the couple details and existing anchors", async () => {
    const user = userEvent.setup();
    const { container } = render(<WeddingJourney
      names="Mina & Joon"
      invitationTitle="A garden wedding"
      startsAt="2027-03-04T05:30:00.000Z"
      timezone="Asia/Seoul"
      venueName="The Garden Hall"
      venueAddress="Seoul, Korea"
      locale="ko"
      scheduleHref="#event-schedule"
      mapHref="#event-venues"
      rsvpHref="#event-rsvp"
      galleryHref="#event-gallery"
      artwork={artwork}
    />);

    expect(screen.getByRole("region", { name: "신랑 신부를 만나러 가는 길" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /초대장 바로 보기/ }));

    const invitation = container.querySelector(".fc-wedding-journey__invitation");
    expect(invitation).toHaveFocus();
    expect(invitation).toHaveTextContent("Mina & Joon");
    expect(invitation).toHaveTextContent("A garden wedding");
    expect(invitation).toHaveTextContent("2027년 3월 4일 오후 2:30");
    expect(invitation).toHaveTextContent("The Garden Hall");
    expect(screen.getByRole("link", { name: /참석 여부/ })).toHaveAttribute("href", "#event-rsvp");
    expect(screen.getByRole("link", { name: /장소 안내/ })).toHaveAttribute("href", "#event-venues");
    expect(screen.getByRole("link", { name: /사진 보기/ })).toHaveAttribute("href", "#event-gallery");

    await user.click(screen.getByRole("button", { name: "초대장을 접고 정원으로 돌아가기" }));
    expect(screen.getByRole("button", { name: "초대장 펼쳐 보기" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "초대장 펼쳐 보기" }));
    expect(container.querySelector(".fc-wedding-journey__invitation")).toBeInTheDocument();
  });

  it("moves with keyboard and touch, honors focus, and cancels its frame on unmount", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(
      <StrictMode><WeddingJourney locale="en" artwork={artwork} /></StrictMode>,
    );
    const stage = container.querySelector<HTMLElement>("[data-template='wedding-journey']")!;
    const player = container.querySelector<HTMLElement>(".fc-wedding-journey__character-layer")!;

    await user.tab();
    expect(stage).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(player).toHaveClass("is-walking");

    fireEvent.pointerDown(stage, { pointerType: "touch", pointerId: 7, clientX: 700, clientY: 460 });
    expect(player).toHaveClass("is-walking");

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(12);
  });

  it("opens the invitation as a fallback when the garden artwork fails", () => {
    const { container } = render(<WeddingJourney locale="en" artwork={artwork} />);
    fireEvent.error(container.querySelector(".fc-wedding-journey__background-layer img")!);

    expect(container.querySelector(".fc-wedding-journey__invitation")).toBeInTheDocument();
    expect(screen.getByText("The Garden Hall")).toBeInTheDocument();
  });
});
