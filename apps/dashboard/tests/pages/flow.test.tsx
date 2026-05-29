import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Flow from "../../src/pages/flow";

vi.mock("@argus/api-client-react", () => ({
  useGetFlowMetrics: vi.fn(),
  useListTeams: vi.fn(),
}));

import { useGetFlowMetrics, useListTeams } from "@argus/api-client-react";

const mockFlow = vi.mocked(useGetFlowMetrics);
const mockTeams = vi.mocked(useListTeams);

const flowData = {
  avgCycleTimeDays: 1.5,
  medianCycleTimeDays: 1.2,
  throughputPerWeek: 8.3,
  wipCount: 4,
  prMergeRate: 0.87,
  avgPrSize: 145,
  reviewTurnaroundHours: 0,
};

describe("Flow Metrics page", () => {
  beforeEach(() => {
    mockTeams.mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("renders the Flow Metrics heading", () => {
    mockFlow.mockReturnValue({ data: undefined, isLoading: true } as any);
    renderWithProviders(<Flow />);
    expect(screen.getByRole("heading", { name: /flow metrics/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockFlow.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Flow />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders all metric card titles", () => {
    mockFlow.mockReturnValue({ data: flowData, isLoading: false } as any);
    renderWithProviders(<Flow />);
    expect(screen.getByText(/avg cycle time/i)).toBeInTheDocument();
    expect(screen.getByText(/median cycle time/i)).toBeInTheDocument();
    expect(screen.getByText(/throughput/i)).toBeInTheDocument();
    expect(screen.getByText(/wip count/i)).toBeInTheDocument();
    expect(screen.getByText(/pr merge rate/i)).toBeInTheDocument();
  });

  it("renders WIP count value", () => {
    mockFlow.mockReturnValue({ data: flowData, isLoading: false } as any);
    renderWithProviders(<Flow />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders throughput value", () => {
    mockFlow.mockReturnValue({ data: flowData, isLoading: false } as any);
    renderWithProviders(<Flow />);
    expect(screen.getByText("8.3")).toBeInTheDocument();
  });

  it("renders a team selector", () => {
    mockFlow.mockReturnValue({ data: undefined, isLoading: false } as any);
    renderWithProviders(<Flow />);
    expect(screen.getByText(/all teams/i)).toBeInTheDocument();
  });

  it("shows dashes when no data", () => {
    mockFlow.mockReturnValue({ data: undefined, isLoading: false } as any);
    renderWithProviders(<Flow />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
