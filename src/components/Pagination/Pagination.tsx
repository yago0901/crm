import { IPaginationProps } from "./type";

export const Pagination = ({
  totalItems,
  itemsPerPage,
  currentPage,
  paginate,
}: IPaginationProps) => {
  function getPageNumbers() {
    const totalPages = Math.ceil(totalItems / itemsPerPage); //itens dividido por itens por pagina
    const maxPagesToShow = 5; // 1 número da página atual + 2 acima + 2 abaixo
    let startPage = 1;
    let endPage = totalPages;

    // Se houver mais páginas do que as que podemos mostrar, ajustamos os limites
    if (totalPages > maxPagesToShow) {
      // Verifica se o número total de páginas é maior do que o número máximo de páginas que podemos mostrar
      if (currentPage <= Math.floor(maxPagesToShow / 2)) {
        // Verifica se a página atual está dentro da primeira metade das páginas que podemos mostrar
        endPage = maxPagesToShow;
        // Se sim, define o limite superior (endPage) para o número máximo de páginas que podemos mostrar
      } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
        // Verifica se a página atual mais a metade das páginas que podemos mostrar excede o número total de páginas
        startPage = totalPages - maxPagesToShow + 1;
        // Se sim, define o limite inferior (startPage) para que as últimas maxPagesToShow páginas sejam exibidas
      } else {
        // Se não estiver em nenhuma das situações anteriores
        startPage = currentPage - Math.floor(maxPagesToShow / 2);
        // Define o limite inferior (startPage) para que a página atual fique no meio da lista de páginas a serem exibidas
        endPage = currentPage + Math.floor(maxPagesToShow / 2);
        // Define o limite superior (endPage) de forma que a página atual fique no meio da lista de páginas a serem exibidas
      }
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  }

  const pageNumbers = getPageNumbers();

  return (
    <ul className="pagination">
      {currentPage > 1 && (
        <li>
          <button onClick={() => paginate(currentPage - 1)}>&laquo;</button>
        </li>
      )}
      {pageNumbers.map((pageNumber) => (
        <li
          key={pageNumber}
          className={pageNumber === currentPage ? "active" : ""}
        >
          <button onClick={() => paginate(pageNumber)}>{pageNumber}</button>
        </li>
      ))}
      {currentPage < Math.ceil(totalItems / itemsPerPage) && (
        <li>
          <button onClick={() => paginate(currentPage + 1)}>&raquo;</button>
        </li>
      )}
    </ul>
  );
};
