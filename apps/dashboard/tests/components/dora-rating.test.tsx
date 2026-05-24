import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoraRatingBadge } from "../../src/components/dora-rating";

describe("DoraRatingBadge", () => {
  it("renders nothing when rating is undefined", () => {
    const { container } = render(<DoraRatingBadge />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    ["elite", "Elite"],
    ["high", "High"],
    ["medium", "Medium"],
    ["low", "Low"],
  ] as const)("renders label for rating=%s", (rating, label) => {
    render(<DoraRatingBadge rating={rating} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("applies elite purple colour class", () => {
    const { container } = render(<DoraRatingBadge rating="elite" />);
    expect(container.firstChild).toHaveClass("text-purple-500");
  });

  it("applies high emerald colour class", () => {
    const { container } = render(<DoraRatingBadge rating="high" />);
    expect(container.firstChild).toHaveClass("text-emerald-500");
  });

  it("applies medium amber colour class", () => {
    const { container } = render(<DoraRatingBadge rating="medium" />);
    expect(container.firstChild).toHaveClass("text-amber-500");
  });

  it("applies low red colour class", () => {
    const { container } = render(<DoraRatingBadge rating="low" />);
    expect(container.firstChild).toHaveClass("text-red-500");
  });

  it("applies sm size class", () => {
    const { container } = render(<DoraRatingBadge rating="elite" size="sm" />);
    expect(container.firstChild).toHaveClass("text-xs");
  });

  it("applies lg size class", () => {
    const { container } = render(<DoraRatingBadge rating="elite" size="lg" />);
    expect(container.firstChild).toHaveClass("text-base");
  });

  it("defaults to md size", () => {
    const { container } = render(<DoraRatingBadge rating="high" />);
    expect(container.firstChild).toHaveClass("text-sm");
  });
});
