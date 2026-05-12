'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import Button from '@/components/Button'

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmacion) {
      setError('Las claves no coinciden.')
      return
    }

    if (password.length < 6) {
      setError('La clave debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    if (!supabaseConfigurado) {
      window.localStorage.setItem('demo-user', email)
      window.localStorage.setItem('demo-user-name', nombre)
      router.push('/simulador')
      return
    }

    const { data: signUpData, error: registerError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })

    if (registerError) {
      setError(registerError.message)
      setLoading(false)
      return
    }

    // Si Supabase no devolvio sesion (confirmacion por correo activada),
    // intentamos login inmediato para crear la sesion.
    if (!signUpData?.session) {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) {
        setError('Cuenta creada. Confirma tu correo y luego inicia sesion.')
        setLoading(false)
        return
      }
    }

    router.push('/simulador')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <ThemeToggle />
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Credito Vehicular</h1>
          <p className="mt-1 text-sm text-slate-500">Registro de asesores financieros</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nombre completo</span>
              <input value={nombre} onChange={event => setNombre(event.target.value)} required title="Nombres y apellidos del asesor que usara el sistema." placeholder="Nombre y apellidos" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Correo</span>
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} required title="Correo electronico que se usara para iniciar sesion." placeholder="correo@empresa.com" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Clave</span>
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} title="Clave de al menos 6 caracteres. Distingue mayusculas y minusculas." placeholder="Minimo 6 caracteres" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Confirmar clave</span>
              <input type="password" value={confirmacion} onChange={event => setConfirmacion(event.target.value)} required minLength={6} title="Vuelve a escribir la misma clave para confirmarla." placeholder="Repite la clave" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button type="submit" disabled={loading} variant="primary" fullWidth>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Ingresa
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
