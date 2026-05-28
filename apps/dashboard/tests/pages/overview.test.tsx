import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Overview from "../../src/pages/overview";

vi.mock("@argus/api-client-react", () => ({
  useGetMetricsSummary: vi.fn(),
  useGetActivityFeed: vi.fn(),
  useGetDoraTimeseries: vi.fn(),
}));

import {
  useGetMetricsSummary,
  useGetActivityFeed,
  useGetDoraTimeseries,
} from "@argus/api-client-react";

const mockSummary = vi.mocked(useGetMetricsSummary);
const mockActivity = vi.mocked(useGetActivityFeed);
const mockTimeseries = vi.mocked(useGetDoraTimeseries);

describe("Overview page", () => {
  beforeEach(() => {
    mockTimeseries.mockReturnValue({ data: [], isLoading: false } as any);
    mockActivity.mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("renders the Overview heading", () => {
    mockSummary.mockReturnValue({ data: undefined, isLoading: true } as any);
    renderWithProviders(<Overview />);
    expect(screen.getByRole("heading", { name: /overview/i })).toBeInTheDocument();
  });

  it("shows skeleton cards while loading", () => {
    mockSummary.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Overview />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders metric values from summary data", () => {
    mockSummary.mockReturnValue({
      data: {
        totalDeployments: 42,
        successRate: 0.95,
        avgLeadTimeDays: 0.5,
        openIncidents: 3,
        doraRating: "high",
        deploymentsPerDay: 1.4,
        changeFailureRate: 0.05,
        avgRecoveryTimeHours: 2,
        totalPullRequests: 20,
        mergedPullRequests: 18,
        avgCycleTimeDays: 1.2,
      },
      isLoading: false,
    } as any);
    renderWithProviders(<Overview />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders recent activity items", () => {
    mockSummary.mockReturnValue({ data: undefined, isLoading: false } as any);
    mockActivity.mockReturnValue({
      data: [
        {
          id: "deployment-1",
          type: "deployment",
          description: "Deployed to production",
          teamName: "Platform",
          repositoryName: "api-server",
          actorLogin: null,
          status: "success",
          severity: null,
          timestamp: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as any);
    renderWithProviders(<Overview />);
    expect(screen.getByText("Deployed to production")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });
});
