import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'button button--primary',
  secondary: 'button button--secondary',
  danger: 'button button--danger',
  ghost: 'button button--ghost',
  success: 'button button--success',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

/**
 * Botão do tema. Sem variante cai no cinza escuro, nunca no branco do sistema.
 * Exemplo: `<Button variant="primary">Ligar host</Button>`
 */
export function Button({ variant = 'secondary', className, type = 'button', ...props }: ButtonProps): React.JSX.Element {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}

/** Exemplo: `buttonClass('danger', 'settings-modal__logout')`. */
export function buttonClass(variant: ButtonVariant, className?: string): string {
  const base = VARIANT_CLASS[variant]
  return className ? `${base} ${className}` : base
}
