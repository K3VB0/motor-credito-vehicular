// src/app/page.js
// La raiz del sitio redirige al login.
// El middleware envia al dashboard si ya existe una sesion activa.

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
