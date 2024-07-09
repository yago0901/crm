import { IBatchProduct } from "./type";

export function getProductBatch(): IBatchProduct[] {
  // Função para gerar um número aleatório entre dois valores
  function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Lista de nomes de produtos eletrônicos/eletroeletrônicos
  const productNames = [
    "TV",
    "Smartphone",
    "Notebook",
    "Headphones",
    "Camera",
    "Smartwatch",
    "Speaker",
    "Tablet",
    "Drone",
    "Gaming Console",
  ];

  // Array para armazenar os produtos
  const productsArray = [];

  // Loop para criar 500 produtos
  for (let i = 0; i < 500; i++) {
    const claim = 12400 + i;
    const status = getRandomInt(1, 4);
    const productName = productNames[getRandomInt(0, productNames.length - 1)];
    const year = getRandomInt(2020, 2024);
    const month = getRandomInt(1, 12);
    const day = getRandomInt(1, 28);
    const hour = getRandomInt(0, 23);
    const minute = getRandomInt(0, 59);
    const second = getRandomInt(0, 59);
    const data = `${year}/${month.toString().padStart(2, "0")}/${day
      .toString()
      .padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}:${second.toString().padStart(2, "0")}`;

    productsArray.push({
      claim: claim.toString(),
      status,
      product_name: productName,
      data,
    });
  }

  return productsArray;
}
