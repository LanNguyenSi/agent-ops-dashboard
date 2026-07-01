import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders the success label and green styling", () => {
    render(<StatusBadge status="success" />);
    const badge = screen.getByText("Success");
    expect(badge.className).toContain("bg-green-100");
  });

  it("renders the failure label and red styling", () => {
    render(<StatusBadge status="failure" />);
    const badge = screen.getByText("Failure");
    expect(badge.className).toContain("bg-red-100");
  });

  it("uses the md size classes by default", () => {
    render(<StatusBadge status="in_progress" />);
    const badge = screen.getByText("Running");
    expect(badge.className).toContain("px-3 py-1 text-sm");
  });

  it("uses the sm size classes when size='sm'", () => {
    render(<StatusBadge status="in_progress" size="sm" />);
    const badge = screen.getByText("Running");
    expect(badge.className).toContain("px-2 py-0.5 text-xs");
  });
});
