import { INavbar } from "./types";
import "./styles.scss";
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Navbar: React.FC<INavbar> = ({ isMenuOpen, onToggleMenu }) => {

  const navigate = useNavigate();

  const [subItemOpen, setSubItemOpen] = useState<string>('home')

  const handleNavigate = (where: string) => {
    navigate(where);
  };

  return (
    <div className={`navbar ${isMenuOpen ? 'open' : 'closed'}`}>
      {isMenuOpen && (
        <nav>
          <ul>
            <li>
              <button
                onClick={() => subItemOpen !== 'home' ? (setSubItemOpen('home'), handleNavigate('/home')) : setSubItemOpen('')}
                className={subItemOpen === 'home' ? 'navbar__selected' : ''}
              >
                Home
              </button>
            </li>
            <li>
              <button
                onClick={() => { subItemOpen !== 'human resources' ? setSubItemOpen('human resources') : setSubItemOpen('') }}
                className={subItemOpen === 'human resources' ? 'navbar__selected' : ''}
              >
                Recursos Humanos
              </button>
              {subItemOpen === 'human resources' &&
                <ul>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-1')}
                      className=''
                    >
                      Acompanhamento de Leads
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigate('/rh/gestao-funcionarios')}
                      className=''
                    >
                      Funcionários
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-2')}
                      className=''
                    >
                      Recrutamento
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-2')}
                      className=''
                    >
                      Treinamento
                    </button>
                  </li>
                </ul>
              }
            </li>
            <li>
              <button
                onClick={() => { subItemOpen !== 'financial' ? setSubItemOpen('financial') : setSubItemOpen('') }}
                className={subItemOpen === 'financial' ? 'navbar__selected' : ''}
              >
                Financeiro
              </button>
              {subItemOpen === 'financial' &&
                <ul>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-1')}
                      className=''
                    >
                      Fluxo de Caixa
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigate('/rh/gestao-funcionarios')}
                      className=''
                    >
                      Contabilidade
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-2')}
                      className=''
                    >
                      Contas a Pagar
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-2')}
                      className=''
                    >
                      Contas a Receber
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-2')}
                      className=''
                    >
                      Relatórios Financeiros
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => console.log('Subitem 2-2')}
                      className=''
                    >
                      Relatórios Personalizados
                    </button>
                  </li>
                </ul>
              }
            </li>
          </ul>
        </nav>
      )}
      <button className='navbar__button_close' onClick={onToggleMenu}>
        {isMenuOpen ? 'X' : '>'}
      </button>
    </div>
  )
}

export default Navbar;
