import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import Repositories from "../../src/pages/repositories";

vi.mock("@argus/api-client-react", () => ({
  useListRepositories: vi.fn(),
  useListTeams: vi.fn(),
  useCreateRepository: vi.fn(),
  getListRepositoriesQueryKey: vi.fn(() => ["repositories"]),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useListRepositories, useListTeams, useCreateRepository } from "@argus/api-client-react";

const mockRepos = vi.mocked(useListRepositories);
const mockTeams = vi.mocked(useListTeams);
const mockCreateRepo = vi.mocked(useCreateRepository);

const repos = [
  {
    id: 1,
    name: "api-server",
    fullName: "acme/api-server",
    teamId: 1,
    language: "TypeScript",
    defaultBranch: "main",
    url: "https://github.com/acme/api-server",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "web-app",
    fullName: "acme/web-app",
    teamId: 2,
    language: "TypeScript",
    defaultBranch: "main",
    url: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const teams = [
  { id: 1, name: "Platform", description: null, timezone: "UTC", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, name: "Frontend", description: null, timezone: "UTC", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

describe("Repositories page", () => {
  beforeEach(() => {
    mockCreateRepo.mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
  });

  it("renders the Repositories heading", () => {
    mockRepos.mockReturnValue({ data: [], isLoading: false } as any);
    mockTeams.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Repositories />);
    expect(screen.getByRole("heading", { name: /repositories/i })).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", () => {
    mockRepos.mockReturnValue({ data: undefined, isLoading: true } as any);
    mockTeams.mockReturnValue({ data: undefined, isLoading: true } as any);
    const { container } = renderWithProviders(<Repositories />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a row for each repository", () => {
    mockRepos.mockReturnValue({ data: repos, isLoading: false } as any);
    mockTeams.mockReturnValue({ data: teams, isLoading: false } as any);
    renderWithProviders(<Repositories />);
    expect(screen.getByText("api-server")).toBeInTheDocument();
    expect(screen.getByText("web-app")).toBeInTheDocument();
  });

  it("renders full names and languages", () => {
    mockRepos.mockReturnValue({ data: repos, isLoading: false } as any);
    mockTeams.mockReturnValue({ data: teams, isLoading: false } as any);
    renderWithProviders(<Repositories />);
    expect(screen.getByText("acme/api-server")).toBeInTheDocument();
    expect(screen.getAllByText("TypeScript").length).toBeGreaterThan(0);
  });

  it("renders team names via lookup", () => {
    mockRepos.mockReturnValue({ data: repos, isLoading: false } as any);
    mockTeams.mockReturnValue({ data: teams, isLoading: false } as any);
    renderWithProviders(<Repositories />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("renders a Register Repo button", () => {
    mockRepos.mockReturnValue({ data: [], isLoading: false } as any);
    mockTeams.mockReturnValue({ data: [], isLoading: false } as any);
    renderWithProviders(<Repositories />);
    expect(screen.getByRole("button", { name: /register repo/i })).toBeInTheDocument();
  });
});
