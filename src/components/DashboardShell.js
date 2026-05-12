'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import Button from '@/components/Button'

const navItems = [
  { href: '/simulador', label: 'Simulador' },
  { href: '/cotizaciones', label: 'Cotizaciones' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/vehiculos', label: 'Vehiculos' },
]

export default function DashboardShell({ title, subtitle, children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [colapsado, setColapsado] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('sidebar-colapsado') === '1'
  })

  function toggleSidebar() {
    setColapsado(prev => {
      const nuevo = !prev
      window.localStorage.setItem('sidebar-colapsado', nuevo ? '1' : '0')
      return nuevo
    })
  }

  async function cerrarSesion() {
    if (supabaseConfigurado) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const sidebarWidth = colapsado ? 'w-0' : 'w-56'
  const contentPadding = colapsado ? 'lg:pl-0' : 'lg:pl-56'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:h-screen lg:overflow-hidden">
      <ThemeToggle />

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex lg:flex-col ${sidebarWidth}`}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-base font-semibold whitespace-nowrap">Credito Vehicular</p>
          <p className="mt-1 text-xs text-slate-500 whitespace-nowrap">Finanzas e Ingenieria Economica</p>
        </div>

        <nav className="flex-1 px-3 py-3">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 block rounded-md px-3 py-2 text-sm whitespace-nowrap transition ${
                  active
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <Button onClick={cerrarSesion} variant="ghost" fullWidth>
            Cerrar sesion
          </Button>
        </div>
      </aside>

      {/* Toggle del sidebar (solo en desktop) */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={colapsado ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
        aria-label={colapsado ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
        className={`fixed top-1/2 z-40 hidden h-12 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-slate-200 bg-white text-slate-600 shadow-sm transition-[left] duration-200 hover:bg-slate-50 hover:text-slate-900 lg:flex ${
          colapsado ? 'left-0' : 'left-56'
        }`}
      >
        {colapsado ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={`min-h-screen transition-[padding] duration-200 lg:flex lg:h-screen lg:min-h-0 lg:flex-col ${contentPadding}`}>
        <header className="border-b border-slate-200 bg-white px-4 py-3 pr-20 sm:px-6 sm:pr-20 lg:px-8 lg:pr-24">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
            <div className="flex gap-2 lg:hidden">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-4 sm:px-6 lg:min-h-0 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
