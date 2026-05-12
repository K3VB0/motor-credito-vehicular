'use client'

import { useEffect, useState } from 'react'

function aplicarTema(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    aplicarTema(theme)
  }, [theme])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    window.localStorage.setItem('theme', nextTheme)
    aplicarTema(nextTheme)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Tema oscuro activo. Cambiar a claro' : 'Tema claro activo. Cambiar a oscuro'}
      className={`theme-toggle ${theme === 'dark' ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      data-theme={theme}
    >
      <span className={theme === 'dark' ? 'moon-icon' : 'sun-icon'} aria-hidden="true" />
    </button>
  )
}
