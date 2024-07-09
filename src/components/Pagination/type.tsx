export interface IPaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  paginate: (pageNumber: number) => void;
}
