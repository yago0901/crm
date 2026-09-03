import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { provisionCompanyWithPrimaryAccount, slugify } from '../../../services/plataforma/provisioning';
import "./styles.scss";

const Register = () => {
  const [companyName, setCompanyName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fallback, setFallback] = useState<{ login: string; tempPassword: string } | null>(null);

  const navigate = useNavigate();

  const handleHome = () => {
    navigate('/');
  };

  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!companyName.trim() || !username.trim() || !email.trim()) {
      setError('Preencha o nome da empresa, o usuário e o e-mail.');
      return;
    }

    setSaving(true);
    try {
      const result = await provisionCompanyWithPrimaryAccount({
        companyName: companyName.trim(),
        slugHint: slug.trim() || undefined,
        username: username.trim(),
        email: email.trim(),
      });

      if (result.autoSignedIn) {
        navigate('/home');
      } else {
        setFallback({ login: result.login, tempPassword: result.tempPassword });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar a conta.');
    } finally {
      setSaving(false);
    }
  };

  if (fallback) {
    return (
      <div className="register_background">
        <div className="register_background__container">
          <div className="register_background__container__card_login">
            <h1>Conta criada!</h1>
            <p>
              Não conseguimos te logar automaticamente, mas sua conta já foi
              criada. Anote os dados abaixo e faça login manualmente:
            </p>
            <p>
              <strong>Usuário:</strong> {fallback.login}
            </p>
            <p>
              <strong>Senha:</strong> {fallback.tempPassword}
            </p>
            <button onClick={handleHome}>Ir para o login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register_background">
      <div className="register_background__container">
        <div className="register_background__container__card_login">
          <h1>Criar conta grátis</h1>
          <button onClick={handleHome} type="button">Voltar</button>
          <form onSubmit={handleSignUp}>
            <input
              name="companyName"
              placeholder="Nome da empresa"
              aria-label="Nome da empresa"
              type="text"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
            />
            <input
              name="slug"
              placeholder="Endereço da empresa (ex: acme)"
              aria-label="Endereço da empresa"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
            <input
              name="username"
              placeholder="Seu nome de usuário"
              aria-label="Seu nome de usuário"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              name="email"
              placeholder="Seu e-mail"
              aria-label="Seu e-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {slug && username && (
              <p className="register_background__container__card_login__preview">
                Seu login será: <strong>{slug}.{username}</strong>
              </p>
            )}
            <button type="submit" disabled={saving}>
              {saving ? 'Criando...' : 'Criar conta grátis'}
            </button>
          </form>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Register;
