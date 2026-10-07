import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cortes_ventas')
export class SalesRecordEntity {
  @PrimaryColumn({ length: 64 })
  id: string;

  @Column({ length: 64, unique: true })
  folio: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 128, default: 'Ruta 1' })
  vendedor: string;

  @Column({ length: 128, default: 'Unidad de Reparto' })
  rutaOUnidad: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cambioInicial: number;

  @Column('json')
  enviados: any;

  @Column('json')
  movimientos: any;

  @Column('json')
  vendidos: any;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  otrosPreciosVenta: number;

  @Column('json')
  devoluciones: any;

  @Column('json')
  gastos: any;

  @Column('json')
  billetes: any;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  ajusteAdicional: number;

  @Column('json')
  resumen: any;

  @Column('text', { nullable: true })
  notas: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
