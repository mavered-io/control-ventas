export interface PaqueteEnviado {
  id: string;
  producto: string;
  cantidad: number; // Pedido / Estimado
  real: number;     // Real despachado
  precioUnitario: number;
  neto: number;     // real * precioUnitario
}

export interface MovimientoStock {
  id: string;
  producto: string;
  entradas: number;
  salidas: number;
  motivo?: string;
}

export interface PaqueteVendido {
  id: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  neto: number;     // cantidad * precioUnitario
}

export interface PaqueteDevuelto {
  id: string;
  producto: string;
  devueltoReal: number;
  esperado: number;
  diferencia: number; // devueltoReal - esperado
}

export interface GastoItem {
  id: string;
  concepto: string;
  monto: number;
  tipo: 'efectivo' | 'transferencia';
  notas?: string;
}

export interface DesgloseBilletes {
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  b20: number;
  m10: number;
  m5: number;
  m2: number;
  m1: number;
  m05: number;
}

export interface ResumenFinanciero {
  totalPaquetesEnviadosReal: number;
  totalValorEnviado: number;
  totalPaquetesVendidos: number;
  totalVendidoNeto: number;
  otrosPreciosVenta: number;
  totalVendidoFinal: number; // totalVendidoNeto + otrosPreciosVenta
  totalPaquetesDevueltos: number;
  totalPaquetesEsperadosDevueltos: number;
  diferenciaPaquetesTotal: number;
  cambioInicial: number;
  totalGastosEfectivo: number;
  totalTransferencias: number;
  totalGastosGeneral: number;
  saldoConTransferencia: number; // totalVendidoFinal - totalGastosEfectivo
  saldoSinCambio: number;        // saldoConTransferencia - totalTransferencias
  efectivoEsperadoEnCaja: number;// saldoSinCambio + cambioInicial
  totalEfectivoFisico: number;   // conteo de billetes y monedas
  faltaSobra: number;            // totalEfectivoFisico - efectivoEsperadoEnCaja
  ajusteAdicional: number;       // ej: -$75.00
  saldoFinal: number;            // saldoSinCambio + ajusteAdicional
  estaCuadrado: boolean;
}

export interface ControlVentasRecord {
  id: string;
  folio: string;
  fecha: string;
  vendedor: string;
  rutaOUnidad: string;
  cambioInicial: number;
  enviados: PaqueteEnviado[];
  movimientos: MovimientoStock[];
  vendidos: PaqueteVendido[];
  otrosPreciosVenta: number;
  devoluciones: PaqueteDevuelto[];
  gastos: GastoItem[];
  billetes: DesgloseBilletes;
  ajusteAdicional: number;
  resumen: ResumenFinanciero;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}
