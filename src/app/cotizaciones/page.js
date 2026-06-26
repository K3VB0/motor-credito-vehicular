'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import Button from '@/components/Button'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

// Cotizaciones de credito guardadas. Se crean desde el Simulador;
// aqui solo se listan, se reabren en el simulador o se eliminan.
// La tabla en base de datos se llama "simulaciones".

function currency(moneda, value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda === 'USD' ? 'USD' : 'PEN',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0)
}

function percent(value) {
  return `${((Number(value) || 0) * 100).toFixed(2)}%`
}

function fecha(iso) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function CotizacionesPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [seleccionId, setSeleccionId] = useState(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)
  const [error, setError] = useState(supabaseConfigurado ? '' : 'Supabase no esta configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    if (!supabaseConfigurado) return
    let cancelado = false
    async function cargar() {
      const { data, error: err } = await supabase
        .from('simulaciones')
        .select('id, creado_en, moneda, precio_venta, plazo_meses, tipo_tasa, valor_tasa, cuota_ordinaria, tcea, van, clientes(nombres, apellidos), vehiculos(marca, modelo)')
        .order('creado_en', { ascending: false })
      if (cancelado) return
      if (err) {
        setError(err.message)
      } else {
        setItems(data || [])
        setError('')
      }
      setCargando(false)
    }
    cargar()
    return () => { cancelado = true }
  }, [recarga])

  const seleccionada = items.find(item => item.id === seleccionId) || null

  function toggleSeleccion(id) {
    setSeleccionId(actual => (actual === id ? null : id))
  }

  function abrirEnSimulador() {
    if (seleccionada) router.push(`/simulador?sim=${seleccionada.id}`)
  }

  async function eliminarSeleccion() {
    if (!seleccionada) return
    if (!window.confirm('Eliminar esta cotizacion y su cronograma? Esta accion no se puede deshacer.')) return
    const { error: err } = await supabase.from('simulaciones').delete().eq('id', seleccionada.id)
    if (err) { setError(err.message); return }
    setSeleccionId(null)
    setRecarga(n => n + 1)
  }

  return (
    <DashboardShell
      title="Cotizaciones"
      subtitle="Historial de cotizaciones de credito registradas en la base de datos."
    >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold">Registros guardados</h2>
          <p className="text-xs text-slate-500">
            {items.length > 0 && `${items.length} cotizacion${items.length === 1 ? '' : 'es'}`}
          </p>
        </div>

        {cargando ? (
          <p className="p-5 text-sm text-slate-500">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            Aun no hay cotizaciones guardadas. Crea una desde el Simulador con el boton Guardar cotizacion.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Vehiculo</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Plazo</th>
                    <th className="px-3 py-2">Tasa</th>
                    <th className="px-3 py-2 text-right">Cuota</th>
                    <th className="px-3 py-2 text-right">TCEA</th>
                    <th className="px-3 py-2 text-right">VAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => {
                    const seleccionado = item.id === seleccionId
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleSeleccion(item.id)}
                        className={`cursor-pointer transition-colors ${seleccionado ? 'fila-seleccionada' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3 py-2 tabular-nums">{fecha(item.creado_en)}</td>
                        <td className="px-3 py-2">{item.clientes ? `${item.clientes.nombres} ${item.clientes.apellidos}` : '(Sin cliente)'}</td>
                        <td className="px-3 py-2">{item.vehiculos ? `${item.vehiculos.marca} ${item.vehiculos.modelo}` : '(Sin vehiculo)'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{currency(item.moneda, item.precio_venta)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.plazo_meses}</td>
                        <td className="px-3 py-2">{item.tipo_tasa} {percent(item.valor_tasa)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{currency(item.moneda, item.cuota_ordinaria)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{percent(item.tcea)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{currency(item.moneda, item.van)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">
                {seleccionada
                  ? 'Cotizacion seleccionada. Elige una accion.'
                  : 'Haz click en una fila para seleccionar una cotizacion.'}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={abrirEnSimulador}
                  disabled={!seleccionada}
                  variant="secondary"
                  size="sm"
                  title="Abre esta cotizacion en el simulador con todos sus datos cargados"
                >
                  Editar
                </Button>
                <Button onClick={eliminarSeleccion} disabled={!seleccionada} variant="danger" size="sm">
                  Eliminar
                </Button>
              </div>
            </div>
          </>
        )}

        {error && <p className="border-t border-slate-100 px-5 py-3 text-xs text-red-700">{error}</p>}
      </section>
    </DashboardShell>
  )
}
