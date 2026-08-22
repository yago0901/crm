import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./index";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        Conteúdo
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and children when open", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Novo contato">
        <p>Formulário aqui</p>
      </Modal>
    );
    expect(screen.getByText("Novo contato")).toBeInTheDocument();
    expect(screen.getByText("Formulário aqui")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        Conteúdo
      </Modal>
    );

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when clicking inside the card", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        <p>Conteúdo</p>
      </Modal>
    );

    await user.click(screen.getByText("Conteúdo"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        Conteúdo
      </Modal>
    );

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Título">
        Conteúdo
      </Modal>
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
