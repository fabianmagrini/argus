import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Dora from "../../src/pages/dora";

vi.mock("@argus/api-client-react", () => ({
  useGetDoraMetrics: vi.fn(),
  useGetDoraTimeseries: vi.fn(),
  useListTeams: vi.fn(),
}));

import { useGetDoraMetrics, useGetDoraTimeseries, useListTeams } from "@argus/api-client-react";

const mockDora = vi.mocked(useGetDoraMetrics);
const mockTimeseries = vi.mocked(useGetDoraTimeseries);
const mockTeams = vi.mocked(useListTeams);

const doraData = {
  deploymentFrequency: { value: 2.1, unit: "deploys/day", rating: "elite", trend: 0.05, trendDirection: "up" },
  leadTimeForChanges: { value: 0.8, unit: "hours", rating: "elite", trend: -0.1, trendDirection: "down" },
  changeFailureRate: { value: 0.04, unit: "ratio", rating: "elite", trend: -0.02, trendDirection: "down" },
  meanTimeToRecovery: { value: 0.5, unit: "hours", rating: "elite", trend: -0.05, trendDirection: "down" },
};

describe("DORA Metrics page", () => {
  beforeEach(() => {
    mockTimeseries.mockReturnValue({ data: [], isLoading: false } as any);
    mockTeams.mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("renders the DORA Metrics heading", () => {
    mockDora.mockReturnValue({ data: undefined, isLoading: true } as any);
    renderWithProviders(<Dora />);
    expect(screen.getByRole("heading", { name: /dora metrics/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockDora.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Dora />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders all four metric card titles", () => {
    mockDora.mockReturnValue({ data: doraData, isLoading: false } as any);
    renderWithProviders(<Dora />);
    expect(screen.getByText(/deployment frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/lead time for changes/i)).toBeInTheDocument();
    expect(screen.getByText(/change failure rate/i)).toBeInTheDocument();
    expect(screen.getByText(/mean time to recovery/i)).toBeInTheDocument();
  });

  it("renders metric values", () => {
    mockDora.mockReturnValue({ data: doraData, isLoading: false } as any);
    renderWithProviders(<Dora />);
    expect(screen.getByText("2.1")).toBeInTheDocument();
    expect(screen.getByText("0.8")).toBeInTheDocument();
  });

  it("renders a team selector", () => {
    mockDora.mockReturnValue({ data: undefined, isLoading: false } as any);
    renderWithProviders(<Dora />);
    expect(screen.getByText(/all teams/i)).toBeInTheDocument();
  });
});
