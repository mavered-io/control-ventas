import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('productos')
export class ProductEntity {
  @PrimaryColumn({ length: 64 })
  id: string;

  @Column({ length: 128 })
  nombre: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  precioDefault: number;

  @Column({ length: 64, default: 'General' })
  categoria: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
