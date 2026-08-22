import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "./index";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge tone="success">Ativo</Badge>);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("applies the class matching the given tone", () => {
    render(<Badge tone="danger">Atrasado</Badge>);
    expect(screen.getByText("Atrasado")).toHaveClass("badge--danger");
  });
});
