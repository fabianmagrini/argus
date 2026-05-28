import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Teams from "../../src/pages/teams";

vi.mock("@argus/api-client-react", () => ({
  useListTeams: vi.fn(),
  useGetTeamHealthMetrics: vi.fn(),
  useCreateTeam: vi.fn(),
  getListTeamsQueryKey: vi.fn(() => ["teams"]),
  getGetTeamHealthMetricsQueryKey: vi.fn(() => ["team-health"]),
}));

vi.mock("wouter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wouter")>();
  return {
    ...actual,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

import {
  useListTeams,
  useGetTeamHealthMetrics,
  useCreateTeam,
} from "@argus/api-client-react";

const mockListTeams = vi.mocked(useListTeams);
const mockHealthMetrics = vi.mocked(useGetTeamHealthMetrics);
const mockCreateTeam = vi.mocked(useCreateTeam);

const teams = [
  { id: 1, name: "Platform", description: "Core infra", timezone: "UTC", createdAt: new Date().toISOString() },
  { id: 2, name: "Frontend", description: "React apps", timezone: "UTC", createdAt: new Date().toISOString() },
];

const health = [
  { teamId: 1, teamName: "Platform", healthScore: 88, doraRating: "high", deploymentCount: 30, prCount: 20, incidentCount: 2, avgCycleTimeDays: 0.5 },
  { teamId: 2, teamName: "Frontend", healthScore: 62, doraRating: "medium", deploymentCount: 15, prCount: 18, incidentCount: 3, avgCycleTimeDays: 1.2 },
];

describe("Teams page", () => {
  beforeEach(() => {
    mockCreateTeam.mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  it("renders the Teams heading", () => {
    mockListTeams.mockReturnValue({ data: [], isLoading: false } as any);
    mockHealthMetrics.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Teams />);
    expect(screen.getByRole("heading", { name: /teams/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockListTeams.mockReturnValue({ data: undefined, isLoading: true } as any);
    mockHealthMetrics.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Teams />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a row for each team", () => {
    mockListTeams.mockReturnValue({ data: teams, isLoading: false } as any);
    mockHealthMetrics.mockReturnValue({ data: health, isLoading: false } as any);
    renderWithProviders(<Teams />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("shows health scores for each team", () => {
    mockListTeams.mockReturnValue({ data: teams, isLoading: false } as any);
    mockHealthMetrics.mockReturnValue({ data: health, isLoading: false } as any);
    renderWithProviders(<Teams />);
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText("62")).toBeInTheDocument();
  });

  it("renders a New Team button", () => {
    mockListTeams.mockReturnValue({ data: [], isLoading: false } as any);
    mockHealthMetrics.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Teams />);
    expect(screen.getByRole("button", { name: /new team/i })).toBeInTheDocument();
  });
});
