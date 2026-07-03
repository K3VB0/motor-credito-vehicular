// motor-financiero.js
// Cálculo del crédito vehicular por método francés vencido (base 30/360):
// tasas, cronograma con cuota balón a valor presente, cuota regular con PMT
// e indicadores VAN, TIR y TCEA (incluye seguros y costos periódicos).


// Utilitarios financieros

/** PMT: cuota vencida (fv=0, type=0). Devuelve valor negativo (pago). */
function PMT(rate, nper, pv) {
  if (rate === 0) return -pv / nper;
  const f = Math.pow(1 + rate, nper);
  return -(rate * pv * f) / (f - 1);
}


// 1. CONVERSIÓN DE TASAS

/**
 * TNA -> TEA según el período de capitalización, o TEA directa.
 *   capPorAnio: capitalizaciones por año (Diaria = 360, Mensual = 12).
 *   TEA = (1 + TNA/capPorAnio)^capPorAnio - 1
 */
export function obtenerTasas(tipoTasa, tasa, { capPorAnio = 360, frecuencia = 30, diasPorAnio = 360 } = {}) {
  const TEA = tipoTasa === 'TNA'
    ? Math.pow(1 + tasa / capPorAnio, capPorAnio) - 1
    : tasa;
  const TEM = Math.pow(1 + TEA, frecuencia / diasPorAnio) - 1; // 30/360
  return { TEA, TEM };
}


// 2. FUNCIÓN PRINCIPAL

/**
 * @param {object} p
 * @param {number} p.precioVenta        - Precio de venta del vehículo (PV)
 * @param {number} p.plazo              - Nº total de cuotas regulares (N), p.ej. 36
 * @param {number} p.pctCuotaInicial    - % cuota inicial (pCI), decimal
 * @param {number} p.pctCuotaFinal      - % cuota final / balón (pCF), decimal
 * @param {string} p.tipoTasa           - 'TNA' | 'TEA'
 * @param {number} p.tasa               - valor de la tasa (decimal)
 * @param {number} [p.capPorAnio=360]   - capitalizaciones/año si TNA (Diaria=360, Mensual=12)
 * @param {number} [p.frecuencia=30]    - días por cuota
 * @param {number} [p.diasPorAnio=360]
 * @param {number} [p.graciaTotal=0]    - nº de períodos de gracia total (T)
 * @param {number} [p.graciaParcial=0]  - nº de períodos de gracia parcial (P)
 * @param {number} [p.costesIniciales=0]- suma de costes iniciales financiados (notariales, registrales, ...)
 * @param {number} [p.pctSegDesgravamen=0] - % seguro de desgravamen mensual (pSegDes)
 * @param {number} [p.pctSegRiesgo=0]   - % seguro contra todo riesgo anual (pSegRie)
 * @param {number} [p.gpsPorPeriodo=0]
 * @param {number} [p.portesPorPeriodo=0]
 * @param {number} [p.gastosAdmPorPeriodo=0]
 * @param {number} [p.cok=0]            - tasa de descuento anual (COK) para el VAN
 */
export function calcularCredito(p) {
  const {
    precioVenta, plazo, pctCuotaInicial,
    tipoTasa, frecuencia = 30, diasPorAnio = 360,
    graciaTotal = 0, graciaParcial = 0, costesIniciales = 0,
    pctSegDesgravamen = 0, pctSegRiesgo = 0,
    gpsPorPeriodo = 0, portesPorPeriodo = 0, gastosAdmPorPeriodo = 0, cok = 0,
  } = p;
  // Aliases retrocompatibles con el formulario anterior:
  const tasa          = p.tasa          ?? p.valorTasa ?? 0;          // 'valorTasa'
  const pctCuotaFinal = p.pctCuotaFinal ?? p.pctBalon  ?? 0;          // 'pctBalon'
  const capPorAnio    = p.capPorAnio    ?? p.capitalizacion ?? 360;   // 'capitalizacion'

  const N    = plazo;
  const NCxA = diasPorAnio / frecuencia;                 // cuotas por año (12)

  // Tasas
  const { TEA, TEM } = obtenerTasas(tipoTasa, tasa, { capPorAnio, frecuencia, diasPorAnio });
  const pSegDesPer = pctSegDesgravamen * frecuencia / 30; // por período
  const segRiePer  = pctSegRiesgo * precioVenta / NCxA;   // por período

  // Capitales
  const cuotaInicial  = pctCuotaInicial * precioVenta;    // CI
  const cuotaFinal    = pctCuotaFinal * precioVenta;      // CF (cuotón)
  const montoPrestamo = precioVenta - cuotaInicial + costesIniciales; // Préstamo (recibe el cliente)
  // Saldo a financiar con cuotas regulares = préstamo menos VP de la cuota final
  const pSegDesMensual = pctSegDesgravamen; // tasa mensual base (idéntica al modelo)
  const vpCuotaFinal  = cuotaFinal / Math.pow(1 + TEM + pSegDesMensual, N + 1);
  const saldoFinanciar = montoPrestamo - vpCuotaFinal;    // Saldo

  // Tipo de período de gracia
  const tipoPG = (nc) => {
    if (nc <= graciaTotal) return 'T';
    if (nc <= graciaTotal + graciaParcial) return 'P';
    return 'S';
  };

  // Cronograma (NC = 0 .. N+1) con cuotón paralelo
  const cronograma = [];
  const flujo = [];

  // Período 0: el cliente recibe el préstamo
  flujo.push(montoPrestamo);
  cronograma.push({
    numeroCuota: 0, tipoPG: '',
    saldoInicialCF: 0, interesCF: 0, amortCF: 0, segDesCF: 0, saldoFinalCF: 0,
    saldoInicial: montoPrestamo, interes: 0, cuota: 0, amortizacion: 0, segDes: 0,
    segRie: 0, gps: 0, portes: 0, gasAdm: 0, saldoFinal: montoPrestamo, flujo: montoPrestamo,
  });

  let sfCFprev = 0; // saldo final del cuotón (período anterior)
  let sfPrev   = 0; // saldo final de la cuota regular (período anterior)

  for (let nc = 1; nc <= N + 1; nc++) {
    const pg = tipoPG(nc);

    // Cuotón (cuota final)
    const siCF      = nc === 1 ? vpCuotaFinal : sfCFprev;
    const iCF       = -siCF * TEM;
    const segDesCF  = -siCF * pSegDesPer;
    const aCF       = nc === N + 1 ? (-siCF + iCF + segDesCF) : 0;
    const sfCF      = siCF - iCF - segDesCF + aCF;

    // Cuota regular
    const si = nc === 1 ? saldoFinanciar : (nc <= N ? sfPrev : 0);
    const i  = -si * TEM;
    const segDes = -si * pSegDesPer;
    let cuota;
    if (nc <= N) {
      if (pg === 'T')      cuota = 0;
      else if (pg === 'P') cuota = i;                                  // paga solo interés
      else                 cuota = PMT(TEM + pSegDesPer, N - nc + 1, si);
    } else {
      cuota = 0;
    }
    const amort = (nc <= N && pg === 'S') ? (cuota - i - segDes) : 0;
    const sf    = pg === 'T' ? (si - i) : (si + amort);

    // Costes periódicos (vigentes hasta N+1)
    const segRie = nc <= N + 1 ? -segRiePer : 0;
    const gps    = nc <= N + 1 ? -gpsPorPeriodo : 0;
    const portes = nc <= N + 1 ? -portesPorPeriodo : 0;
    const gasAdm = nc <= N + 1 ? -gastosAdmPorPeriodo : 0;

    // Flujo del período
    const flujoNC = cuota + segRie + gps + portes + gasAdm
                  + ((pg === 'T' || pg === 'P') ? segDes : 0)
                  + (nc === N + 1 ? aCF : 0);

    cronograma.push({
      numeroCuota: nc, tipoPG: pg,
      // cuotón
      saldoInicialCF: siCF, interesCF: iCF, amortCF: aCF, segDesCF, saldoFinalCF: sfCF,
      // cuota regular
      saldoInicial: si, interes: i, cuota, amortizacion: amort, segDes,
      segRie, gps, portes, gasAdm, saldoFinal: sf, flujo: flujoNC,
    });
    flujo.push(flujoNC);

    sfCFprev = sfCF;
    sfPrev   = sf;
  }

  // Indicadores
  const COKi = Math.pow(1 + cok, frecuencia / diasPorAnio) - 1;
  const TIR  = calcularTIR(flujo);
  const TCEA = Math.pow(1 + TIR, diasPorAnio / frecuencia) - 1;  // (1+TIR)^12 - 1
  const VAN  = calcularVAN(flujo, COKi);

  // Totales
  // Interes y seguro de desgravamen: solo lo pagado dentro de las cuotas
  // regulares; la parte del cuoton ya queda dentro de la amortizacion total.
  const sum = (k) => cronograma.reduce((a, f) => a + (f[k] || 0), 0);
  const totales = {
    intereses:   -(sum('cuota') - sum('amortizacion') - sum('segDes')),
    amortizacion:-(sum('amortizacion') + sum('amortCF')),
    segDesgravamen: -sum('segDes'),
    segRiesgo:   -sum('segRie'),
    gps:         -sum('gps'),
    portes:      -sum('portes'),
    gastosAdm:   -sum('gasAdm'),
  };

  // Cuota ordinaria representativa (primer período sin gracia)
  const primeraS = cronograma.find(r => r.tipoPG === 'S');
  const cuotaOrdinaria = primeraS ? Math.abs(primeraS.cuota) : 0;
  const capitalTotal   = precioVenta - cuotaInicial;
  const totalPagado    = -flujo.slice(1).reduce((a, x) => a + x, 0); // suma de egresos

  return {
    tasas: {
      TEA, TEM, COKi, TIR_mensual: TIR, TCEA,
      TEP: TEM,                       // alias retrocompatible
    },
    capital: {
      precioVenta, cuotaInicial, cuotaFinal, montoPrestamo,
      vpCuotaFinal, saldoFinanciar, pSegDesPer, segRiePer,
      capitalTotal,                   // alias retrocompatible
      cuotaBalon: cuotaFinal,         // alias retrocompatible
    },
    cuotaOrdinaria,                   // alias retrocompatible
    cronograma,
    indicadores: {
      TIR_mensual: TIR, TCEA, VAN,
      totalInteres: totales.intereses,        // alias retrocompatible
      totalCuotas:  totalPagado,              // alias retrocompatible
    },
    totales,
  };
}


// 3. INDICADORES (TIR por bisección)

export function calcularTIR(flujos, tol = 1e-10, maxIter = 300) {
  const van = (r) => flujos.reduce((acc, f, t) => acc + f / Math.pow(1 + r, t), 0);
  let ra = 0, rb = 1, fa = van(ra), fb = van(rb), exp = 0;
  while (fa * fb > 0 && exp < 300) { rb *= 1.5; fb = van(rb); exp++; }
  if (fa * fb > 0) return NaN;
  let rm = ra;
  for (let k = 0; k < maxIter; k++) {
    rm = (ra + rb) / 2;
    const fm = van(rm);
    if (Math.abs(fm) < tol || (rb - ra) < 1e-14) return rm;
    if (fa * fm < 0) { rb = rm; fb = fm; } else { ra = rm; fa = fm; }
  }
  return rm;
}

/** VAN = flujo[0] + NPV(tasa, flujo[1..]) = suma flujo[t]/(1+tasa)^t. */
export function calcularVAN(flujos, tasa) {
  return flujos.reduce((acc, f, t) => acc + f / Math.pow(1 + tasa, t), 0);
}
