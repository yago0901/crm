import { INavbar } from "./types";

import "./styles.scss";
import { useNavigate } from 'react-router-dom';

const Navbar: React.FC<INavbar> = ({ isMenuOpen, onToggleMenu }) => {

  const navigate = useNavigate();

  const handleFinanceiroContabilidade = () => {
    navigate('/financeiro/contabilidade');
  };

  return (
    <div className={`navbar ${isMenuOpen ? 'open' : 'closed'}`}>
      {isMenuOpen && (
        <nav>
          <ul>
            <li>
              <button
                onClick={handleFinanceiroContabilidade}
                className=''
              >
                Item 1
              </button>
            </li>
            <li>
              <button
                onClick={handleFinanceiroContabilidade}
                className=''
              >
                Item 2
              </button>
            </li>
            <li>
              <button
                onClick={handleFinanceiroContabilidade}
                className=''
              >
                Item 3
              </button>
            </li>
            <li>
              <button
                onClick={handleFinanceiroContabilidade}
                className=''
              >
                Item 4
              </button>
            </li>
          </ul>
        </nav>
      )}
      <button onClick={onToggleMenu}>
        {isMenuOpen ? 'X' : '>'}
      </button>
    </div>
  )
}

export default Navbar;
