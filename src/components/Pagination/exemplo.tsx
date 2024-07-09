import { useState } from "react";
import { getProductBatch } from "./util";
import { Pagination } from "./components/Pagination/Pagination";

function App() {
  // Dados do produto
  const [products, setProducts] = useState(getProductBatch());

  // Configuração de paginação
  const [pagAtual, setPagAtual] = useState<number>(1);
  const [prodPorPag] = useState<number>(5);

  // Calcula os índices dos produtos a serem exibidos na página atual
  const posiçãoUltimoProd: number = pagAtual * prodPorPag;
  const posiçãoPrimeiroProd: number = posiçãoUltimoProd - prodPorPag;

  const produtoAtual = products.slice(posiçãoPrimeiroProd, posiçãoUltimoProd);

  // Muda para próxima página
  const paginate = (numeroPag: number) => setPagAtual(numeroPag);

  const totalDeItens: number = 500;

  return (
    <div>
      <h1>Lista de Produtos</h1>
      <table>
        <thead>
          <tr>
            <th>Reclamação</th>
            <th>Status</th>
            <th>Nome do Produto</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {produtoAtual.map((product, index) => (
            <tr key={index}>
              <td>{product.claim}</td>
              <td>{product.status}</td>
              <td>{product.product_name}</td>
              <td>{product.data}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        currentPage={pagAtual}
        itemsPerPage={prodPorPag}
        paginate={paginate}
        totalItems={totalDeItens}
      />
    </div>
  );
}

export default App;
