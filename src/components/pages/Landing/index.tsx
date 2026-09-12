import { Link } from "react-router-dom";
import dashboardDesktop from "../../../assets/dashboard-desktop.png";
import dashboardMobile from "../../../assets/dashboard-mobile.png";
import "./styles.scss";

const CHECKLIST = [
  { title: "Estoque em tempo real", text: "cada venda, compra ou ajuste atualiza o saldo na hora." },
  { title: "Contas a receber automáticas", text: "fechou negócio, a cobrança já nasce certa." },
  { title: "Alerta de estoque baixo", text: "o sistema avisa antes de faltar produto." },
  { title: "Ficha técnica", text: "vendeu 1 sanduíche, baixa os ingredientes certos sozinho." },
];

const EVENTS = [
  { grad: "var(--gradient-blue)", title: "Pedido #1042 aprovado", sub: "Padaria Bela Vista · R$ 340,00", badge: "Aprovado", tone: "ok" },
  { grad: "var(--gradient-teal)", title: "Estoque atualizado", sub: "Farinha de trigo · -4kg", badge: "Automático", tone: "ok" },
  { grad: "var(--gradient-amber)", title: "Conta a receber gerada", sub: "Vence em 15 dias", badge: "Automático", tone: "ok" },
  { grad: "linear-gradient(135deg, #fca5a5, #dc2626)", title: "Estoque baixo", sub: "Fermento biológico · 2un restantes", badge: "Alerta", tone: "warn" },
];

const STEPS = [
  { n: 1, title: "Crie sua conta grátis", text: "Sem cartão, direto pelo navegador." },
  { n: 2, title: "Cadastre produtos e equipe", text: "Seus dados, do seu jeito, em minutos." },
  { n: 3, title: "Comece a vender", text: "O resto o sistema puxa sozinho." },
];

const SHOWCASE = [
  { grad: "linear-gradient(135deg,#dbeafe,#eff6ff)", dot: "var(--gradient-blue)", title: "Painel geral", text: "Vendas, caixa e equipe numa tela só." },
  { grad: "linear-gradient(135deg,#d1fae5,#ecfdf5)", dot: "var(--gradient-teal)", title: "Controle de estoque", text: "Saldo sempre certo, sem contagem manual." },
  { grad: "linear-gradient(135deg,#fef3c7,#fffbeb)", dot: "var(--gradient-amber)", title: "Relatórios personalizados", text: "Filtre, agrupe e exporte do seu jeito." },
];

const TESTIMONIALS = [
  { quote: "Antes eu controlava o estoque numa planilha e sempre batia diferente do que tinha na prateleira. Agora é automático.", name: "Dona da Adega", role: "Cliente fundadora", initial: "A", color: "#2563eb" },
  { quote: "O que eu mais queria era não ter que atualizar três coisas quando fechava uma venda. Aprova o pedido e pronto.", name: "Dono da Lanchonete", role: "Cliente fundador", initial: "L", color: "#059669" },
  { quote: "Consigo ver o financeiro, o estoque e a equipe sem abrir três programas diferentes.", name: "Gestor de operações", role: "Cliente", initial: "S", color: "#d97706" },
];

const PLANS = [
  {
    name: "Essencial", price: "170", seats: "até 10 usuários · +R$30/usuário extra",
    features: ["Vendas / CRM", "Financeiro", "Estoque", "RH básico"], highlight: false,
  },
  {
    name: "Profissional", price: "390", seats: "até 20 usuários · +R$30/usuário extra",
    features: ["Tudo do Essencial", "Automações completas", "Business Intelligence", "Projetos"], highlight: true,
  },
  {
    name: "Avançado", price: "1.090", seats: "até 50 usuários · +R$30/usuário extra",
    features: ["Tudo do Profissional", "Produção", "Compliance", "Colaboração"], highlight: false,
  },
];

export default function Landing() {
  return (
    <div className="landing_page">
      <span className="landing_page__blob landing_page__blob--1" />
      <span className="landing_page__blob landing_page__blob--2" />
      <span className="landing_page__blob landing_page__blob--3" />
      <span className="landing_page__blob landing_page__blob--4" />

      <nav className="landing_page__nav">
        <div className="landing_page__wrap landing_page__nav__row">
          <div className="landing_page__brand">
            <span className="landing_page__brand__mark" />
            SeuCRM
          </div>
          <div className="landing_page__navlinks">
            <a href="#automacao">Automação</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#preco">Preço</a>
          </div>
          <div className="landing_page__nav__actions">
            <Link className="landing_page__btn landing_page__btn--ghost landing_page__btn--sm" to="/entrar">Entrar</Link>
            <Link className="landing_page__btn landing_page__btn--primary landing_page__btn--sm" to="/register">Testar grátis</Link>
          </div>
        </div>
      </nav>

      <header className="landing_page__hero">
        <div className="landing_page__wrap landing_page__hero__row">
          <div>
            <span className="landing_page__eyebrow">SEM CARTÃO DE CRÉDITO · 30 DIAS GRÁTIS</span>
            <h1>Estoque, vendas e financeiro andando <em>juntos</em> — sem você ligar as pontas na mão.</h1>
            <p className="landing_page__sub">
              O sistema de gestão feito pra pequenos e médios negócios brasileiros. Aprovou um pedido?
              O estoque já saiu e a conta a receber já nasceu certa. Sozinho.
            </p>
            <div className="landing_page__cta_row">
              <Link className="landing_page__btn landing_page__btn--primary" to="/register">Testar grátis por 30 dias</Link>
              <a className="landing_page__btn landing_page__btn--ghost" href="#como-funciona">Ver como funciona</a>
            </div>
            <p className="landing_page__trust">Sem cartão de crédito no cadastro. Cancele quando quiser.</p>
          </div>

          <div className="landing_page__device">
            <div className="landing_page__laptop">
              <div className="landing_page__laptop__screen">
                <div className="landing_page__laptop__cam" />
                <img src={dashboardDesktop} alt="Painel do CRM em um notebook" />
              </div>
              <div className="landing_page__laptop__base" />
            </div>
            <div className="landing_page__phone">
              <div className="landing_page__phone__notch" />
              <img src={dashboardMobile} alt="Painel do CRM em um celular" />
            </div>
          </div>
        </div>
      </header>

      <div className="landing_page__trustbar">
        <div className="landing_page__wrap landing_page__trustbar__row">
          <span className="landing_page__pill">💠 Pix</span>
          <span className="landing_page__pill">🧾 Boleto</span>
          <span className="landing_page__pill">💳 Cartão</span>
          <span className="landing_page__pill">🇧🇷 Suporte em português</span>
        </div>
      </div>

      <section id="automacao" className="landing_page__section">
        <div className="landing_page__wrap landing_page__split">
          <div>
            <span className="landing_page__eyebrow">AUTOMAÇÃO DE VERDADE</span>
            <h2>Do pedido ao dinheiro em caixa, automático</h2>
            <p className="landing_page__section_sub">Nada de anotar em três lugares diferentes. Uma ação move o resto sozinha.</p>
            <ul className="landing_page__checklist">
              {CHECKLIST.map((item) => (
                <li key={item.title}>
                  <span className="landing_page__tick">✓</span>
                  <div><b>{item.title}</b> — {item.text}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="landing_page__art">
            {EVENTS.map((ev) => (
              <div className="landing_page__art__row" key={ev.title}>
                <i style={{ background: ev.grad }} />
                <div className="landing_page__art__text"><b>{ev.title}</b><span>{ev.sub}</span></div>
                <span className={`landing_page__badge landing_page__badge--${ev.tone}`}>{ev.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="landing_page__section">
        <div className="landing_page__wrap">
          <div className="landing_page__head">
            <span className="landing_page__eyebrow">SEM COMPLICAÇÃO</span>
            <h2>Comece a usar em poucos minutos</h2>
            <p>Sem instalar nada, sem treinamento de uma semana.</p>
          </div>
          <div className="landing_page__steps">
            {STEPS.map((step) => (
              <div className="landing_page__step" key={step.n}>
                <div className="landing_page__step__num">{step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing_page__section">
        <div className="landing_page__wrap">
          <div className="landing_page__head">
            <span className="landing_page__eyebrow">TUDO NUM SÓ LUGAR</span>
            <h2>Veja o negócio inteiro, sem abrir uma planilha</h2>
            <p>Vendas, financeiro, estoque e equipe — no mesmo painel.</p>
          </div>
          <div className="landing_page__showcase">
            {SHOWCASE.map((card) => (
              <div className="landing_page__scard" key={card.title}>
                <div className="landing_page__scard__top" style={{ background: card.grad }}>
                  <span style={{ background: card.dot }} />
                </div>
                <div className="landing_page__scard__body"><b>{card.title}</b><span>{card.text}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing_page__section">
        <div className="landing_page__wrap">
          <div className="landing_page__head">
            <span className="landing_page__eyebrow">QUEM JÁ USA</span>
            <h2>Pensado com quem realmente vai usar</h2>
          </div>
          <div className="landing_page__tcarousel">
            {TESTIMONIALS.map((t) => (
              <div className="landing_page__tcard" key={t.name}>
                <p>“{t.quote}”</p>
                <div className="landing_page__who">
                  <span className="landing_page__avatar" style={{ background: t.color }}>{t.initial}</span>
                  <div><b>{t.name}</b><span>{t.role}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preco" className="landing_page__section">
        <div className="landing_page__wrap">
          <div className="landing_page__head">
            <span className="landing_page__eyebrow">PREÇO CLARO</span>
            <h2>Sem letra miúda, sem "fale com vendas"</h2>
            <p>Escolha o plano de acordo com o tamanho da sua equipe.</p>
          </div>
          <div className="landing_page__price_grid">
            {PLANS.map((plan) => (
              <div className={`landing_page__plan ${plan.highlight ? "landing_page__plan--hi" : ""}`} key={plan.name}>
                {plan.highlight && <span className="landing_page__ribbon">Mais escolhido</span>}
                <h3>{plan.name}</h3>
                <div className="landing_page__price">R${plan.price}<span>/mês</span></div>
                <div className="landing_page__seats">{plan.seats}</div>
                <ul>
                  {plan.features.map((f) => <li key={f}>✔ {f}</li>)}
                </ul>
                <Link
                  className={`landing_page__btn ${plan.highlight ? "landing_page__btn--primary" : "landing_page__btn--ghost"}`}
                  to="/register"
                  style={{ justifyContent: "center" }}
                >
                  Testar grátis
                </Link>
              </div>
            ))}
          </div>
          <div className="landing_page__custom_banner">
            <div>
              <b>Precisa de um sistema do zero, sob medida pro seu negócio?</b>
              <span>Isso é um projeto à parte — não uma customização deste CRM.</span>
            </div>
            <a className="landing_page__btn landing_page__btn--ghost landing_page__btn--sm" href="mailto:contato@seucrm.com.br">Fale comigo direto</a>
          </div>
        </div>
      </section>

      <section className="landing_page__section">
        <div className="landing_page__wrap">
          <div className="landing_page__finalcta">
            <h2>Pronto pra parar de juntar planilha com sistema?</h2>
            <p>30 dias grátis, sem cartão de crédito.</p>
            <div className="landing_page__cta_row" style={{ justifyContent: "center" }}>
              <Link className="landing_page__btn landing_page__btn--primary" to="/register">Testar grátis agora</Link>
              <a className="landing_page__btn landing_page__btn--ghost" href="mailto:contato@seucrm.com.br">Falar com a gente</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing_page__footer">
        <div className="landing_page__wrap landing_page__footer__row">
          <span>© 2026 SeuCRM. Feito para pequenos e médios negócios brasileiros.</span>
          <span>Termos de Uso · Privacidade</span>
        </div>
      </footer>
    </div>
  );
}
