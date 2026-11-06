import { Moon, Sun } from '@phosphor-icons/react'
import { useState } from 'react'
import { creator } from '../config/creator'
import type { Theme } from '../config/types'
import { THEME_COLOR } from '../lib/color'
import { themeKey } from '../lib/head'
import { IconButton } from './ui/IconButton'

export function ThemeToggle() {
  // Lê da página a cada render: a pré-visualização do painel pode trocar o tema por fora.
  const [, rerender] = useState(0)
  const theme = (document.documentElement.dataset.theme as Theme | undefined) ?? creator.theme

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[next])
    try {
      localStorage.setItem(themeKey(creator.username), next)
    } catch {
      /* storage unavailable (private mode): preference just won't persist */
    }
    rerender((n) => n + 1)
  }

  return (
    <IconButton onClick={toggle} aria-label={theme === 'dark' ? creator.labels.themeToLight : creator.labels.themeToDark}>
      {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </IconButton>
  )
}
