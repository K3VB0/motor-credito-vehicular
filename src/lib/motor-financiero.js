// motor-financiero.js
// Cálculo del crédito vehicular por método francés vencido (base 30/360):
// tasas, cronograma con cuota balón a valor presente, cuota regular con PMT
// e indicadores VAN, TIR y TCEA (incluye seguros y costos periódicos).


// Utilitarios financieros

/** PMT: cuota vencida (fv=0, type=0). Devuelve valor negativo (pago). #PMT */
function PMT(rate, nper, pv) {
  let pago;
  if (rate === 0) {
    pago = -pv / nper;                    // caso limite sin interes
  } else {
    const f = Math.pow(1 + rate, nper);   // factor (1+i)^n del metodo frances
    pago = -(rate * pv * f) / (f - 1);    // PMT = -i*PV*(1+i)^n / ((1+i)^n - 1)
  }
  return pago;
}


// 1. CONVERSIÓN DE TASAS

/**
 * TNA -> TEA según el período de capitalización, o TEA directa. #TASA
 *   TEA = (1 + TNA/capPorAnio)^capPorAnio - 1   (Diaria = 360, Mensual = 12)
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
  const pSegDesPer = pctSegDesgravamen * frecuencia / 30; // por período #SEGUROS
  const segRiePer  = pctSegRiesgo * precioVenta / NCxA;   // por período

  // Capitales
  const cuotaInicial  = pctCuotaInicial * precioVenta;    // CI
  const cuotaFinal    = pctCuotaFinal * precioVenta;      // CF (cuotón)
  const montoPrestamo = precioVenta - cuotaInicial + costesIniciales; // Préstamo (recibe el cliente) #PRESTAMO

  // Saldo a financiar con cuotas regulares = préstamo menos VP de la cuota final #BALON
  // Modelo: Saldo = Prestamo - CF/(1+TEM+pSegDes)^(N+1). El modelo descuenta con la
  // tasa mensual y acumula el cuotón con la tasa por período; ambas coinciden con
  // frecuencia = 30 (el único caso del trabajo). Aquí se usa pSegDesPer en los dos
  // sitios para que descuento y acumulación sean inversos a cualquier frecuencia.
  const vpCuotaFinal  = cuotaFinal / Math.pow(1 + TEM + pSegDesPer, N + 1);
  const saldoFinanciar = montoPrestamo - vpCuotaFinal;    // Saldo

  // El cuotón se paga en un período extra (N+1). Sin cuota balón ese período no
  // existe: cerrar el plan en N evita cobrar costos sobre un préstamo ya amortizado.
  const conBalon      = cuotaFinal > 0;
  const ultimoPeriodo = conBalon ? N + 1 : N;

  // Tipo de período de gracia
  const tipoPG = (nc) =>
    nc <= graciaTotal                   ? 'T'   // gracia total #GRACIA
    : nc <= graciaTotal + graciaParcial ? 'P'   // gracia parcial
    : 'S';                                      // cuota normal

  // Cronograma (NC = 0 .. ultimoPeriodo) con cuotón paralelo #CRONOGRAMA
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

  for (let nc = 1; nc <= ultimoPeriodo; nc++) {
    const pg = tipoPG(nc);

    // Cuotón (cuota final)
    const siCF      = nc === 1 ? vpCuotaFinal : sfCFprev;
    const iCF       = -siCF * TEM;
    const segDesCF  = -siCF * pSegDesPer;
    const aCF       = nc === N + 1 ? (-siCF + iCF + segDesCF) : 0;
    const sfCF      = siCF - iCF - segDesCF + aCF;

    // Cuota regular #CUOTA
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

    // Costes periódicos (vigentes en todo período emitido: 1 .. ultimoPeriodo)
    const segRie = -segRiePer;
    const gps    = -gpsPorPeriodo;
    const portes = -portesPorPeriodo;
    const gasAdm = -gastosAdmPorPeriodo;

    // Flujo del período. En cuotas 'S' el desgravamen ya viaja dentro de la cuota
    // (amort = cuota - i - segDes); en gracia la cuota no lo contiene y se suma aparte. #FLUJO
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
  const COKi = Math.pow(1 + cok, frecuencia / diasPorAnio) - 1; // tasa de descuento del período #COK
  const TIR  = calcularTIR(flujo);
  const TCEA = Math.pow(1 + TIR, diasPorAnio / frecuencia) - 1;  // (1+TIR)^12 - 1 #TCEA
  const VAN  = calcularVAN(flujo, COKi);

  // Totales analiticos y conciliacion de caja. #TOTALES
  // No se reconstruye el interes como cuota - amortizacion - desgravamen:
  // esa identidad solo sirve en una cuota normal y falla durante la gracia.
  const filasPago = cronograma.slice(1);
  const sum = (filas, campo) => filas.reduce((a, f) => a + (f[campo] || 0), 0);
  const filasInteresPagado = filasPago.filter(f => f.tipoPG !== 'T');
  const filasDesgravamenFueraCuota = filasPago.filter(f => f.tipoPG === 'T' || f.tipoPG === 'P');

  const totales = {
    interesesRegular: -sum(filasPago, 'interes'),
    interesesPagados: -sum(filasInteresPagado, 'interes'),
    interesesCapitalizados: -sum(filasPago.filter(f => f.tipoPG === 'T'), 'interes'),
    interesesBalon: -sum(filasPago, 'interesCF'),
    amortizacionRegular: -sum(filasPago, 'amortizacion'),
    pagoFinalBalon: -sum(filasPago, 'amortCF'),
    segDesgravamenRegular: -sum(filasPago, 'segDes'),
    segDesgravamenBalon: -sum(filasPago, 'segDesCF'),
    sumaCuotasCronograma: -sum(filasPago, 'cuota'),
    desgravamenFueraCuota: -sum(filasDesgravamenFueraCuota, 'segDes'),
    segRiesgo: -sum(filasPago, 'segRie'),
    gps: -sum(filasPago, 'gps'),
    portes: -sum(filasPago, 'portes'),
    gastosAdm: -sum(filasPago, 'gasAdm'),
  };

  // Cuota ordinaria representativa (primer período sin gracia)
  const primeraS = cronograma.find(r => r.tipoPG === 'S');
  const cuotaOrdinaria = primeraS ? Math.abs(primeraS.cuota) : 0;
  const capitalTotal   = precioVenta - cuotaInicial;
  const totalPagado = -flujo.slice(1).reduce((a, x) => a + x, 0);
  totales.totalComponentesPagados = totales.sumaCuotasCronograma
    + totales.desgravamenFueraCuota
    + totales.pagoFinalBalon
    + totales.segRiesgo
    + totales.gps
    + totales.portes
    + totales.gastosAdm;
  totales.diferenciaReconciliacion = totalPagado - totales.totalComponentesPagados;
  // Alias historicos. El interes total generado se informa por separado del
  // desglose de caja para no duplicar el interes capitalizado en gracia total.
  totales.intereses = totales.interesesRegular + totales.interesesBalon;
  totales.amortizacion = totales.amortizacionRegular + totales.pagoFinalBalon;
  totales.segDesgravamen = totales.segDesgravamenRegular + totales.segDesgravamenBalon;

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
      totalInteresRegular: totales.interesesRegular,
      totalInteresBalon: totales.interesesBalon,
      totalCuotas:  totalPagado,              // alias retrocompatible
    },
    totales,
  };
}


// 3. INDICADORES (TIR por bisección)

export function calcularTIR(flujos, tol = 1e-10, maxIter = 500) {
  // VAN de los flujos a una tasa r de tanteo. #TIR
  const van = (r) => flujos.reduce((acc, f, t) => acc + f / Math.pow(1 + r, t), 0);

  // Intervalo de busqueda: de -99% a +1000% (no -100% exacto porque en r = -1
  // el divisor (1+r)^t se anula). Se amplia el extremo superior mientras el VAN
  // de ambos extremos tenga el mismo signo, para encerrar la raiz antes de iterar.
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
  // se conserva el lado donde el VAN cambia de signo, hasta que VAN ~ 0.
  let tir = NaN;
  if (vanMin * vanMax <= 0) {
    let iteraciones = 0;
    let convergio = false;
    while (!convergio && iteraciones < maxIter) {
      tir = (tasaMin + tasaMax) / 2;
      const vanMedio = van(tir);
      if (Math.abs(vanMedio) < tol || (tasaMax - tasaMin) < 1e-14) {
        convergio = true; // criterio de convergencia: VAN(tir) ~ 0
      } else if (vanMin * vanMedio < 0) {
        tasaMax = tir;
      } else {
        tasaMin = tir;
        vanMin = vanMedio;
      }
      iteraciones = iteraciones + 1;
    }
  }
  return tir;
}

/** VAN = flujo[0] + NPV(tasa, flujo[1..]) = suma flujo[t]/(1+tasa)^t. #VAN */
export function calcularVAN(flujos, tasa) {
  return flujos.reduce((acc, f, t) => acc + f / Math.pow(1 + tasa, t), 0);
}
