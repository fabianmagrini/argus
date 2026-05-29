import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import NotFound from "../../src/pages/not-found";

describe("NotFound page", () => {
  it("renders 404 page not found text", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText(/404 page not found/i)).toBeInTheDocument();
  });

  it("renders the router hint message", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText(/did you forget to add the page to the router/i)).toBeInTheDocument();
  });
});
