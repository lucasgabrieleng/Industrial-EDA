import React, { Component, type ComponentProps, type ReactNode } from 'react';

// inset is reserved strictly for recessed interactive wells (file dropzones, code snippet blocks),
// never metric/callout sub-boxes inside cards or sidebars.
export const Surface = ({
  inset = false,
  className = '',
  ...props
}: ComponentProps<'div'> & { inset?: boolean }) => (
  <div
    className={`min-w-0 [:where(&)]:rounded-card [:where(&)]:border [:where(&)]:border-border/70 [:where(&)]:text-foreground ${
      inset
        ? '[:where(&)]:bg-background'
        : '[:where(&)]:bg-surface [:where(&)]:shadow-surface'
    } ${className}`}
    {...props}
  />
);

const buttonTones = {
  primary:
    '[:where(&)]:bg-primary [:where(&)]:text-primary-foreground [:where(&)]:border [:where(&)]:border-primary hover:brightness-95',
  quiet:
    '[:where(&)]:border [:where(&)]:border-border [:where(&)]:bg-surface [:where(&)]:text-foreground hover:bg-background',
  ghost:
    '[:where(&)]:border [:where(&)]:border-transparent [:where(&)]:bg-transparent [:where(&)]:text-foreground hover:bg-background',
  danger:
    '[:where(&)]:border [:where(&)]:border-danger/40 [:where(&)]:bg-surface [:where(&)]:text-danger hover:bg-danger/5',
};

const buttonSizes = {
  md: '[:where(&)]:min-h-11 [:where(&)]:px-4 [:where(&)]:text-label',
  sm: '[:where(&)]:min-h-9 [:where(&)]:px-3 [:where(&)]:text-label',
};

export const Button = ({
  tone = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}: ComponentProps<'button'> & {
  tone?: keyof typeof buttonTones;
  size?: keyof typeof buttonSizes;
}) => (
  <button
    type={type}
    className={`[:where(&)]:inline-flex [:where(&)]:items-center [:where(&)]:justify-center [:where(&)]:gap-2 whitespace-nowrap shrink-0 [:where(&)]:rounded-control [:where(&)]:font-medium transition-[transform,opacity,background-color,color,border-color] duration-150 ease-out active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${buttonTones[tone]} ${buttonSizes[size]} ${className}`}
    {...props}
  />
);

export const Field = ({
  label,
  htmlFor,
  hint,
  children,
  className = '',
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`min-w-0 flex flex-col gap-1.5 ${className}`}>
    <div className="flex items-baseline justify-between gap-2 min-w-0">
      <label htmlFor={htmlFor} className="text-label text-foreground">
        {label}
      </label>
      {hint && <span className="text-caption text-muted">{hint}</span>}
    </div>
    {children}
  </div>
);

export const inputClassName =
  'w-full min-h-11 rounded-control border border-border bg-surface px-3 text-body text-foreground placeholder:text-muted/70 transition-[border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50';

export const selectClassName =
  'w-full min-h-11 rounded-control border border-border bg-surface px-3 text-body text-foreground transition-[border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50 cursor-pointer';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado ao renderizar a análise industrial.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
          <Surface className="max-w-lg w-full p-6 flex flex-col gap-4" role="alert">
            <h1 className="text-title text-foreground">
              Não foi possível carregar a visualização
            </h1>
            <p className="text-body text-muted">{this.state.errorMessage}</p>
            <div className="pt-2 border-t border-border/60 flex items-center justify-end">
              <Button tone="primary" onClick={() => window.location.reload()}>
                Recarregar aplicação
              </Button>
            </div>
          </Surface>
        </div>
      );
    }
    return this.props.children;
  }
}
