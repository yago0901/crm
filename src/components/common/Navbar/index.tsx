import { INavbar } from "./types";

import "./styles.scss";

const Navbar: React.FC<INavbar> = ({ isMenuOpen, onToggleMenu }) => {

  return (
    <div className={`navbar ${isMenuOpen ? 'open' : 'closed'}`}>
      {isMenuOpen && (
        <nav>
          <ul>
            <li><a href="#item1">Item 1</a></li>
            <li><a href="#item2">Item 2</a></li>
            <li><a href="#item3">Item 3</a></li>
            <li><a href="#item4">Item 4</a></li>
          </ul>
        </nav>
      )}
      <button onClick={onToggleMenu}>
        {isMenuOpen ? 'X' : '>'}
      </button>
    </div>
  )
}

export default Navbar
