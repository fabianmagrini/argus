import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import TeamDetail from "../../src/pages/team-detail";

vi.mock("@argus/api-client-react", () => ({
  useGetTeam: vi.fn(),
  useGetDoraMetrics: vi.fn(),
  useGetFlowMetrics: vi.fn(),
  getGetTeamQueryKey: vi.fn(() => ["team"]),
  getGetDoraMetricsQueryKey: vi.fn(() => ["dora"]),
  getGetFlowMetricsQueryKey: vi.fn(() => ["flow"]),
  getListTeamsQueryKey: vi.fn(() => ["teams"]),
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
  };
});

import { useGetTeam, useGetDoraMetrics, useGetFlowMetrics } from "@argus/api-client-react";

const mockGetTeam = vi.mocked(useGetTeam);
const mockGetDora = vi.mocked(useGetDoraMetrics);
const mockGetFlow = vi.mocked(useGetFlowMetrics);

const team = {
  id: 1,
  name: "Platform",
  description: "Core infrastructure",
  timezone: "UTC",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const doraData = {
  deploymentFrequency: { value: 2.1, unit: "deploys/day", rating: "elite", trend: 0.05, trendDirection: "up" },
  leadTimeForChanges: { value: 0.8, unit: "hours", rating: "elite", trend: -0.1, trendDirection: "down" },
  changeFailureRate: { value: 0.04, unit: "ratio", rating: "elite", trend: -0.02, trendDirection: "down" },
  meanTimeToRecovery: { value: 0.5, unit: "hours", rating: "elite", trend: -0.05, trendDirection: "down" },
};

const flowData = {
  avgCycleTimeDays: 1.5,
  medianCycleTimeDays: 1.2,
  throughputPerWeek: 8.3,
  wipCount: 4,
  prMergeRate: 0.87,
  avgPrSize: 145,
  reviewTurnaroundHours: 0,
};

describe("TeamDetail page", () => {
  beforeEach(() => {
    mockGetDora.mockReturnValue({ data: undefined, isLoading: false } as any);
    mockGetFlow.mockReturnValue({ data: undefined, isLoading: false } as any);
  });

  it("shows loading skeletons while fetching team", () => {
    mockGetTeam.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<TeamDetail />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders the team name when loaded", () => {
    mockGetTeam.mockReturnValue({ data: team, isLoading: false } as any);
    renderWithProviders(<TeamDetail />);
    expect(screen.getByRole("heading", { name: "Platform" })).toBeInTheDocument();
  });

  it("renders the team description", () => {
    mockGetTeam.mockReturnValue({ data: team, isLoading: false } as any);
    renderWithProviders(<TeamDetail />);
    expect(screen.getByText("Core infrastructure")).toBeInTheDocument();
  });

  it("renders the DORA Metrics card", () => {
    mockGetTeam.mockReturnValue({ data: team, isLoading: false } as any);
    mockGetDora.mockReturnValue({ data: doraData, isLoading: false } as any);
    renderWithProviders(<TeamDetail />);
    expect(screen.getByText("DORA Metrics")).toBeInTheDocument();
  });

  it("renders DORA metric row labels", () => {
    mockGetTeam.mockReturnValue({ data: team, isLoading: false } as any);
    mockGetDora.mockReturnValue({ data: doraData, isLoading: false } as any);
    renderWithProviders(<TeamDetail />);
    expect(screen.getByText(/deployment frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/lead time for changes/i)).toBeInTheDocument();
    expect(screen.getByText(/change failure rate/i)).toBeInTheDocument();
    expect(screen.getByText(/mean time to recovery/i)).toBeInTheDocument();
  });

  it("renders the Flow Metrics card", () => {
    mockGetTeam.mockReturnValue({ data: team, isLoading: false } as any);
    mockGetFlow.mockReturnValue({ data: flowData, isLoading: false } as any);
    renderWithProviders(<TeamDetail />);
    expect(screen.getByText("Flow Metrics")).toBeInTheDocument();
  });

  it("renders flow metric row labels", () => {
    mockGetTeam.mockReturnValue({ data: team, isLoading: false } as any);
    mockGetFlow.mockReturnValue({ data: flowData, isLoading: false } as any);
    renderWithProviders(<TeamDetail />);
    expect(screen.getByText(/avg cycle time/i)).toBeInTheDocument();
    expect(screen.getByText(/throughput/i)).toBeInTheDocument();
    expect(screen.getByText(/wip count/i)).toBeInTheDocument();
  });
});
