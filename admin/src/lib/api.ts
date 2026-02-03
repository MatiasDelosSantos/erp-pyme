const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

interface ApiResponse<T> {
  exito: boolean;
  datos?: T;
  mensaje?: string;
  error?: {
    code: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, public status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
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
    // Nuevo formato con error codes
    if (data.error?.code) {
      throw new ApiError(
        data.error.code,
        response.status,
        data.error.code,
        data.error.details
      );
    }
    // Formato antiguo con mensaje
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
  estado: "DRAFT" | "CONFIRMED" | "INVOICED";
  total: number | string;
  facturaId: string | null;
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
  generarFactura: (id: string) =>
    fetchApi<Factura>(`/ventas/sales/${id}/invoice`, { method: "POST" }),
  eliminar: (id: string) =>
    fetchApi<{ mensaje: string }>(`/ventas/sales/${id}`, { method: "DELETE" }),
};

// Facturas
export interface Factura {
  id: string;
  numero: string;
  fecha: string;
  fechaVencimiento: string;
  moneda: string;
  subtotal: number | string;
  porcentajeIva: number | string;
  montoIva: number | string;
  total: number | string;
  importeCobrado: number | string;
  saldoPendiente: number | string;
  estado: "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";
  observaciones: string | null;
  cliente: { id: string; codigo: string; nombre: string };
  lineas: FacturaLinea[];
}

export interface FacturaLinea {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subtotal: number | string;
  articulo: { codigo: string; nombre: string };
}

export const facturasApi = {
  listar: (estado?: string) =>
    fetchApi<Factura[]>(`/facturacion/facturas${estado ? `?estado=${estado}` : ""}`),
  obtener: (id: string) => fetchApi<Factura>(`/facturacion/facturas/${id}`),
  anular: (id: string) =>
    fetchApi<Factura>(`/facturacion/facturas/${id}/anular`, { method: "PATCH" }),
};

// Cobros (Payments)
export interface Cobro {
  id: string;
  numero: string;
  fecha: string;
  monto: number | string;
  moneda: string;
  metodoPago: "CASH" | "TRANSFER" | "CARD" | "OTHER";
  referencia: string | null;
  observaciones: string | null;
  cliente?: { id: string; codigo: string; nombre: string };
  factura?: { id: string; numero: string };
}

export interface CobroInput {
  facturaId: string;
  monto: number;
  metodoPago: "CASH" | "TRANSFER" | "CARD" | "OTHER";
  referencia?: string;
}

export const cobrosApi = {
  listarPorFactura: (facturaId: string) =>
    fetchApi<Cobro[]>(`/facturacion/facturas/${facturaId}/cobros`),
  registrar: (data: CobroInput) =>
    fetchApi<Cobro>("/tesoreria/cobros", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  anular: (id: string) =>
    fetchApi<{ exito: boolean }>(`/tesoreria/cobros/${id}`, { method: "DELETE" }),
};

// Traducciones de error codes a mensajes en español
export const ERROR_MESSAGES: Record<string, string> = {
  // Cobros
  INVALID_AMOUNT: "El importe debe ser mayor a cero",
  INVOICE_NOT_FOUND: "Factura no encontrada",
  INVOICE_VOIDED: "No se puede cobrar una factura anulada",
  INVOICE_ALREADY_PAID: "La factura ya se encuentra pagada",
  OVERPAYMENT_NOT_ALLOWED: "El importe supera el saldo pendiente",
  CURRENCY_MISMATCH: "La moneda del cobro no coincide con la de la factura",
  PAYMENT_NOT_FOUND: "Cobro no encontrado",
  // Facturas
  CANNOT_VOID_PAID_INVOICE: "No se puede anular una factura pagada",
  // Ventas
  SALE_NOT_FOUND: "Venta no encontrada",
  SALE_NOT_CONFIRMED: "Solo se pueden facturar ventas confirmadas",
  SALE_ALREADY_INVOICED: "Esta venta ya tiene una factura generada",
  // General
  INTERNAL_ERROR: "Error interno del servidor",
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code) {
    return ERROR_MESSAGES[error.code] || error.code;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Error desconocido";
}
