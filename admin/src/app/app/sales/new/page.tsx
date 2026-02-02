"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  articulosApi,
  clientesApi,
  salesApi,
  movimientosApi,
  type Articulo,
  type Cliente,
} from "@/lib/api";
import { Plus, Trash2, Save, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface SaleItemDraft {
  codpro: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  stockDisponible: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [searchCliente, setSearchCliente] = useState("");
  const [searchProducto, setSearchProducto] = useState("");
  const [items, setItems] = useState<SaleItemDraft[]>([]);

  // Para agregar item
  const [selectedCodpro, setSelectedCodpro] = useState("");
  const [cantidad, setCantidad] = useState(1);

  const loadData = async () => {
    try {
      const [clientesData, articulosData] = await Promise.all([
        clientesApi.listar(),
        articulosApi.listar(),
      ]);
      setClientes(clientesData);
      setArticulos(articulosData);
    } catch {
      toast.error("Error al cargar datos");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClientes = clientes.filter(
    (c) =>
      c.codigo.toLowerCase().includes(searchCliente.toLowerCase()) ||
      c.nombre.toLowerCase().includes(searchCliente.toLowerCase())
  );

  const filteredArticulos = articulos.filter(
    (a) =>
      a.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
      a.nombre.toLowerCase().includes(searchProducto.toLowerCase())
  );

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedClienteId(cliente.id);
    setSearchCliente(`${cliente.codigo} - ${cliente.nombre}`);
  };

  const handleAddItem = async () => {
    if (!selectedCodpro) {
      toast.error("Seleccioná un producto");
      return;
    }
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    // Verificar si ya existe el item
    if (items.find((i) => i.codpro === selectedCodpro)) {
      toast.error("El producto ya está en la lista");
      return;
    }

    const articulo = articulos.find((a) => a.codigo === selectedCodpro);
    if (!articulo) return;

    // Obtener stock disponible
    let stockDisponible = 0;
    try {
      const stockData = await movimientosApi.obtenerStock(selectedCodpro);
      stockDisponible = stockData.stocks;
    } catch {
      stockDisponible = 0;
    }

    setItems([
      ...items,
      {
        codpro: selectedCodpro,
        nombre: articulo.nombre,
        cantidad,
        precioUnitario: Number(articulo.precioVenta),
        stockDisponible,
      },
    ]);

    setSelectedCodpro("");
    setSearchProducto("");
    setCantidad(1);
  };

  const handleRemoveItem = (codpro: string) => {
    setItems(items.filter((i) => i.codpro !== codpro));
  };

  const handleUpdateCantidad = (codpro: string, newCantidad: number) => {
    setItems(
      items.map((i) =>
        i.codpro === codpro ? { ...i, cantidad: Math.max(1, newCantidad) } : i
      )
    );
  };

  const total = items.reduce(
    (sum, item) => sum + item.cantidad * item.precioUnitario,
    0
  );

  const handleSaveDraft = async () => {
    if (!selectedClienteId) {
      toast.error("Seleccioná un cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    setIsLoading(true);
    try {
      await salesApi.crear({
        clienteId: selectedClienteId,
        items: items.map((i) => ({
          codpro: i.codpro,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      });
      toast.success("Venta guardada como borrador");
      router.push("/app/sales");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedClienteId) {
      toast.error("Seleccioná un cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    // Verificar stock antes de confirmar
    for (const item of items) {
      if (item.cantidad > item.stockDisponible) {
        toast.error(
          `Stock insuficiente para "${item.nombre}". Disponible: ${item.stockDisponible}`
        );
        return;
      }
    }

    if (!confirm(`¿Confirmar venta por $${total.toFixed(2)}? Se descontará el stock.`)) {
      return;
    }

    setIsLoading(true);
    try {
      // Crear y confirmar en un solo paso
      const sale = await salesApi.crear({
        clienteId: selectedClienteId,
        items: items.map((i) => ({
          codpro: i.codpro,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
      });

      await salesApi.confirmar(sale.id);
      toast.success("Venta confirmada y stock descontado");
      router.push("/app/sales");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al confirmar"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nueva Venta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selección de cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Buscar Cliente</Label>
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value);
                    if (!e.target.value) setSelectedClienteId("");
                  }}
                />
              </div>
              {searchCliente && !selectedClienteId && filteredClientes.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {filteredClientes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 border-b last:border-b-0"
                      onClick={() => handleSelectCliente(c)}
                    >
                      <span className="font-mono text-sm text-blue-600">{c.codigo}</span>
                      <span className="mx-2">-</span>
                      <span>{c.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedClienteId && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-green-800">Cliente seleccionado</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedClienteId("");
                      setSearchCliente("");
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agregar productos */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar Productos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Buscar Producto</Label>
                  <Input
                    placeholder="Buscar por código o nombre..."
                    value={searchProducto}
                    onChange={(e) => {
                      setSearchProducto(e.target.value);
                      if (!e.target.value) setSelectedCodpro("");
                    }}
                  />
                  {searchProducto && !selectedCodpro && filteredArticulos.length > 0 && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto mt-2">
                      {filteredArticulos.map((a) => (
                        <button
                          key={a.codigo}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 border-b last:border-b-0"
                          onClick={() => {
                            setSelectedCodpro(a.codigo);
                            setSearchProducto(`${a.codigo} - ${a.nombre}`);
                          }}
                        >
                          <span className="font-mono text-sm text-blue-600">{a.codigo}</span>
                          <span className="mx-2">-</span>
                          <span>{a.nombre}</span>
                          <span className="ml-2 text-sm text-slate-500">
                            (${Number(a.precioVenta).toFixed(2)})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    />
                    <Button type="button" onClick={handleAddItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de items */}
          <Card>
            <CardHeader>
              <CardTitle>Items de la Venta</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay productos agregados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="w-32">Cantidad</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.codpro}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.codpro} • Stock: {item.stockDisponible}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${item.precioUnitario.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              handleUpdateCantidad(
                                item.codpro,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className={
                              item.cantidad > item.stockDisponible
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${(item.cantidad * item.precioUnitario).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.codpro)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumen */}
        <div>
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-lg">
                <span>Total:</span>
                <span className="font-bold font-mono">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Items:</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Unidades:</span>
                <span>{items.reduce((sum, i) => sum + i.cantidad, 0)}</span>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isLoading || !selectedClienteId || items.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Borrador
                </Button>
                <Button
                  className="w-full"
                  onClick={handleConfirm}
                  disabled={isLoading || !selectedClienteId || items.length === 0}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Venta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
