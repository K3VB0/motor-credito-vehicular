'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import Button from '@/components/Button'
import { calcularCredito } from '@/lib/motor-financiero'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import {
  Car,
  Calendar,
  Percent,
  PauseCircle,
  Wallet,
  Banknote,
  Users,
  Scale,
  PiggyBank,
} from 'lucide-react'

const initialForm = {
  moneda: 'PEN',
  precioVenta: '',
  pctCuotaInicial: '',
  plazo: '',
  tipoTasa: 'TEA',
  valorTasa: '',
  capitalizacion: 360,
  graciaTotal: 0,
  graciaParcial: 0,
  pctBalon: 0,
  costesIniciales: 0,
  pctSegDesgravamen: 0,
  pctSegRiesgo: 0,
  gpsPorPeriodo: 0,
  portesPorPeriodo: 0,
  gastosAdmPorPeriodo: 0,
  cok: 0,
  clienteId: '',
  vehiculoId: '',
}

// Juegos de datos de prueba para la demostracion. #DEMOS
const demo1 = {
  moneda: 'PEN',
  precioVenta: 16000,
  pctCuotaInicial: 20,
  plazo: 36,
  tipoTasa: 'TNA',
  valorTasa: 15,
  capitalizacion: 360,
  graciaTotal: 3,
  graciaParcial: 3,
  pctBalon: 40,
  costesIniciales: 175,
  pctSegDesgravamen: 0.049,
  pctSegRiesgo: 0.3,
  gpsPorPeriodo: 20,
  portesPorPeriodo: 3.5,
  gastosAdmPorPeriodo: 3.5,
  cok: 50,
  clienteId: '',
  vehiculoId: '',
}

const demo2 = {
  ...demo1,
  plazo: 24,
  pctBalon: 50,
  graciaTotal: 2,
  graciaParcial: 2,
}

const demo3 = {
  ...demo1,
  moneda: 'USD',
  precioVenta: 25000,
  pctCuotaInicial: 25,
  plazo: 48,
  tipoTasa: 'TEA',
  valorTasa: 12.5,
  graciaTotal: 0,
  graciaParcial: 0,
  pctBalon: 35,
  costesIniciales: 300,
  gpsPorPeriodo: 15,
  portesPorPeriodo: 3,
  gastosAdmPorPeriodo: 3,
  cok: 20,
}

const demo4 = {
  ...demo1,
  precioVenta: 45000,
  pctCuotaInicial: 15,
  plazo: 60,
  tipoTasa: 'TNA',
  valorTasa: 14,
  capitalizacion: 12,
  graciaTotal: 0,
  graciaParcial: 2,
  pctBalon: 0,
  costesIniciales: 250,
  cok: 25,
}

// Cada demo referencia por un dato estable (no por id) al cliente (DNI) y al
// vehiculo (marca+modelo) de demostracion, para asociarlos automaticamente.
const demos = [
  { etiqueta: 'Demo 1', datos: demo1, dni: '45678912', vehiculo: 'Chevrolet Spark GT', nota: 'Plan 36 en Soles: TNA 15% diaria, gracia total 3 y parcial 3, cuota final 40%.' },
  { etiqueta: 'Demo 2', datos: demo2, dni: '41236587', vehiculo: 'Chevrolet Spark GT', nota: 'Plan 24 en Soles: TNA 15% diaria, gracia total 2 y parcial 2, cuota final 50%.' },
  { etiqueta: 'Demo 3', datos: demo3, dni: '47851236', vehiculo: 'Mazda CX-30', nota: 'Credito en Dolares: TEA 12.5% directa, 48 cuotas sin gracia, cuota final 35%.' },
  { etiqueta: 'Demo 4', datos: demo4, dni: '43219876', vehiculo: 'Kia Sportage', nota: 'SUV en Soles: TNA 14% capitalizacion mensual, 60 cuotas, gracia parcial 2, sin cuota final.' },
]

const ayuda = { // #AYUDA
  moneda: 'Moneda del prestamo. PEN para Soles, USD para Dolares.',
  precioVenta: 'Precio total del vehiculo antes de descontar la cuota inicial.',
  pctCuotaInicial: 'Porcentaje del precio que el cliente paga al inicio. Ej. 20 significa 20%.',
  plazo: 'Numero total de cuotas mensuales del credito (meses de 30 dias).',
  tipoTasa: 'TEA: tasa efectiva anual. TNA: tasa nominal anual (requiere capitalizacion).',
  valorTasa: 'Valor de la tasa anual en porcentaje. Ej. 18 significa 18%.',
  capitalizacion: 'Periodo de capitalizacion cuando la tasa es TNA. Diaria = 360 capitalizaciones/anio, Mensual = 12.',
  graciaTotal: 'Meses iniciales sin cuota de capital ni interes: el interes se capitaliza al saldo. Los seguros y los costos periodicos se siguen cobrando.',
  graciaParcial: 'Meses iniciales en los que el cliente solo paga el interes, sin amortizar capital. Los seguros y los costos periodicos se siguen cobrando.',
  pctBalon: 'Porcentaje del precio que se paga como cuota final o balon (cuoton) al final del plan. 0 = sin balon.',
  costesIniciales: 'Costes iniciales financiados que se suman al prestamo (notariales, registrales, etc.), en la moneda del credito.',
  pctSegDesgravamen: 'Seguro de desgravamen mensual en porcentaje. Ej. 0.049 significa 0.049% del saldo cada mes.',
  pctSegRiesgo: 'Seguro contra todo riesgo anual en porcentaje sobre el precio del vehiculo. Ej. 0.3 significa 0.3%.',
  gpsPorPeriodo: 'Costo fijo de GPS por cuota, en la moneda del credito.',
  portesPorPeriodo: 'Portes por cuota, en la moneda del credito.',
  gastosAdmPorPeriodo: 'Gastos de administracion por cuota, en la moneda del credito.',
  cok: 'Tasa de descuento anual (costo de oportunidad) usada para el VAN. Ej. 50 significa 50%. Con 0 el VAN es la suma simple de flujos y saldra negativo.',
  clienteId: 'Cliente al que se asocia esta cotizacion. Debe estar registrado en el modulo Clientes.',
  vehiculoId: 'Vehiculo al que se asocia esta cotizacion. Debe estar registrado en el modulo Vehiculos.',
}

// Columnas del cronograma, en el mismo orden y con el mismo significado que el
// modelo de referencia. Se muestran TODAS para que el flujo (y por tanto la TIR,
// la TCEA y el VAN) se pueda reconstruir a mano desde la tabla. #CRONOGRAMA
const cabecerasCF = [
  { k: 'saldoInicialCF', corto: 'S. ini. CF',  ayuda: 'Saldo inicial de la cuota final (cuoton)' },
  { k: 'interesCF',      corto: 'Int. CF',     ayuda: 'Interes devengado por la cuota final' },
  { k: 'amortCF',        corto: 'Amort. CF',   ayuda: 'Amortizacion de la cuota final; solo en el ultimo periodo' },
  { k: 'segDesCF',       corto: 'S. desg. CF', ayuda: 'Seguro de desgravamen de la cuota final' },
  { k: 'saldoFinalCF',   corto: 'S. fin. CF',  ayuda: 'Saldo final de la cuota final' },
]

const cabecerasRegular = [
  { k: 'saldoInicial', corto: 'Saldo inicial', ayuda: 'Saldo inicial de la cuota regular' },
  { k: 'interes',      corto: 'Interes',       ayuda: 'Interes del periodo: -saldo inicial x TEM' },
  { k: 'cuota',        corto: 'Cuota',         ayuda: 'Cuota francesa. INCLUYE el seguro de desgravamen: PMT(TEM + seg. desgravamen; cuotas restantes; saldo)' },
  { k: 'amortizacion', corto: 'Amortiz.',      ayuda: 'Amortizacion = Cuota - Interes - Seguro de desgravamen' },
  { k: 'segDes',       corto: 'S. desgrav.',   ayuda: 'Seguro de desgravamen del periodo: -saldo inicial x tasa' },
  { k: 'segRie',       corto: 'S. riesgo',     ayuda: 'Seguro contra todo riesgo del periodo' },
  { k: 'gps',          corto: 'GPS',           ayuda: 'Costo de GPS del periodo' },
  { k: 'portes',       corto: 'Portes',        ayuda: 'Portes del periodo' },
  { k: 'gasAdm',       corto: 'Gastos adm.',   ayuda: 'Gastos de administracion del periodo' },
  { k: 'saldoFinal',   corto: 'Saldo final',   ayuda: 'Saldo final de la cuota regular' },
]

function currency(moneda, value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: moneda === 'USD' ? 'USD' : 'PEN',
    minimumFractionDigits: 2,
    // `value + 0` normaliza el -0 que producen los productos por cero del motor.
  }).format(Number.isFinite(value) ? value + 0 : 0)
}

function Money({ moneda, v, fuerte = false, tenue = false }) {
  return (
    <td className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${fuerte ? 'font-medium text-slate-950' : ''} ${tenue ? 'text-slate-500' : ''}`}>
      {currency(moneda, v)}
    </td>
  )
}

function percent(value) {
  return `${((Number.isFinite(value) ? value : 0) * 100).toFixed(2)}%`
}

function numberValue(value) {
  return Number(value || 0)
}

export default function SimuladorPage() {
  const [form, setForm] = useState(initialForm)
  const [clientes, setClientes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editandoId, setEditandoId] = useState(null) // id de la cotizacion abierta desde el historial

  useEffect(() => {
    if (!supabaseConfigurado) return
    let cancelado = false
    async function cargar() {
      const [{ data: cs }, { data: vs }] = await Promise.all([
        supabase.from('clientes').select('id, nombres, apellidos, dni').order('creado_en', { ascending: false }),
        supabase.from('vehiculos').select('id, marca, modelo, precio_venta, moneda').order('creado_en', { ascending: false }),
      ])
      if (cancelado) return
      setClientes(cs || [])
      setVehiculos(vs || [])
    }
    cargar()
    return () => { cancelado = true }
  }, [])

  // Si se llega desde el historial (/simulador?sim=<id>), cargar esa simulacion.
  useEffect(() => {
    if (!supabaseConfigurado) return
    const simId = new URLSearchParams(window.location.search).get('sim')
    if (!simId) return
    let cancelado = false
    const aPorcentaje = v => Number(((Number(v) || 0) * 100).toFixed(6))
    async function cargarSimulacion() {
      const { data: s, error: err } = await supabase
        .from('simulaciones')
        .select('*')
        .eq('id', simId)
        .single()
      if (cancelado || err || !s) return
      setForm({
        moneda:              s.moneda || 'PEN',
        precioVenta:         Number(s.precio_venta) || '',
        pctCuotaInicial:     aPorcentaje(s.pct_cuota_inicial),
        plazo:               s.plazo_meses || '',
        tipoTasa:            s.tipo_tasa || 'TEA',
        valorTasa:           aPorcentaje(s.valor_tasa),
        capitalizacion:      Number(s.capitalizacion) === 12 ? 12 : 360,
        graciaTotal:         s.gracia_total || 0,
        graciaParcial:       s.gracia_parcial || 0,
        pctBalon:            aPorcentaje(s.pct_balon),
        costesIniciales:     Number(s.costes_iniciales) || 0,
        pctSegDesgravamen:   aPorcentaje(s.pct_seg_desgravamen),
        pctSegRiesgo:        aPorcentaje(s.pct_seg_riesgo),
        gpsPorPeriodo:       Number(s.gps) || 0,
        portesPorPeriodo:    Number(s.portes) || 0,
        gastosAdmPorPeriodo: Number(s.gastos_adm) || 0,
        cok:                 aPorcentaje(s.cok),
        clienteId:           s.cliente_id || '',
        vehiculoId:          s.vehiculo_id || '',
      })
      setEditandoId(simId) // se guardara sobre esta cotizacion, no como nueva
    }
    cargarSimulacion()
    return () => { cancelado = true }
  }, [])

  const calculo = useMemo(() => {
    try {
      if ([form.precioVenta, form.plazo, form.valorTasa].some(value => value === '')) {
        return { resultado: null, error: '' }
      }

      const camposNumericos = [
        'precioVenta', 'pctCuotaInicial', 'plazo', 'valorTasa', 'capitalizacion',
        'graciaTotal', 'graciaParcial', 'pctBalon', 'costesIniciales',
        'pctSegDesgravamen', 'pctSegRiesgo', 'gpsPorPeriodo', 'portesPorPeriodo',
        'gastosAdmPorPeriodo', 'cok',
      ]
      const valores = Object.fromEntries(camposNumericos.map(name => [name, numberValue(form[name])]))
      if (Object.values(valores).some(value => !Number.isFinite(value))) {
        throw new Error('Todos los valores numericos deben ser validos y finitos.')
      }

      const { plazo, precioVenta, valorTasa, graciaTotal, graciaParcial } = valores
      if (precioVenta <= 0) throw new Error('El precio del vehiculo debe ser mayor que cero.')
      if (plazo <= 0) throw new Error('El plazo debe ser mayor que cero.')
      if (valorTasa < 0) throw new Error('La tasa de interes no puede ser negativa.')
      if (graciaTotal < 0 || graciaParcial < 0) {
        throw new Error('Los periodos de gracia no pueden ser negativos.')
      }
      if (Object.values(valores).some(value => value < 0)) {
        throw new Error('Los porcentajes, seguros y costos no pueden ser negativos.')
      }
      if (!Number.isInteger(plazo) || !Number.isInteger(graciaTotal) || !Number.isInteger(graciaParcial)) {
        throw new Error('El plazo y los meses de gracia deben ser numeros enteros.')
      }
      if (plazo > 120) throw new Error('El plazo no puede superar 120 meses.')
      if (graciaTotal + graciaParcial >= plazo) {
        throw new Error('La suma de las gracias total y parcial debe ser menor que el plazo.')
      }
      if (valorTasa > 100) throw new Error('La tasa anual no puede superar 100%.')
      if (valores.pctSegDesgravamen > 10) throw new Error('El desgravamen mensual no puede superar 10%.')
      if (valores.pctSegRiesgo > 100) throw new Error('El seguro de riesgo no puede superar 100%.')
      if (valores.cok > 1000) throw new Error('El COK anual no puede superar 1000%.')

      const pctCI = valores.pctCuotaInicial
      const pctCF = valores.pctBalon
      if (pctCI > 100 || pctCF > 100) {
        throw new Error('La cuota inicial y la cuota final no pueden superar el 100% del precio.')
      }
      if (pctCI + pctCF >= 100) {
        throw new Error('La cuota inicial mas la cuota final debe ser menor al 100% del precio.')
      }
      const capitalizacion = valores.capitalizacion
      if (form.tipoTasa === 'TNA' && !CAPITALIZACIONES.some(opcion => opcion.value === capitalizacion)) {
        throw new Error('Selecciona un periodo de capitalizacion valido para la TNA.')
      }

      return {
        resultado: calcularCredito({
          precioVenta,
          pctCuotaInicial: pctCI / 100,
          plazo,
          tipoTasa: form.tipoTasa,
          valorTasa: valorTasa / 100,
          capitalizacion,
          graciaTotal,
          graciaParcial,
          pctBalon: pctCF / 100,
          // Costos y seguros
          costesIniciales: valores.costesIniciales,
          pctSegDesgravamen: valores.pctSegDesgravamen / 100,
          pctSegRiesgo: valores.pctSegRiesgo / 100,
          gpsPorPeriodo: valores.gpsPorPeriodo,
          portesPorPeriodo: valores.portesPorPeriodo,
          gastosAdmPorPeriodo: valores.gastosAdmPorPeriodo,
          cok: valores.cok / 100,
        }),
        error: '',
      }
    } catch (calculationError) {
      return { resultado: null, error: calculationError.message }
    }
  }, [form])

  const { resultado, error } = calculo

  function update(name, value) {
    setForm(current => {
      const next = { ...current, [name]: value }
      // Si se edita a mano el precio o la moneda, la oferta ya no corresponde
      // al vehiculo asociado; se quita la asociacion para evitar inconsistencias.
      if ((name === 'precioVenta' || name === 'moneda') && current.vehiculoId) {
        next.vehiculoId = ''
      }
      return next
    })
  }

  function usarDatosEjemplo(demo) {
    // Asociar automaticamente el cliente (por DNI) y el vehiculo de demostracion.
    // El vehiculo se empareja por marca+modelo y ademas por precio y moneda, para
    // no confundirlo con otro registro de igual nombre pero distinto precio.
    const cliente = clientes.find(c => c.dni === demo.dni)
    const vehiculo = vehiculos.find(v =>
      `${v.marca} ${v.modelo}` === demo.vehiculo &&
      Number(v.precio_venta) === demo.datos.precioVenta &&
      (v.moneda || 'PEN') === demo.datos.moneda
    )
    setForm({
      ...demo.datos,
      clienteId:  cliente ? cliente.id : '',
      vehiculoId: vehiculo ? vehiculo.id : '',
    })
    setEditandoId(null) // un demo siempre se guarda como cotizacion nueva
    if (!cliente || !vehiculo) {
      setMensaje('Datos cargados. Registra los clientes y vehiculos de demostracion para asociarlos automaticamente.')
    } else {
      setMensaje('')
    }
  }

  function limpiarFormulario() {
    setForm(initialForm)
    setEditandoId(null)
    setMensaje('')
  }

  function aplicarVehiculo(id) {
    const v = vehiculos.find(x => x.id === id)
    setForm(current => ({
      ...current,
      vehiculoId: id,
      ...(v && v.precio_venta ? { precioVenta: v.precio_venta } : {}),
      ...(v && v.moneda ? { moneda: v.moneda } : {}),
    }))
  }

  async function guardarSimulacion() { // #GUARDAR
    if (!resultado) return
    setMensaje('')

    if (!supabaseConfigurado) {
      setMensaje('Supabase no esta configurado. Define las variables de entorno.')
      return
    }

    const { data: sesion } = await supabase.auth.getUser()
    const userId = sesion?.user?.id
    if (!userId) {
      setMensaje('Debes iniciar sesion para guardar la cotizacion.')
      return
    }

    const sinAsociar = [!form.clienteId && 'un cliente', !form.vehiculoId && 'un vehiculo'].filter(Boolean)
    if (sinAsociar.length && !window.confirm(`No has asociado ${sinAsociar.join(' ni ')} a esta cotizacion. Guardarla de todas formas?`)) {
      return
    }

    setGuardando(true)
    const payload = {
      usuario_id:        userId,
      cliente_id:        form.clienteId || null,
      vehiculo_id:       form.vehiculoId || null,
      moneda:            form.moneda,
      precio_venta:      numberValue(form.precioVenta),
      pct_cuota_inicial: numberValue(form.pctCuotaInicial) / 100,
      cuota_inicial:     resultado.capital.cuotaInicial,
      capital_total:     resultado.capital.capitalTotal,
      plazo_meses:       numberValue(form.plazo),
      tipo_tasa:         form.tipoTasa,
      valor_tasa:        numberValue(form.valorTasa) / 100,
      capitalizacion:    form.tipoTasa === 'TNA' ? (numberValue(form.capitalizacion) || 360) : 360,
      gracia_total:      numberValue(form.graciaTotal),
      gracia_parcial:    numberValue(form.graciaParcial),
      pct_balon:         numberValue(form.pctBalon) / 100,
      cuota_balon:       resultado.capital.cuotaBalon || 0,
      cuota_ordinaria:   resultado.cuotaOrdinaria,
      tea:               resultado.tasas.TEA,
      tep:               resultado.tasas.TEP,
      tcea:              resultado.tasas.TCEA,
      van:               resultado.indicadores.VAN,
      tir_mensual:       resultado.tasas.TIR_mensual,
      total_interes:     resultado.indicadores.totalInteres,
      total_pagado:      resultado.indicadores.totalCuotas,
      costes_iniciales:    numberValue(form.costesIniciales),
      cuota_final:         resultado.capital.cuotaFinal,
      pct_seg_desgravamen: numberValue(form.pctSegDesgravamen) / 100,
      pct_seg_riesgo:      numberValue(form.pctSegRiesgo) / 100,
      gps:                 numberValue(form.gpsPorPeriodo),
      portes:              numberValue(form.portesPorPeriodo),
      gastos_adm:          numberValue(form.gastosAdmPorPeriodo),
      cok:                 numberValue(form.cok) / 100,
    }

    // Si la cotizacion se abrio desde el historial, se ACTUALIZA; si no, se crea nueva.
    let sim, err
    if (editandoId) {
      const res = await supabase.from('simulaciones').update(payload).eq('id', editandoId).select('id').single()
      sim = res.data; err = res.error
      // Se reemplaza el cronograma anterior por el recalculado.
      if (!err) {
        const { error: errDel } = await supabase.from('cronograma').delete().eq('simulacion_id', editandoId)
        if (errDel) err = errDel
      }
    } else {
      const res = await supabase.from('simulaciones').insert(payload).select('id').single()
      sim = res.data; err = res.error
    }

    if (err) {
      setGuardando(false)
      setMensaje('No se pudo guardar la cotizacion. Revisa los datos e intenta nuevamente.')
      return
    }

    const filasCronograma = resultado.cronograma.map(row => ({
      simulacion_id:    sim.id,
      numero_cuota:     row.numeroCuota,
      tipo_pg:          row.tipoPG,
      saldo_inicial:    row.saldoInicial,
      interes:          row.interes,
      amortizacion:     row.amortizacion,
      cuota:            row.cuota,
      saldo_final:      row.saldoFinal,
      saldo_inicial_cf: row.saldoInicialCF,
      interes_cf:       row.interesCF,
      amort_cf:         row.amortCF,
      seg_des_cf:       row.segDesCF,
      saldo_final_cf:   row.saldoFinalCF,
      seg_des:          row.segDes,
      seg_rie:          row.segRie,
      gps:              row.gps,
      portes:           row.portes,
      gastos_adm:       row.gasAdm,
    }))

    const { error: errCron } = await supabase.from('cronograma').insert(filasCronograma)
    setGuardando(false)
    if (errCron) {
      setMensaje('La cotizacion se guardo, pero hubo un problema al registrar el cronograma.')
    } else if (editandoId) {
      setMensaje('✓ Cambios guardados correctamente.')
    } else {
      setEditandoId(sim.id) // ya existe: si se vuelve a guardar, se actualiza (no se duplica)
      setMensaje('✓ Cotizacion guardada correctamente.')
    }
  }

  return (
    <DashboardShell
      title="Simulador de credito vehicular"
      subtitle="Metodo frances vencido ordinario con Compra Inteligente."
    >
      <div className="grid h-full min-h-0 gap-4 [@media(min-width:1700px)]:grid-cols-[520px_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 [@media(min-width:1700px)]:max-h-full [@media(min-width:1700px)]:overflow-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Datos de entrada</h2>
            <div className="flex gap-2">
              {demos.map(demo => (
                <Button
                  key={demo.etiqueta}
                  onClick={() => usarDatosEjemplo(demo)}
                  variant="secondary"
                  size="sm"
                  title={demo.nota}
                >
                  {demo.etiqueta}
                </Button>
              ))}
              <Button
                onClick={limpiarFormulario}
                variant="ghost"
                size="sm"
                title="Vacia todos los campos del formulario"
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">

            <Group title="Asociacion" icon={Users} accent="indigo">
              <Select label="Cliente" name="clienteId" value={form.clienteId} onChange={update} help={ayuda.clienteId} className="sm:col-span-2">
                <option value="">(Sin asociar)</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombres} {c.apellidos} - DNI {c.dni}</option>
                ))}
              </Select>
              <Select label="Vehiculo" name="vehiculoId" value={form.vehiculoId} onChange={(_, v) => aplicarVehiculo(v)} help={ayuda.vehiculoId} className="sm:col-span-2">
                <option value="">(Sin asociar)</option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.marca} {v.modelo} - {currency(v.moneda || 'PEN', v.precio_venta)}</option>
                ))}
              </Select>
            </Group>

            <Group title="Valor del vehiculo" icon={Car} accent="amber">
              <Select label="Moneda" name="moneda" value={form.moneda} onChange={update} help={ayuda.moneda}>
                <option value="PEN">Soles</option>
                <option value="USD">Dolares</option>
              </Select>
              <Input label="Precio del vehiculo" name="precioVenta" value={form.precioVenta} onChange={update} help={ayuda.precioVenta} />
              <Input label="Cuota inicial (%)" name="pctCuotaInicial" value={form.pctCuotaInicial} onChange={update} help={ayuda.pctCuotaInicial} />
            </Group>

            <Group title="Plazo de pago" icon={Calendar} accent="sky">
              <Input label="Plazo mensual" name="plazo" value={form.plazo} onChange={update} help={ayuda.plazo} />
            </Group>

            <Group title="Tasa de interes" icon={Percent} accent="emerald">
              <Select label="Tipo de tasa" name="tipoTasa" value={form.tipoTasa} onChange={update} help={ayuda.tipoTasa}>
                <option value="TEA">Efectiva anual</option>
                <option value="TNA">Nominal anual</option>
              </Select>
              <Input label="Tasa anual (%)" name="valorTasa" value={form.valorTasa} onChange={update} help={ayuda.valorTasa} />
              {form.tipoTasa === 'TNA' && (
                <Select label="Capitalizacion" name="capitalizacion" value={form.capitalizacion} onChange={update} help={ayuda.capitalizacion}>
                  <option value={360}>Diaria</option>
                  <option value={12}>Mensual</option>
                </Select>
              )}
            </Group>

            <Group title="Periodos de gracia" icon={PauseCircle} accent="rose">
              <Input label="Gracia total (meses)" name="graciaTotal" value={form.graciaTotal} onChange={update} help={ayuda.graciaTotal} />
              <Input label="Gracia parcial (meses)" name="graciaParcial" value={form.graciaParcial} onChange={update} help={ayuda.graciaParcial} />
            </Group>

            <Group title="Compra Inteligente" icon={Wallet} accent="violet">
              <Input label="Cuota final / balon (%)" name="pctBalon" value={form.pctBalon} onChange={update} help={ayuda.pctBalon} />
            </Group>

            <Group title="Costos y seguros" icon={Banknote} accent="amber">
              <Input label="Costes iniciales financiados" name="costesIniciales" value={form.costesIniciales} onChange={update} help={ayuda.costesIniciales} />
              <Input label="Seguro desgravamen (% mensual)" name="pctSegDesgravamen" value={form.pctSegDesgravamen} onChange={update} help={ayuda.pctSegDesgravamen} />
              <Input label="Seguro riesgo (% anual)" name="pctSegRiesgo" value={form.pctSegRiesgo} onChange={update} help={ayuda.pctSegRiesgo} />
              <Input label="GPS por periodo" name="gpsPorPeriodo" value={form.gpsPorPeriodo} onChange={update} help={ayuda.gpsPorPeriodo} />
              <Input label="Portes por periodo" name="portesPorPeriodo" value={form.portesPorPeriodo} onChange={update} help={ayuda.portesPorPeriodo} />
              <Input label="Gastos adm. por periodo" name="gastosAdmPorPeriodo" value={form.gastosAdmPorPeriodo} onChange={update} help={ayuda.gastosAdmPorPeriodo} />
              <Input label="Tasa de descuento COK (% anual)" name="cok" value={form.cok} onChange={update} help={ayuda.cok} />
            </Group>

          </div>

          {error && (
            <p role="alert" aria-live="polite" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              No se puede generar el cronograma: {error}
            </p>
          )}

          <Button
            onClick={guardarSimulacion}
            disabled={guardando || !resultado}
            variant="primary"
            fullWidth
            className="mt-4"
          >
            {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar cotizacion'}
          </Button>

          {mensaje && (
            <p className={`mt-3 rounded-md px-3 py-2 text-xs ${mensaje.startsWith('Error') || mensaje.startsWith('Debes') || mensaje.startsWith('Supabase') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {mensaje}
            </p>
          )}
        </section>

        {resultado && (
          <section className="min-w-0 space-y-4 [@media(min-width:1700px)]:flex [@media(min-width:1700px)]:min-h-0 [@media(min-width:1700px)]:flex-col">
            <div className="grid gap-3 sm:grid-cols-2 [@media(min-width:1500px)]:grid-cols-4">
              <Metric label="Monto del prestamo" value={currency(form.moneda, resultado.capital.montoPrestamo)} icon={Banknote} accent="amber"
                title="Precio - cuota inicial + costes iniciales financiados. Es el efectivo que recibe el cliente en el periodo 0." />
              <Metric label="Cuota ordinaria" value={currency(form.moneda, resultado.cuotaOrdinaria)} icon={Calendar} accent="sky"
                title="Cuota francesa nivelada. INCLUYE el seguro de desgravamen: PMT(TEM + tasa de desgravamen; cuotas restantes; saldo)." />
              <Metric label="TCEA" value={percent(resultado.indicadores.TCEA)} icon={Scale} accent="emerald"
                title="(1 + TIR mensual)^12 - 1, sobre el flujo completo del deudor." />
              <Metric label="VAN deudor" value={currency(form.moneda, resultado.indicadores.VAN)} icon={PiggyBank} accent="violet"
                title="Prestamo + valor presente de los flujos, descontados al COK mensual." />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-base font-semibold">Resumen financiero</h2>
              </div>
              <div className="grid gap-3 p-4 text-sm md:grid-cols-3 xl:grid-cols-4">
                <Summary label="TEA" value={percent(resultado.tasas.TEA)} />
                <Summary label="TEM mensual" value={percent(resultado.tasas.TEM)} />
                <Summary label="TIR mensual" value={percent(resultado.tasas.TIR_mensual)} />
                <Summary label="Cuota inicial" value={currency(form.moneda, resultado.capital.cuotaInicial)} />
                <Summary label="Cuota balon" value={currency(form.moneda, resultado.capital.cuotaBalon)} />
                <Summary label="Total pagado" value={currency(form.moneda, resultado.indicadores.totalCuotas)} />
                <Summary label="Capital del vehiculo" value={currency(form.moneda, resultado.capital.capitalTotal)} />
                <Summary label="Costos financiados" value={currency(form.moneda, numberValue(form.costesIniciales))} />
                <Summary label="VP de la cuota final" value={currency(form.moneda, resultado.capital.vpCuotaFinal)} />
                <Summary label="Saldo a financiar" value={currency(form.moneda, resultado.capital.saldoFinanciar)} />
                <Summary label="Suma de cuotas del cronograma" value={currency(form.moneda, resultado.totales.sumaCuotasCronograma)} />
                <Summary label="Desgravamen fuera de cuota (gracia)" value={currency(form.moneda, resultado.totales.desgravamenFueraCuota)} />
                <Summary label="Pago final balon" value={currency(form.moneda, resultado.totales.pagoFinalBalon)} />
                <Summary label="Seguro de riesgo" value={currency(form.moneda, resultado.totales.segRiesgo)} />
                <Summary label="GPS" value={currency(form.moneda, resultado.totales.gps)} />
                <Summary label="Portes" value={currency(form.moneda, resultado.totales.portes)} />
                <Summary label="Gastos administrativos" value={currency(form.moneda, resultado.totales.gastosAdm)} />
                <Summary label="Interes regular generado" value={currency(form.moneda, resultado.totales.interesesRegular)} />
                <Summary label="Interes del balon" value={currency(form.moneda, resultado.totales.interesesBalon)} />
                <Summary label="Diferencia de conciliacion" value={currency(form.moneda, resultado.totales.diferenciaReconciliacion)} />
              </div>
              <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
                Total pagado = cuotas del cronograma + desgravamen cobrado fuera de cuota durante gracia + pago final balon
                + seguro de riesgo + GPS + portes + gastos administrativos. La cuota inicial y el desembolso del periodo 0 no se incluyen.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white [@media(min-width:1700px)]:flex [@media(min-width:1700px)]:min-h-0 [@media(min-width:1700px)]:flex-1 [@media(min-width:1700px)]:flex-col">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-base font-semibold">Cronograma de pagos</h2>
              </div>
              <div className="max-h-[520px] overflow-auto [@media(min-width:1700px)]:max-h-none [@media(min-width:1700px)]:flex-1">
                <table className="w-max min-w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-2 py-2" title="Numero de cuota">N</th>
                      <th className="whitespace-nowrap px-2 py-2" title="Periodo de gracia: T total, P parcial, S cuota normal">PG</th>
                      {cabecerasCF.map(h => (
                        <th key={h.k} className="whitespace-nowrap px-2 py-2 text-right text-violet-600" title={h.ayuda}>{h.corto}</th>
                      ))}
                      {cabecerasRegular.map(h => (
                        <th key={h.k} className="whitespace-nowrap px-2 py-2 text-right" title={h.ayuda}>{h.corto}</th>
                      ))}
                      <th className="whitespace-nowrap px-2 py-2 text-right" title="Flujo de caja del deudor en el periodo. Es la fila que alimenta la TIR, la TCEA y el VAN.">Flujo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultado.cronograma.map(row => (
                      <tr key={row.numeroCuota} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.numeroCuota}</td>
                        <td className="whitespace-nowrap px-2 py-2">{row.tipoPG}</td>
                        {cabecerasCF.map(h => <Money key={h.k} moneda={form.moneda} v={row[h.k]} tenue />)}
                        {cabecerasRegular.map(h => <Money key={h.k} moneda={form.moneda} v={row[h.k]} fuerte={h.k === 'cuota'} />)}
                        <Money moneda={form.moneda} v={row.flujo} fuerte />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
                La cuota incluye el seguro de desgravamen: <strong>Cuota = Interes + Amortizacion + Seg. desgravamen</strong>.
                El flujo suma la cuota, los costos del periodo y, en el ultimo, la cuota balon. Las columnas moradas
                siguen la cuota final (cuoton) en paralelo.
              </p>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  )
}

function HelpDot({ help }) {
  if (!help) return null
  return (
    <span
      title={help}
      aria-label={help}
      className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500"
    >?</span>
  )
}

function Input({ label, name, value, onChange, help }) {
  return (
    <label className="block">
      <span className="flex items-center text-sm font-medium text-slate-700">
        {label}
        <HelpDot help={help} />
      </span>
      <input
        type="number"
        value={value}
        onChange={event => onChange(name, event.target.value)}
        title={help}
        min={0}
        step="any"
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function Select({ label, name, value, onChange, help, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center text-sm font-medium text-slate-700">
        {label}
        <HelpDot help={help} />
      </span>
      <select
        value={value}
        onChange={event => onChange(name, event.target.value)}
        title={help}
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      >
        {children}
      </select>
    </label>
  )
}

const accentMap = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-200' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-600',     ring: 'ring-sky-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    ring: 'ring-rose-200' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  ring: 'ring-violet-200' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  ring: 'ring-indigo-200' },
}

function Group({ title, icon: Icon, accent = 'sky', children }) {
  const c = accentMap[accent] || accentMap.sky
  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${c.bg}`}>
      <div className="mb-3 flex items-center gap-3">
        {Icon && (
          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-2 ${c.ring} ${c.text}`}>
            <Icon size={20} strokeWidth={1.75} />
          </span>
        )}
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  )
}

function Metric({ label, value, icon: Icon, accent = 'sky', title }) {
  const c = accentMap[accent] || accentMap.sky
  return (
    <div title={title} className="flex items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-3">
      {Icon && (
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ${c.bg} ${c.text}`}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase leading-tight text-slate-500">{label}</p>
        <p className="mt-1 break-words text-base font-semibold leading-tight tabular-nums text-slate-950">{value}</p>
      </div>
    </div>
  )
}

function Summary({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  )
}
