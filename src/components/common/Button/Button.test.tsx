import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./index";

describe("Button", () => {
  it("renders children and defaults to the secondary variant", () => {
    render(<Button>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toHaveClass("btn--secondary");
  });

  it("applies the requested variant class", () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole("button", { name: "Excluir" })).toHaveClass("btn--danger");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Clique</Button>);

    await user.click(screen.getByRole("button", { name: "Clique" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Clique
      </Button>
    );

    await user.click(screen.getByRole("button", { name: "Clique" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
