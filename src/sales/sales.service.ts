import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ControlVentasRecord,
  ResumenFinanciero,
  DesgloseBilletes,
  PaqueteEnviado,
  MovimientoStock,
  PaqueteVendido,
  PaqueteDevuelto,
  GastoItem,
} from './sales.interface.js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class SalesService implements OnModuleInit {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly filePath = path.join(this.dataDir, 'sales_records.json');
  private records: ControlVentasRecord[] = [];

  constructor(private readonly dbService: DatabaseService) {}

  async onModuleInit() {
    await this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      try {
        const content = await fs.readFile(this.filePath, 'utf-8');
        this.records = JSON.parse(content);
      } catch {
        this.records = [];
        await this.saveToFile();
      }

      // Sincronizar registros locales a MySQL si se conecta
      if (this.dbService.isConnected && this.dbService.salesRepo && this.records.length > 0) {
        const count = await this.dbService.salesRepo.count();
        if (count === 0) {
          for (const rec of this.records) {
            await this.dbService.salesRepo.save(rec as any);
          }
        }
      }
    } catch (err) {
      console.error('Error inicializando ventas:', err);
      this.records = [];
    }
  }

  private async saveToFile() {
    await fs.writeFile(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
  }

  calculateSummary(payload: {
    enviados: PaqueteEnviado[];
    movimientos?: MovimientoStock[];
    vendidos: PaqueteVendido[];
    otrosPreciosVenta?: number;
    devoluciones: PaqueteDevuelto[];
    cambioInicial?: number;
    gastos: GastoItem[];
    billetes?: DesgloseBilletes;
    ajusteAdicional?: number;
  }): {
    resumen: ResumenFinanciero;
    devolucionesCalculadas: PaqueteDevuelto[];
    enviadosCalculados: PaqueteEnviado[];
    vendidosCalculados: PaqueteVendido[];
  } {
    const cambioInicial = Number(payload.cambioInicial) || 0;
    const otrosPreciosVenta = Number(payload.otrosPreciosVenta) || 0;
    const ajusteAdicional = Number(payload.ajusteAdicional) || 0;

    // 1. Enviados
    let totalPaquetesEnviadosReal = 0;
    let totalValorEnviado = 0;
    const enviadosCalculados: PaqueteEnviado[] = (payload.enviados || []).map((env) => {
      const real = Number(env.real) || 0;
      const precio = Number(env.precioUnitario) || 0;
      const neto = Number((real * precio).toFixed(2));
      totalPaquetesEnviadosReal += real;
      totalValorEnviado += neto;
      return {
        ...env,
        real,
        precioUnitario: precio,
        neto,
      };
    });

    // 2. Movimientos Map (entradas - salidas por producto)
    const movMap = new Map<string, { entradas: number; salidas: number }>();
    (payload.movimientos || []).forEach((m) => {
      const prodKey = (m.producto || '').trim().toLowerCase();
      const current = movMap.get(prodKey) || { entradas: 0, salidas: 0 };
      current.entradas += Number(m.entradas) || 0;
      current.salidas += Number(m.salidas) || 0;
      movMap.set(prodKey, current);
    });

    // 3. Vendidos
    let totalPaquetesVendidos = 0;
    let totalVendidoNeto = 0;
    const vendidosCalculados: PaqueteVendido[] = (payload.vendidos || []).map((ven) => {
      const cant = Number(ven.cantidad) || 0;
      const precio = Number(ven.precioUnitario) || 0;
      const neto = Number((cant * precio).toFixed(2));
      totalPaquetesVendidos += cant;
      totalVendidoNeto += neto;
      return {
        ...ven,
        cantidad: cant,
        precioUnitario: precio,
        neto,
      };
    });

    const totalVendidoFinal = Number((totalVendidoNeto + otrosPreciosVenta).toFixed(2));

    // 4. Devoluciones esperadas vs reales
    const devMapReal = new Map<string, number>();
    (payload.devoluciones || []).forEach((d) => {
      devMapReal.set((d.producto || '').trim().toLowerCase(), Number(d.devueltoReal) || 0);
    });

    let totalPaquetesDevueltos = 0;
    let totalPaquetesEsperadosDevueltos = 0;
    let diferenciaPaquetesTotal = 0;

    const devolucionesCalculadas: PaqueteDevuelto[] = enviadosCalculados.map((env) => {
      const prodKey = (env.producto || '').trim().toLowerCase();
      const ven = vendidosCalculados.find((v) => (v.producto || '').trim().toLowerCase() === prodKey);
      const cantVendida = ven ? ven.cantidad : 0;
      const mov = movMap.get(prodKey) || { entradas: 0, salidas: 0 };

      const esperado = Math.max(0, env.real + mov.entradas - mov.salidas - cantVendida);
      const devueltoReal = devMapReal.has(prodKey) ? devMapReal.get(prodKey)! : esperado;
      const diferencia = devueltoReal - esperado;

      totalPaquetesDevueltos += devueltoReal;
      totalPaquetesEsperadosDevueltos += esperado;
      diferenciaPaquetesTotal += diferencia;

      return {
        id: env.id,
        producto: env.producto,
        devueltoReal,
        esperado,
        diferencia,
      };
    });

    // 5. Gastos
    let totalGastosEfectivo = 0;
    let totalTransferencias = 0;
    (payload.gastos || []).forEach((g) => {
      const monto = Number(g.monto) || 0;
      if (g.tipo === 'transferencia') {
        totalTransferencias += monto;
      } else {
        totalGastosEfectivo += monto;
      }
    });
    const totalGastosGeneral = Number((totalGastosEfectivo + totalTransferencias).toFixed(2));

    // 6. Billetes y Monedas
    const b = payload.billetes || {
      b500: 0,
      b200: 0,
      b100: 0,
      b50: 0,
      b20: 0,
      m10: 0,
      m5: 0,
      m2: 0,
      m1: 0,
      m05: 0,
    };
    const totalEfectivoFisico = Number(
      (
        (b.b500 || 0) * 500 +
        (b.b200 || 0) * 200 +
        (b.b100 || 0) * 100 +
        (b.b50 || 0) * 50 +
        (b.b20 || 0) * 20 +
        (b.m10 || 0) * 10 +
        (b.m5 || 0) * 5 +
        (b.m2 || 0) * 2 +
        (b.m1 || 0) * 1 +
        (b.m05 || 0) * 0.5
      ).toFixed(2)
    );

    // 7. Liquidación y Cuadre según Fórmulas de la Hoja
    const saldoConTransferencia = Number((totalVendidoFinal - totalGastosEfectivo).toFixed(2));
    const saldoSinCambio = Number((saldoConTransferencia - totalTransferencias).toFixed(2));
    const efectivoEsperadoEnCaja = Number((saldoSinCambio + cambioInicial).toFixed(2));
    const faltaSobra = Number((totalEfectivoFisico - efectivoEsperadoEnCaja).toFixed(2));
    const saldoFinal = Number((saldoSinCambio + ajusteAdicional).toFixed(2));
    const estaCuadrado = Math.abs(faltaSobra) < 0.01 && diferenciaPaquetesTotal === 0;

    const resumen: ResumenFinanciero = {
      totalPaquetesEnviadosReal,
      totalValorEnviado: Number(totalValorEnviado.toFixed(2)),
      totalPaquetesVendidos,
      totalVendidoNeto: Number(totalVendidoNeto.toFixed(2)),
      otrosPreciosVenta,
      totalVendidoFinal,
      totalPaquetesDevueltos,
      totalPaquetesEsperadosDevueltos,
      diferenciaPaquetesTotal,
      cambioInicial,
      totalGastosEfectivo: Number(totalGastosEfectivo.toFixed(2)),
      totalTransferencias: Number(totalTransferencias.toFixed(2)),
      totalGastosGeneral,
      saldoConTransferencia,
      saldoSinCambio,
      efectivoEsperadoEnCaja,
      totalEfectivoFisico,
      faltaSobra,
      ajusteAdicional,
      saldoFinal,
      estaCuadrado,
    };

    return {
      resumen,
      devolucionesCalculadas,
      enviadosCalculados,
      vendidosCalculados,
    };
  }

  async getAllRecords(): Promise<ControlVentasRecord[]> {
    if (this.dbService.isConnected && this.dbService.salesRepo) {
      try {
        const fromDb = await this.dbService.salesRepo.find({
          order: { createdAt: 'DESC' },
        });
        return fromDb as any;
      } catch (err) {
        console.warn('Error leyendo cortes de MySQL, usando JSON:', err);
      }
    }
    return [...this.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecordById(id: string): Promise<ControlVentasRecord | null> {
    if (this.dbService.isConnected && this.dbService.salesRepo) {
      try {
        const found = await this.dbService.salesRepo.findOne({ where: { id } });
        if (found) return found as any;
      } catch (err) {
        console.warn('Error buscando corte en MySQL:', err);
      }
    }
    return this.records.find((r) => r.id === id) || null;
  }

  async saveRecord(payload: Partial<ControlVentasRecord>): Promise<ControlVentasRecord> {
    const calc = this.calculateSummary({
      enviados: payload.enviados || [],
      movimientos: payload.movimientos || [],
      vendidos: payload.vendidos || [],
      otrosPreciosVenta: payload.otrosPreciosVenta,
      devoluciones: payload.devoluciones || [],
      cambioInicial: payload.cambioInicial,
      gastos: payload.gastos || [],
      billetes: payload.billetes,
      ajusteAdicional: payload.ajusteAdicional,
    });

    const targetFolio = payload.folio || '0001';
    let id = payload.id;
    let existingCreated: any = null;

    if (!id && this.dbService.isConnected && this.dbService.salesRepo) {
      try {
        const found = await this.dbService.salesRepo.findOne({ where: { folio: targetFolio } });
        if (found) {
          id = found.id;
          existingCreated = found.createdAt;
        }
      } catch (err) {
        console.warn('Error checking existing folio in MySQL:', err);
      }
    }

    if (!id) {
      const foundInLocal = this.records.find((r) => r.folio === targetFolio);
      if (foundInLocal) {
        id = foundInLocal.id;
        existingCreated = foundInLocal.createdAt;
      }
    }

    if (!id) {
      id = uuidv4();
    }

    const now = new Date().toISOString();
    const existingIndex = this.records.findIndex((r) => r.id === id);

    const record: ControlVentasRecord = {
      id,
      folio: targetFolio,
      fecha: payload.fecha || new Date().toISOString().slice(0, 10),
      vendedor: payload.vendedor || 'Ruta 1',
      rutaOUnidad: payload.rutaOUnidad || 'Unidad de Reparto',
      cambioInicial: Number(payload.cambioInicial) || 0,
      enviados: calc.enviadosCalculados,
      movimientos: payload.movimientos || [],
      vendidos: calc.vendidosCalculados,
      otrosPreciosVenta: Number(payload.otrosPreciosVenta) || 0,
      devoluciones: calc.devolucionesCalculadas,
      gastos: payload.gastos || [],
      billetes: payload.billetes || {
        b500: 0,
        b200: 0,
        b100: 0,
        b50: 0,
        b20: 0,
        m10: 0,
        m5: 0,
        m2: 0,
        m1: 0,
        m05: 0,
      },
      ajusteAdicional: Number(payload.ajusteAdicional) || 0,
      resumen: calc.resumen,
      notas: payload.notas || '',
      createdAt: existingCreated || (existingIndex !== -1 ? this.records[existingIndex].createdAt : now),
      updatedAt: now,
    };

    // Guardar en MySQL si está conectado
    if (this.dbService.isConnected && this.dbService.salesRepo) {
      try {
        await this.dbService.salesRepo.save(record as any);
      } catch (err) {
        console.warn('Error guardando corte en MySQL:', err);
      }
    }

    // Guardar en JSON local siempre como respaldo
    if (existingIndex !== -1) {
      this.records[existingIndex] = record;
    } else {
      this.records.unshift(record);
    }

    await this.saveToFile();
    return record;
  }

  async deleteRecord(id: string): Promise<boolean> {
    if (this.dbService.isConnected && this.dbService.salesRepo) {
      try {
        await this.dbService.salesRepo.delete(id);
      } catch (err) {
        console.warn('Error eliminando corte de MySQL:', err);
      }
    }

    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.records.splice(index, 1);
    await this.saveToFile();
    return true;
  }

  getSampleFromImage(): Partial<ControlVentasRecord> {
    return {
      folio: 'CV-EXCEL-001',
      fecha: new Date().toISOString().slice(0, 10),
      vendedor: 'Ruta Campechano',
      rutaOUnidad: 'Unidad de Reparto 01',
      cambioInicial: 0,
      enviados: [
        { id: '1', producto: 'Campechano', cantidad: 0, real: 21, precioUnitario: 160, neto: 3360 },
        { id: '2', producto: 'Pollo', cantidad: 0, real: 0, precioUnitario: 160, neto: 0 },
        { id: '3', producto: 'Costilla', cantidad: 0, real: 2, precioUnitario: 160, neto: 320 },
        { id: '4', producto: 'Familiar', cantidad: 0, real: 2, precioUnitario: 270, neto: 540 },
        { id: '5', producto: 'Chamorro', cantidad: 0, real: 2, precioUnitario: 270, neto: 540 },
      ],
      movimientos: [
        { id: 'm1', producto: 'Campechano', entradas: 0, salidas: 0 },
        { id: 'm2', producto: 'Pollo', entradas: 0, salidas: 0 },
        { id: 'm3', producto: 'Costilla', entradas: 0, salidas: 0 },
        { id: 'm4', producto: 'Familiar', entradas: 0, salidas: 0 },
        { id: 'm5', producto: 'Chamorro', entradas: 0, salidas: 0 },
        { id: 'm6', producto: 'Muslo con Chamorro', entradas: 0, salidas: 0 },
        { id: 'm7', producto: 'Muslo con Costilla', entradas: 0, salidas: 0 },
      ],
      vendidos: [
        { id: 'v1', producto: 'Campechano', cantidad: 11, precioUnitario: 160, neto: 1760 },
        { id: 'v2', producto: 'Pollo', cantidad: 0, precioUnitario: 160, neto: 0 },
        { id: 'v3', producto: 'Costilla', cantidad: 2, precioUnitario: 160, neto: 320 },
        { id: 'v4', producto: 'Familiar', cantidad: 2, precioUnitario: 270, neto: 540 },
        { id: 'v5', producto: 'Chamorro', cantidad: 2, precioUnitario: 270, neto: 540 },
      ],
      otrosPreciosVenta: 0,
      devoluciones: [
        { id: 'd1', producto: 'Campechano', devueltoReal: 10, esperado: 10, diferencia: 0 },
        { id: 'd2', producto: 'Pollo', devueltoReal: 0, esperado: 0, diferencia: 0 },
        { id: 'd3', producto: 'Costilla', devueltoReal: 0, esperado: 0, diferencia: 0 },
        { id: 'd4', producto: 'Familiar', devueltoReal: 0, esperado: 0, diferencia: 0 },
        { id: 'd5', producto: 'Chamorro', devueltoReal: 0, esperado: 0, diferencia: 0 },
      ],
      gastos: [
        { id: 'g1', concepto: 'Reglamentos', monto: 100, tipo: 'efectivo' },
        { id: 'g2', concepto: 'Transferencia', monto: 240, tipo: 'transferencia', notas: 'Gts Trans 300 / 540' },
        { id: 'g3', concepto: 'Tortillas', monto: 10, tipo: 'efectivo' },
      ],
      billetes: {
        b500: 0,
        b200: 0,
        b100: 0,
        b50: 0,
        b20: 0,
        m10: 0,
        m5: 0,
        m2: 0,
        m1: 0,
        m05: 0,
      },
      ajusteAdicional: 0,
      notas: 'Hoja de control importada desde el Excel original',
    };
  }
}
