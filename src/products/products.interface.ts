export interface Producto {
  id: string;
  nombre: string;
  precioDefault: number;
  categoria?: string;
  activo: boolean;
}

export const PRODUCTOS_INICIALES: Producto[] = [
  { id: 'campechano', nombre: 'Campechano', precioDefault: 170, categoria: 'Paquetes', activo: true },
  { id: 'costilla', nombre: 'Costilla', precioDefault: 180, categoria: 'Paquetes', activo: true },
  { id: 'familiar', nombre: 'Familiar', precioDefault: 270, categoria: 'Paquetes', activo: true },
  { id: 'chamorro', nombre: 'Chamorro', precioDefault: 270, categoria: 'Paquetes', activo: true },
  { id: 'muslo-chamorro', nombre: 'Muslo con Chamorro', precioDefault: 200, categoria: 'Especiales', activo: true },
  { id: 'muslo-costilla', nombre: 'Muslo con Costilla', precioDefault: 200, categoria: 'Especiales', activo: true },
];
