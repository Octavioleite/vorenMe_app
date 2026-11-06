import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Round icon-only control (shape system: icon-only = circle). Always pass an aria-label. */
export function IconButton({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={rest['aria-label']}
      className={`press grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
