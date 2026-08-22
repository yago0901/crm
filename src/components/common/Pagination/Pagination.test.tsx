import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "./index";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every page number when the total is small", () => {
    render(<Pagination currentPage={2} totalPages={4} onPageChange={vi.fn()} />);
    ["1", "2", "3", "4"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("collapses far-away pages behind an ellipsis", () => {
    render(<Pagination currentPage={1} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "5" })).not.toBeInTheDocument();
  });

  it("disables the previous button on the first page and next on the last", () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
    );
    expect(screen.getAllByRole("button")[0]).toBeDisabled();

    rerender(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });

  it("calls onPageChange with the clicked page", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("advances to the next page when the next arrow is clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[buttons.length - 1]);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
