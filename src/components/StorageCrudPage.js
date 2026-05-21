'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import Button from '@/components/Button'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

// =============================================================================
// CRUD generico contra Supabase.
// Mantiene el nombre StorageCrudPage por compatibilidad con clientes y vehiculos.
// Props:
//   table         - nombre de la tabla en Supabase
//   title, subtitle, emptyText
//   fields        - [{ name, label, type, placeholder, defaultValue, help, required }]
//   columnMap     - opcional, mapeo nombreCampo -> nombre_columna_db (snake_case)
// =============================================================================

function aDb(row, columnMap) {
  if (!columnMap) return row
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    out[columnMap[k] || k] = v
  }
  return out
}

function aUi(row, columnMap) {
  if (!columnMap) return row
  const inverso = Object.fromEntries(Object.entries(columnMap).map(([k, v]) => [v, k]))
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    out[inverso[k] || k] = v
  }
  return out
}

export default function StorageCrudPage({
  table,
  title,
  subtitle,
  fields,
  emptyText,
  columnMap,
}) {
  const initialForm = useMemo(() => {
    return Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? '']))
  }, [fields])

  const [items, setItems] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [seleccionId, setSeleccionId] = useState(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)
  const [error, setError] = useState(supabaseConfigurado ? '' : 'Supabase no esta configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    if (!supabaseConfigurado) return
    let cancelado = false
    async function cargar() {
      const { data, error: err } = await supabase
        .from(table)
        .select('*')
        .order('creado_en', { ascending: false })
      if (cancelado) return
      if (err) {
        setError(err.message)
      } else {
        setItems((data || []).map(row => aUi(row, columnMap)))
        setError('')
      }
      setCargando(false)
    }
    cargar()
    return () => { cancelado = true }
  }, [table, columnMap, recarga])

  const recargar = useCallback(() => setRecarga(n => n + 1), [])

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!supabaseConfigurado) return

    const { data: sesion } = await supabase.auth.getUser()
    const userId = sesion?.user?.id
    if (!userId) {
      setError('Debes iniciar sesion antes de guardar.')
      return
    }

    const payload = aDb(form, columnMap)

    if (editingId) {
      const { error: err } = await supabase
        .from(table)
        .update(payload)
        .eq('id', editingId)
      if (err) { setError(err.message); return }
    } else {
      const { error: err } = await supabase
        .from(table)
        .insert({ ...payload, usuario_id: userId })
      if (err) { setError(err.message); return }
    }
    resetForm()
    recargar()
  }

  function editar(item) {
    setEditingId(item.id)
    setForm(Object.fromEntries(fields.map(field => [field.name, item[field.name] ?? ''])))
  }

  async function eliminar(id) {
    if (!supabaseConfigurado) return
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) { setError(err.message); return }
    if (editingId === id) resetForm()
    if (seleccionId === id) setSeleccionId(null)
    recargar()
  }

  const itemSeleccionado = items.find(item => item.id === seleccionId) || null

  function editarSeleccion() {
    if (itemSeleccionado) editar(itemSeleccionado)
  }

  function eliminarSeleccion() {
    if (itemSeleccionado && window.confirm('Eliminar este registro? Esta accion no se puede deshacer.')) {
      eliminar(itemSeleccionado.id)
    }
  }

  function toggleSeleccion(id) {
    setSeleccionId(actual => (actual === id ? null : id))
  }

  return (
    <DashboardShell title={title} subtitle={subtitle}>
      <div className="grid gap-6 [@media(min-width:1700px)]:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">{editingId ? 'Editar registro' : 'Nuevo registro'}</h2>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {fields.map(field => (
              <label key={field.name} className="block">
                <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
                  {field.label}
                  {field.help && (
                    <span
                      title={field.help}
                      aria-label={field.help}
                      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500"
                    >?</span>
                  )}
                </span>
                <input
                  type={field.type || 'text'}
                  value={form[field.name]}
                  onChange={event => updateField(field.name, event.target.value)}
                  required={field.required !== false}
                  placeholder={field.placeholder}
                  title={field.help}
                  min={field.type === 'number' ? (field.min ?? 0) : undefined}
                  max={field.max}
                  step={field.step}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}

            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                {editingId ? 'Guardar cambios' : 'Guardar'}
              </Button>
              {editingId && (
                <Button onClick={resetForm} variant="ghost">
                  Cancelar
                </Button>
              )}
            </div>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-base font-semibold">Registros guardados</h2>
            <p className="text-xs text-slate-500">
              {items.length > 0 && `${items.length} registro${items.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {cargando ? (
            <p className="p-5 text-sm text-slate-500">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">{emptyText}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    {fields.map(field => (
                      <col key={field.name} style={field.colWidth ? { width: field.colWidth } : undefined} />
                    ))}
                  </colgroup>
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      {fields.map(field => (
                        <th
                          key={field.name}
                          className={`px-2 py-2 ${field.type === 'number' ? 'text-right' : ''}`}
                        >
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const seleccionado = item.id === seleccionId
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleSeleccion(item.id)}
                          className={`cursor-pointer transition-colors ${
                            seleccionado
                              ? 'fila-seleccionada'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {fields.map(field => {
                            const valor = item[field.name] ?? ''
                            const numeric = field.type === 'number'
                            return (
                              <td
                                key={field.name}
                                className="overflow-hidden px-2 py-2 align-middle text-slate-700"
                                title={valor !== '' ? String(valor) : undefined}
                              >
                                <div className={`truncate ${numeric ? 'text-right tabular-nums' : ''}`}>
                                  {valor}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  {itemSeleccionado
                    ? 'Registro seleccionado. Elige una accion.'
                    : 'Haz click en una fila para seleccionar un registro.'}
                </p>
                <div className="flex gap-2">
                  <Button onClick={editarSeleccion} disabled={!itemSeleccionado} variant="secondary" size="sm">
                    Editar
                  </Button>
                  <Button onClick={eliminarSeleccion} disabled={!itemSeleccionado} variant="danger" size="sm">
                    Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  )
}
