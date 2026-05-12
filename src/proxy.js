// =============================================================================
// src/proxy.js
// Proxy de Next.js 16 (equivalente a middleware.js en Next 14/15).
// Protege las rutas privadas: si no hay sesion, redirige al login.
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(req) {
  let res = NextResponse.next({ request: req })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return res

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const url = req.nextUrl.clone()
  const esAuthRuta = url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/registro')

  if (!user && !esAuthRuta) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && esAuthRuta) {
    url.pathname = '/simulador'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
}
