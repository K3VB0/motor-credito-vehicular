'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import Button from '@/components/Button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    if (!supabaseConfigurado) {
      window.localStorage.setItem('demo-user', email)
      router.push('/simulador')
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError('Correo o clave incorrectos.')
      setLoading(false)
      return
    }

    router.push('/simulador')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <ThemeToggle />
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Credito Vehicular</h1>
          <p className="mt-1 text-sm text-slate-500">Sistema financiero para Compra Inteligente</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Iniciar sesion</h2>
          {!supabaseConfigurado && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Modo demo activo. Conecta Supabase para autenticacion real.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Correo</span>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                title="Correo electronico con el que te registraste en el sistema."
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="asesor@empresa.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Clave</span>
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                minLength={6}
                title="Clave de acceso de al menos 6 caracteres. Distingue mayusculas y minusculas."
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Minimo 6 caracteres"
              />
            </label>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button type="submit" disabled={loading} variant="primary" fullWidth>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            No tienes cuenta?{' '}
            <Link href="/registro" className="font-medium text-blue-600 hover:underline">
              Registrate
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
