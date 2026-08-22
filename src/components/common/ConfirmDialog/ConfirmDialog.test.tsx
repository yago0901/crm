import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./index";

describe("ConfirmDialog", () => {
  it("renders the title and message", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Excluir contato"
        message='Excluir "Maria"?'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Excluir contato")).toBeInTheDocument();
    expect(screen.getByText('Excluir "Maria"?')).toBeInTheDocument();
  });

  it("uses default button labels when none are provided", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Título"
        message="Mensagem"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel accordingly", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen
        title="Título"
        message="Mensagem"
        confirmLabel="Excluir"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders the confirm button as danger when danger is true", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Título"
        message="Mensagem"
        danger
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveClass("btn--danger");
  });
});
