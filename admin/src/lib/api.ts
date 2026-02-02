const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

interface ApiResponse<T> {
  exito: boolean;
  datos?: T;
  mensaje?: string;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.exito) {
    throw new ApiError(data.mensaje || "Error desconocido", response.status);
  }

  return data.datos as T;
}

// Articulos
export const articulosApi = {
  listar: (busqueda?: string) =>
    fetchApi<Articulo[]>(
      `/stock/articulos${busqueda ? `?busqueda=${busqueda}` : ""}`
    ),
  obtener: (id: string) => fetchApi<Articulo>(`/stock/articulos/${id}`),
  crear: (data: ArticuloInput) =>
    fetchApi<Articulo>("/stock/articulos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  actualizar: (id: string, data: Partial<ArticuloInput>) =>
    fetchApi<Articulo>(`/stock/articulos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  eliminar: (id: string) =>
    fetchApi<{ mensaje: string }>(`/stock/articulos/${id}`, { method: "DELETE" }),
};

// Clientes
export const clientesApi = {
  listar: (busqueda?: string) =>
    fetchApi<Cliente[]>(
      `/ventas/clientes${busqueda ? `?busqueda=${busqueda}` : ""}`
    ),
  obtener: (id: string) => fetchApi<Cliente>(`/ventas/clientes/${id}`),
  crear: (data: ClienteInput) =>
    fetchApi<Cliente>("/ventas/clientes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  actualizar: (id: string, data: Partial<ClienteInput>) =>
    fetchApi<Cliente>(`/ventas/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  eliminar: (id: string) =>
    fetchApi<{ mensaje: string }>(`/ventas/clientes/${id}`, { method: "DELETE" }),
};

// Types
export interface Articulo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioCompra: number | string;
  precioVenta: number | string;
  stock: number;
  codigoBarras: string | null;
  activo: boolean;
  categoriaId: string | null;
  categoria?: { id: string; nombre: string } | null;
}

export interface ArticuloInput {
  nombre: string;
  descripcion?: string;
  precioCompra?: number;
  precioVenta?: number;
  stock?: number;
  codigoBarras?: string;
  categoriaId?: string;
}

export interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export interface ClienteInput {
  nombre: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

// Movimientos de Stock
export interface MovimientoStock {
  id: string;
  codpro: string;
  cantid: number;
  stocks: number;
  fchreg: string;
  articulo: {
    codigo: string;
    nombre: string;
  };
}

export interface MovimientoInput {
  codpro: string;
  cantidad: number;
  tipo: "INGRESO" | "EGRESO";
}

export interface MovimientoResponse {
  movimiento: MovimientoStock;
  stockAnterior: number;
  stockNuevo: number;
}

export const movimientosApi = {
  listar: (codpro?: string) =>
    fetchApi<MovimientoStock[]>(
      `/stock/movimientos${codpro ? `?codpro=${codpro}` : ""}`
    ),
  registrar: (data: MovimientoInput) =>
    fetchApi<MovimientoResponse>("/stock/movimientos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  obtenerStock: (codpro: string) =>
    fetchApi<{ codpro: string; stocks: number; articulo: { codigo: string; nombre: string } }>(
      `/stock/control/${codpro}`
    ),
};

// Sales
export interface Sale {
  id: string;
  clienteId: string;
  fecha: string;
  moneda: string;
  estado: "DRAFT" | "CONFIRMED";
  total: number | string;
  cliente: { id: string; codigo: string; nombre: string };
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  codpro: string;
  cantidad: number;
  precioUnitario: number | string;
  subtotal: number | string;
  articulo: { codigo: string; nombre: string };
}

export interface SaleInput {
  clienteId: string;
  items: { codpro: string; cantidad: number; precioUnitario: number }[];
}

export const salesApi = {
  listar: (estado?: string) =>
    fetchApi<Sale[]>(`/ventas/sales${estado ? `?estado=${estado}` : ""}`),
  obtener: (id: string) => fetchApi<Sale>(`/ventas/sales/${id}`),
  crear: (data: SaleInput) =>
    fetchApi<Sale>("/ventas/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  actualizarItems: (id: string, items: SaleInput["items"]) =>
    fetchApi<Sale>(`/ventas/sales/${id}/items`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),
  confirmar: (id: string) =>
    fetchApi<Sale>(`/ventas/sales/${id}/confirm`, { method: "POST" }),
  eliminar: (id: string) =>
    fetchApi<{ mensaje: string }>(`/ventas/sales/${id}`, { method: "DELETE" }),
};
