import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Incidents from "../../src/pages/incidents";

vi.mock("@argus/api-client-react", () => ({
  useListIncidents: vi.fn(),
  useListTeams: vi.fn(),
}));

import { useListIncidents, useListTeams } from "@argus/api-client-react";

const mockIncidents = vi.mocked(useListIncidents);
const mockTeams = vi.mocked(useListTeams);

const incidents = [
  {
    id: 1,
    title: "API latency spike",
    severity: "p1",
    status: "open",
    teamId: 1,
    recoveryTimeSeconds: null,
    openedAt: new Date().toISOString(),
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Database connection timeout",
    severity: "p2",
    status: "resolved",
    teamId: 2,
    recoveryTimeSeconds: 3600,
    openedAt: new Date(Date.now() - 86400000).toISOString(),
    resolvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("Incidents page", () => {
  beforeEach(() => {
    mockTeams.mockReturnValue({ data: [], isLoading: false } as any);
  });

  it("renders the Incidents heading", () => {
    mockIncidents.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Incidents />);
    expect(screen.getByRole("heading", { name: /incidents/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockIncidents.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Incidents />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a row for each incident", () => {
    mockIncidents.mockReturnValue({ data: incidents, isLoading: false } as any);
    renderWithProviders(<Incidents />);
    expect(screen.getByText("API latency spike")).toBeInTheDocument();
    expect(screen.getByText("Database connection timeout")).toBeInTheDocument();
  });

  it("renders severity badges", () => {
    mockIncidents.mockReturnValue({ data: incidents, isLoading: false } as any);
    renderWithProviders(<Incidents />);
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    mockIncidents.mockReturnValue({ data: incidents, isLoading: false } as any);
    renderWithProviders(<Incidents />);
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("resolved")).toBeInTheDocument();
  });

  it("shows empty message when no incidents", () => {
    mockIncidents.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Incidents />);
    expect(screen.getByText(/no incidents found/i)).toBeInTheDocument();
  });

  it("renders status and team filters", () => {
    mockIncidents.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Incidents />);
    expect(screen.getByText(/all status/i)).toBeInTheDocument();
    expect(screen.getByText(/all teams/i)).toBeInTheDocument();
  });
});
