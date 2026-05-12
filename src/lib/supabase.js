// =============================================================================
// lib/supabase.js
// Cliente de Supabase para el navegador.
// Usa @supabase/ssr para que las cookies de sesion se compartan con el middleware.
// =============================================================================

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey)

// Permite compilar y abrir la app aunque todavia no exista .env.local.
// Login/registro reales requieren las variables NEXT_PUBLIC_SUPABASE_*.
export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
)
