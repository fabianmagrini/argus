import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Leaderboard from "../../src/pages/leaderboard";

vi.mock("@argus/api-client-react", () => ({
  useGetTeamLeaderboard: vi.fn(),
}));

import { useGetTeamLeaderboard } from "@argus/api-client-react";

const mockLeaderboard = vi.mocked(useGetTeamLeaderboard);

const leaderboardData = [
  {
    rank: 1,
    teamId: 1,
    teamName: "Platform",
    score: 95,
    doraRating: "elite",
    deploymentFrequency: 2.1,
    leadTimeDays: 0.5,
    changeFailureRate: 0.04,
    recoveryTimeHours: 0.8,
  },
  {
    rank: 2,
    teamId: 2,
    teamName: "Frontend",
    score: 75,
    doraRating: "high",
    deploymentFrequency: 1.0,
    leadTimeDays: 0.9,
    changeFailureRate: 0.08,
    recoveryTimeHours: 2.5,
  },
];

describe("Leaderboard page", () => {
  it("renders the Performance Leaderboard heading", () => {
    mockLeaderboard.mockReturnValue({ data: undefined, isLoading: true } as any);
    renderWithProviders(<Leaderboard />);
    expect(screen.getByRole("heading", { name: /performance leaderboard/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockLeaderboard.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Leaderboard />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a row for each team", () => {
    mockLeaderboard.mockReturnValue({ data: leaderboardData, isLoading: false } as any);
    renderWithProviders(<Leaderboard />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("renders team scores", () => {
    mockLeaderboard.mockReturnValue({ data: leaderboardData, isLoading: false } as any);
    renderWithProviders(<Leaderboard />);
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("renders rank numbers", () => {
    mockLeaderboard.mockReturnValue({ data: leaderboardData, isLoading: false } as any);
    renderWithProviders(<Leaderboard />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders DORA rating badges", () => {
    mockLeaderboard.mockReturnValue({ data: leaderboardData, isLoading: false } as any);
    renderWithProviders(<Leaderboard />);
    expect(screen.getByText("Elite")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders table column headers", () => {
    mockLeaderboard.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Leaderboard />);
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("DORA Rating")).toBeInTheDocument();
  });
});
