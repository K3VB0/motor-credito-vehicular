// motor-financiero.js
// Cálculo del crédito vehicular por método francés vencido (base 30/360):
// tasas, cronograma con cuota balón a valor presente, cuota regular con PMT
// e indicadores VAN, TIR y TCEA (incluye seguros y costos periódicos).


// Utilitarios financieros

/** #PMT - Cuota vencida por metodo frances (fv=0, type=0). Devuelve valor negativo (pago). */
function PMT(rate, nper, pv) {
  if (rate === 0) return -pv / nper;
  const f = Math.pow(1 + rate, nper);
  return -(rate * pv * f) / (f - 1);
}


// 1. CONVERSIÓN DE TASAS

/**
 * #TASA - Conversion de tasas. TNA -> TEA segun el periodo de capitalizacion
 * (capPorAnio viene del formulario, no esta fijo), o TEA directa; luego TEA -> TEM.
 *   TEA = (1 + TNA/capPorAnio)^capPorAnio - 1     (capPorAnio: Diaria = 360, Mensual = 12)
 *   TEM = (1 + TEA)^(30/360) - 1
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
  // #BALON - Cuota final (cuoton) traida a valor presente: CF / (1+TEM+desgravamen)^(N+1).
  // El saldo a financiar con cuotas regulares es el prestamo menos ese valor presente.
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
  const TCEA = Math.pow(1 + TIR, diasPorAnio / frecuencia) - 1;  // #TCEA - Costo efectivo anual = (1+TIR)^12 - 1
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

// #TIR - Tasa Interna de Retorno por biseccion: la tasa que hace VAN(r) = 0.
export function calcularTIR(flujos, tol = 1e-10, maxIter = 500) {
  // VAN de los flujos a una tasa r de tanteo.
  const van = (r) => flujos.reduce((acc, f, t) => acc + f / Math.pow(1 + r, t), 0);

  // Intervalo de busqueda: desde -99% hasta +1000%. Se amplia el extremo
  // superior mientras el VAN de ambos extremos tenga el mismo signo, para
  // encerrar la raiz (cambio de signo) antes de iterar.
  let tasaMin = -0.99;
  let tasaMax = 10;
  let vanMin = van(tasaMin);
  let vanMax = van(tasaMax);
  let ampliaciones = 0;
  while (vanMin * vanMax > 0 && ampliaciones < maxIter) {
    tasaMax = tasaMax * 1.5;
    vanMax = van(tasaMax);
    ampliaciones = ampliaciones + 1;
  }

  // Biseccion (aproximaciones sucesivas): el intervalo se parte a la mitad y
  // se conserva el lado donde el VAN cambia de signo, hasta acercarse a VAN = 0.
  let tir = NaN;
  if (vanMin * vanMax <= 0) {
    tir = (tasaMin + tasaMax) / 2;
    for (let iter = 0; iter < maxIter; iter = iter + 1) {
      tir = (tasaMin + tasaMax) / 2;
      const vanMedio = van(tir);
      if (Math.abs(vanMedio) < tol || (tasaMax - tasaMin) < 1e-14) {
        iter = maxIter; // condicion de salida del bucle
      } else if (vanMin * vanMedio < 0) {
        tasaMax = tir;
      } else {
        tasaMin = tir;
        vanMin = vanMedio;
      }
    }
  }
  return tir;
}

/** #VAN - Valor Actual Neto = suma de flujo[t]/(1+tasa)^t (descontado al COK). */
export function calcularVAN(flujos, tasa) {
  return flujos.reduce((acc, f, t) => acc + f / Math.pow(1 + tasa, t), 0);
}
