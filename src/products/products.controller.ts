import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { Producto } from './products.interface.js';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAll(): Promise<Producto[]> {
    return this.productsService.getAll();
  }

  @Post()
  async create(@Body() body: Partial<Producto>): Promise<Producto> {
    return this.productsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Producto>): Promise<Producto | null> {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.productsService.delete(id);
    return { success };
  }
}
