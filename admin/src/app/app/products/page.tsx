"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { articulosApi, type Articulo, type ArticuloInput } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [products, setProducts] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Articulo | null>(null);
  const [formData, setFormData] = useState<ArticuloInput>({
    nombre: "",
    descripcion: "",
    precioCompra: 0,
    precioVenta: 0,
    stock: 0,
  });

  const loadProducts = async (search?: string) => {
    setIsLoading(true);
    try {
      const data = await articulosApi.listar(search);
      setProducts(data);
    } catch {
      toast.error("Error al cargar productos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      nombre: "",
      descripcion: "",
      precioCompra: 0,
      precioVenta: 0,
      stock: 0,
    });
    setDialogOpen(true);
  };

  const handleEdit = (product: Articulo) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precioCompra: Number(product.precioCompra),
      precioVenta: Number(product.precioVenta),
      stock: product.stock,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (product: Articulo) => {
    if (!confirm(`¿Eliminar "${product.nombre}"?`)) return;
    try {
      await articulosApi.eliminar(product.id);
      toast.success("Producto eliminado");
      loadProducts();
    } catch {
      toast.error("Error al eliminar producto");
    }
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        await articulosApi.actualizar(editingProduct.id, formData);
        toast.success("Producto actualizado");
      } else {
        await articulosApi.crear(formData);
        toast.success("Producto creado");
      }
      setDialogOpen(false);
      loadProducts();
    } catch {
      toast.error("Error al guardar producto");
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "codigo", header: "Código" },
    { key: "nombre", header: "Nombre" },
    {
      key: "precioVenta",
      header: "Precio Venta",
      render: (p: Articulo) => `$${Number(p.precioVenta).toFixed(2)}`,
    },
    {
      key: "stock",
      header: "Stock",
      render: (p: Articulo) => (
        <Badge
          variant={
            p.stock > 10 ? "default" : p.stock > 0 ? "secondary" : "destructive"
          }
        >
          {p.stock}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Productos</h1>

      <DataTable
        data={products}
        columns={columns}
        searchPlaceholder="Buscar productos..."
        onSearch={loadProducts}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Nombre del producto"
            />
          </div>
          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Descripción opcional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="precioCompra">Precio Compra</Label>
              <Input
                id="precioCompra"
                type="number"
                step="0.01"
                min="0"
                value={formData.precioCompra}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precioCompra: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="precioVenta">Precio Venta</Label>
              <Input
                id="precioVenta"
                type="number"
                step="0.01"
                min="0"
                value={formData.precioVenta}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precioVenta: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="stock">Stock Inicial</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) =>
                setFormData({ ...formData, stock: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
