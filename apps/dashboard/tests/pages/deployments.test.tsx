import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Deployments from "../../src/pages/deployments";

vi.mock("@argus/api-client-react", () => ({
  useListDeployments: vi.fn(),
  useListTeams: vi.fn(),
  useListRepositories: vi.fn(),
}));

import { useListDeployments, useListTeams, useListRepositories } from "@argus/api-client-react";

const mockDeployments = vi.mocked(useListDeployments);
const mockTeams = vi.mocked(useListTeams);
const mockRepos = vi.mocked(useListRepositories);

const deployments = [
  {
    id: 1,
    repositoryId: 10,
    teamId: 1,
    environment: "production",
    status: "success",
    commitSha: "abc1234",
    version: "1.0.0",
    leadTimeSeconds: 3600,
    deployedAt: new Date().toISOString(),
    finishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    repositoryId: 10,
    teamId: 2,
    environment: "staging",
    status: "failed",
    commitSha: "def5678",
    version: "1.0.1",
    leadTimeSeconds: 1800,
    deployedAt: new Date(Date.now() - 3600000).toISOString(),
    finishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const repos = [{ id: 10, name: "api-server", fullName: "acme/api-server", teamId: 1, language: "TypeScript", defaultBranch: "main", url: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
const teams = [
  { id: 1, name: "Platform", description: null, timezone: "UTC", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: "Frontend", description: null, timezone: "UTC", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

describe("Deployments page", () => {
  beforeEach(() => {
    mockTeams.mockReturnValue({ data: teams, isLoading: false } as any);
    mockRepos.mockReturnValue({ data: repos, isLoading: false } as any);
  });

  it("renders the Deployments heading", () => {
    mockDeployments.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Deployments />);
    expect(screen.getByRole("heading", { name: /deployments/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockDeployments.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Deployments />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a row for each deployment", () => {
    mockDeployments.mockReturnValue({ data: deployments, isLoading: false } as any);
    renderWithProviders(<Deployments />);
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    mockDeployments.mockReturnValue({ data: deployments, isLoading: false } as any);
    renderWithProviders(<Deployments />);
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("renders repository names via lookup", () => {
    mockDeployments.mockReturnValue({ data: deployments, isLoading: false } as any);
    renderWithProviders(<Deployments />);
    expect(screen.getAllByText("api-server").length).toBeGreaterThan(0);
  });

  it("shows empty message when no deployments", () => {
    mockDeployments.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Deployments />);
    expect(screen.getByText(/no deployments found/i)).toBeInTheDocument();
  });

  it("renders a team filter selector", () => {
    mockDeployments.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Deployments />);
    expect(screen.getByText(/all teams/i)).toBeInTheDocument();
  });
});
