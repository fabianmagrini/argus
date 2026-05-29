import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import PRs from "../../src/pages/pull-requests";

vi.mock("@argus/api-client-react", () => ({
  useListPullRequests: vi.fn(),
  useListTeams: vi.fn(),
  useListRepositories: vi.fn(),
}));

import { useListPullRequests, useListTeams, useListRepositories } from "@argus/api-client-react";

const mockPRs = vi.mocked(useListPullRequests);
const mockTeams = vi.mocked(useListTeams);
const mockRepos = vi.mocked(useListRepositories);

const prs = [
  {
    id: 1,
    repositoryId: 10,
    teamId: 1,
    externalId: 101,
    title: "feat: add caching layer",
    authorLogin: "alice",
    state: "merged",
    additions: 200,
    deletions: 50,
    changedFiles: 8,
    cycleTimeSeconds: 7200,
    openedAt: new Date(Date.now() - 86400000).toISOString(),
    mergedAt: new Date().toISOString(),
    closedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    repositoryId: 10,
    teamId: 2,
    externalId: 202,
    title: "fix: mobile layout regression",
    authorLogin: "bob",
    state: "open",
    additions: 30,
    deletions: 10,
    changedFiles: 3,
    cycleTimeSeconds: null,
    openedAt: new Date().toISOString(),
    mergedAt: null,
    closedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const repos = [{ id: 10, name: "api-server", fullName: "acme/api-server", teamId: 1, language: "TypeScript", defaultBranch: "main", url: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];

describe("Pull Requests page", () => {
  beforeEach(() => {
    mockTeams.mockReturnValue({ data: [], isLoading: false } as any);
    mockRepos.mockReturnValue({ data: repos, isLoading: false } as any);
  });

  it("renders the Pull Requests heading", () => {
    mockPRs.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<PRs />);
    expect(screen.getByRole("heading", { name: /pull requests/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockPRs.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<PRs />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a row for each PR", () => {
    mockPRs.mockReturnValue({ data: prs, isLoading: false } as any);
    renderWithProviders(<PRs />);
    expect(screen.getByText("feat: add caching layer")).toBeInTheDocument();
    expect(screen.getByText("fix: mobile layout regression")).toBeInTheDocument();
  });

  it("renders state badges", () => {
    mockPRs.mockReturnValue({ data: prs, isLoading: false } as any);
    renderWithProviders(<PRs />);
    expect(screen.getByText("merged")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders author logins", () => {
    mockPRs.mockReturnValue({ data: prs, isLoading: false } as any);
    renderWithProviders(<PRs />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("shows empty message when no PRs", () => {
    mockPRs.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<PRs />);
    expect(screen.getByText(/no pull requests found/i)).toBeInTheDocument();
  });

  it("renders status and team filter selectors", () => {
    mockPRs.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<PRs />);
    expect(screen.getByText(/all status/i)).toBeInTheDocument();
    expect(screen.getByText(/all teams/i)).toBeInTheDocument();
  });
});
