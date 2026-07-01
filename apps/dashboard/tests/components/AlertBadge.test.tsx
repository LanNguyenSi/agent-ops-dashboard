import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertBadge } from "@/components/AlertBadge";

describe("AlertBadge", () => {
  it("renders a severity badge when severity is provided", () => {
    render(<AlertBadge severity="critical" />);
    const badge = screen.getByText("Critical");
    expect(badge.className).toContain("bg-red-100");
  });

  it("renders a status badge when only status is provided", () => {
    render(<AlertBadge status="resolved" />);
    const badge = screen.getByText("Resolved");
    expect(badge.className).toContain("bg-green-100");
  });

  it("prefers severity over status when both are provided", () => {
    render(<AlertBadge severity="warning" status="resolved" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.queryByText("Resolved")).not.toBeInTheDocument();
  });

  it("renders nothing when neither severity nor status is provided", () => {
    const { container } = render(<AlertBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});
