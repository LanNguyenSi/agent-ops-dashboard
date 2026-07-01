import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventFilters } from "@/components/activity/EventFilters";
import type { ActivityFilters } from "@/components/activity/useActivityStream";

// jsdom does not implement scrollIntoView; the underlying Select component
// calls it when the listbox opens.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("EventFilters", () => {
  it("renders agent option labels using agentNames when provided, else a sliced id", async () => {
    const onChange = vi.fn();
    render(
      <EventFilters
        filters={{}}
        onChange={onChange}
        agentIds={["12345678abcd", "aaaaaaaabbbb"]}
        agentNames={{ "12345678abcd": "Lava" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /All Agents/i }));

    expect(screen.getByText("Lava")).toBeInTheDocument();
    // No override for the second id -> falls back to id.slice(0, 8) + "…"
    expect(screen.getByText("aaaaaaaa…")).toBeInTheDocument();
  });

  it("calls onChange with the selected agentId, preserving other filters", () => {
    const onChange = vi.fn();
    const filters: ActivityFilters = { eventType: "agent.heartbeat" };
    render(
      <EventFilters filters={filters} onChange={onChange} agentIds={["12345678abcd"]} />
    );

    fireEvent.click(screen.getByRole("button", { name: /All Agents/i }));
    fireEvent.click(screen.getByText("12345678…"));

    expect(onChange).toHaveBeenCalledWith({
      eventType: "agent.heartbeat",
      agentId: "12345678abcd",
    });
  });

  it("calls onChange with agentId: undefined when 'All Agents' is (re)selected", () => {
    const onChange = vi.fn();
    const filters: ActivityFilters = { agentId: "12345678abcd" };
    render(
      <EventFilters filters={filters} onChange={onChange} agentIds={["12345678abcd"]} />
    );

    // Open the agent select (shows the currently-selected id's label as trigger text)
    fireEvent.click(screen.getByRole("button", { name: /12345678…/i }));
    fireEvent.click(screen.getByText("All Agents"));

    expect(onChange).toHaveBeenCalledWith({ agentId: undefined });
  });

  it("calls onChange with the selected eventType", () => {
    const onChange = vi.fn();
    render(<EventFilters filters={{}} onChange={onChange} agentIds={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /All Event Types/i }));
    fireEvent.click(screen.getByText("agent.registered"));

    expect(onChange).toHaveBeenCalledWith({ eventType: "agent.registered" });
  });
});
