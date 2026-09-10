import { Component, ErrorInfo, ReactNode } from "react";
import "./styles.scss";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Erro não tratado na tela:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error_boundary">
          <h2>Algo deu errado nesta tela.</h2>
          <p>
            Ocorreu um erro inesperado. Você pode voltar para outra tela pelo menu ao lado,
            ou recarregar a página.
          </p>
          <button type="button" onClick={this.handleReload}>
            Recarregar a página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
