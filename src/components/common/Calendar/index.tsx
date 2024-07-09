import React, { useEffect, useState } from "react";
import "./styles.scss";

interface Mes {
  nome: string;
  abreviacao: string;
  numero: number;
}

interface DiaSemana {
  nome: string;
  abreviacao: string;
  numero: number;
}

const meses: Mes[] = [
  { nome: "Janeiro", abreviacao: "Jan", numero: 1 },
  { nome: "Fevereiro", abreviacao: "Fev", numero: 2 },
  { nome: "Março", abreviacao: "Mar", numero: 3 },
  { nome: "Abril", abreviacao: "Abr", numero: 4 },
  { nome: "Maio", abreviacao: "Mai", numero: 5 },
  { nome: "Junho", abreviacao: "Jun", numero: 6 },
  { nome: "Julho", abreviacao: "Jul", numero: 7 },
  { nome: "Agosto", abreviacao: "Ago", numero: 8 },
  { nome: "Setembro", abreviacao: "Set", numero: 9 },
  { nome: "Outubro", abreviacao: "Out", numero: 10 },
  { nome: "Novembro", abreviacao: "Nov", numero: 11 },
  { nome: "Dezembro", abreviacao: "Dez", numero: 12 },
];

const diasSemana: DiaSemana[] = [
  { nome: "Domingo", abreviacao: "Dom", numero: 0 },
  { nome: "Segunda-feira", abreviacao: "Seg", numero: 1 },
  { nome: "Terça-feira", abreviacao: "Ter", numero: 2 },
  { nome: "Quarta-feira", abreviacao: "Qua", numero: 3 },
  { nome: "Quinta-feira", abreviacao: "Qui", numero: 4 },
  { nome: "Sexta-feira", abreviacao: "Sex", numero: 5 },
  { nome: "Sábado", abreviacao: "Sáb", numero: 6 },
];

const Calendar: React.FC = () => {
  const dataAtual = new Date();
  const [ano, setAno] = useState<number>(dataAtual.getFullYear());
  const [mes, setMes] = useState<number>(dataAtual.getMonth());
  const [calendario, setCalendario] = useState<
    { dia: number; diaSemana: string }[]
  >([]);

  const criarCalendario = () => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const diasDoMes = new Date(ano, mes + 1, 0).getDate();
    const novoCalendario: { dia: number; diaSemana: string }[] = [];

    let dia = 1;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < primeiroDiaSemana) || dia > diasDoMes) {
          novoCalendario.push({ dia: 0, diaSemana: "" });
        } else {
          novoCalendario.push({ dia, diaSemana: diasSemana[j].abreviacao });
          dia++;
        }
      }
    }

    setCalendario(novoCalendario);
  };

  useEffect(() => {
    criarCalendario();
  }, [ano, mes]);

  const mesAnterior = () => {
    setMes((prevMes) => (prevMes === 0 ? 11 : prevMes - 1));
    setAno((prevAno) => (mes === 0 ? prevAno - 1 : prevAno));
  };

  const mesSeguinte = () => {
    setMes((prevMes) => (prevMes === 11 ? 0 : prevMes + 1));
    setAno((prevAno) => (mes === 11 ? prevAno + 1 : prevAno));
  };

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button onClick={mesAnterior}>&lt;</button>
        <h2>{`${meses[mes].nome} ${ano}`}</h2>
        <button onClick={mesSeguinte}>&gt;</button>
      </div>
      <table>
        <thead>
          <tr>
            {diasSemana.map((dia) => (
              <th key={dia.abreviacao}>{dia.abreviacao}</th>
            ))}
          </tr>
        </thead>
        <tbody className="calendar__header__table">
          {[...Array(6)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {diasSemana.map((diaSemana, colIndex) => {
                const diaIndex = rowIndex * 7 + colIndex;
                const dia = calendario[diaIndex];

                return (
                  <td
                    key={colIndex}
                    className={
                      dia && dia.dia === 0 ? "calendar__header__tbody__td" : ""
                    }
                  >
                    {dia && dia.dia !== 0 && dia.dia}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Calendar;
