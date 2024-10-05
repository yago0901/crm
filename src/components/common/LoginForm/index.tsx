import "./styles.scss";
import { Link } from "react-router-dom";
import { ILoginFormProps } from "./types";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export const LoginForm: React.FC<ILoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    onLogin(email, password);
  };

  return (
    <>
      <form className="login_form" onSubmit={handleLogin}>
        <div className="login_form__title">LOGIN</div>
        <input
          className="login_form__input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="login_form__container">
          <input
            className="login_form__container__input"
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div
            className="login_form__container__eye"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </div>
        </div>
        <div className="login_form__checkbox">
          <div className="login_form__checkbox__input">
            <input type="checkbox" />
            <p className="login_form__checkbox__input__p">Lembre-me</p>
          </div>
          <Link to="#" className="login_form__checkbox__link">
            Esqueci a senha
          </Link>
        </div>
        <button type="submit">Login</button>
      </form>
    </>
  );
};
