import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Producto, PRODUCTOS_INICIALES } from './products.interface.js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly filePath = path.join(this.dataDir, 'products.json');
  private products: Producto[] = [];

  constructor(private readonly dbService: DatabaseService) {}

  async onModuleInit() {
    await this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      try {
        const content = await fs.readFile(this.filePath, 'utf-8');
        this.products = JSON.parse(content);
      } catch {
        this.products = [...PRODUCTOS_INICIALES];
        await this.saveToFile();
      }

      // Si MySQL está conectado, sincronizar productos iniciales
      if (this.dbService.isConnected && this.dbService.productRepo) {
        const count = await this.dbService.productRepo.count();
        if (count === 0) {
          for (const p of this.products) {
            await this.dbService.productRepo.save({
              id: p.id,
              nombre: p.nombre,
              precioDefault: p.precioDefault,
              categoria: p.categoria || 'General',
              activo: p.activo !== false,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error inicializando productos:', err);
      this.products = [...PRODUCTOS_INICIALES];
    }
  }

  private async saveToFile() {
    await fs.writeFile(this.filePath, JSON.stringify(this.products, null, 2), 'utf-8');
  }

  async getAll(): Promise<Producto[]> {
    if (this.dbService.isConnected && this.dbService.productRepo) {
      try {
        const fromDb = await this.dbService.productRepo.find();
        return fromDb.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precioDefault: Number(p.precioDefault),
          categoria: p.categoria,
          activo: p.activo,
        }));
      } catch (err) {
        console.warn('Error leyendo productos de MySQL, usando JSON:', err);
      }
    }
    return this.products;
  }

  async create(data: Partial<Producto>): Promise<Producto> {
    const newProduct: Producto = {
      id: data.id || `prod_${Date.now()}`,
      nombre: data.nombre || 'Nuevo Producto',
      precioDefault: Number(data.precioDefault) || 0,
      categoria: data.categoria || 'General',
      activo: data.activo !== false,
    };

    if (this.dbService.isConnected && this.dbService.productRepo) {
      try {
        await this.dbService.productRepo.save(newProduct);
      } catch (err) {
        console.warn('Error guardando producto en MySQL:', err);
      }
    }

    this.products.push(newProduct);
    await this.saveToFile();
    return newProduct;
  }

  async update(id: string, data: Partial<Producto>): Promise<Producto | null> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.products[index] = { ...this.products[index], ...data };

    if (this.dbService.isConnected && this.dbService.productRepo) {
      try {
        await this.dbService.productRepo.update(id, {
          nombre: this.products[index].nombre,
          precioDefault: this.products[index].precioDefault,
          categoria: this.products[index].categoria,
          activo: this.products[index].activo,
        });
      } catch (err) {
        console.warn('Error actualizando producto en MySQL:', err);
      }
    }

    await this.saveToFile();
    return this.products[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;

    if (this.dbService.isConnected && this.dbService.productRepo) {
      try {
        await this.dbService.productRepo.delete(id);
      } catch (err) {
        console.warn('Error eliminando producto en MySQL:', err);
      }
    }

    this.products.splice(index, 1);
    await this.saveToFile();
    return true;
  }
}
