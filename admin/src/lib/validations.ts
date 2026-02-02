import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const articuloSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional(),
  precioCompra: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo")
    .optional(),
  precioVenta: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo")
    .optional(),
  stock: z.coerce
    .number()
    .int()
    .min(0, "El stock no puede ser negativo")
    .optional(),
  codigoBarras: z.string().optional(),
  categoriaId: z.string().optional(),
});

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tipoDocumento: z.enum(["DNI", "CUIT", "CUIL", "PASAPORTE"]).optional(),
  numeroDocumento: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ArticuloFormInput = z.infer<typeof articuloSchema>;
export type ClienteFormInput = z.infer<typeof clienteSchema>;
