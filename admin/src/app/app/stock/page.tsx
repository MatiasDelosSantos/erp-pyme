"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  articulosApi,
  movimientosApi,
  type Articulo,
  type MovimientoStock,
} from "@/lib/api";
import { ArrowDownCircle, ArrowUpCircle, Package, Search } from "lucide-react";

export default function StockMovementsPage() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedCodpro, setSelectedCodpro] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState<"INGRESO" | "EGRESO">("INGRESO");
  const [searchProduct, setSearchProduct] = useState("");
  const [filterCodpro, setFilterCodpro] = useState("");

  // Stock actual del producto seleccionado
  const [stockActual, setStockActual] = useState<number | null>(null);

  const loadArticulos = async () => {
    try {
      const data = await articulosApi.listar();
      setArticulos(data);
    } catch {
      toast.error("Error al cargar productos");
    }
  };

  const loadMovimientos = async (codpro?: string) => {
    setIsLoading(true);
    try {
      const data = await movimientosApi.listar(codpro || undefined);
      setMovimientos(data);
    } catch {
      toast.error("Error al cargar movimientos");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStockActual = async (codpro: string) => {
    try {
      const data = await movimientosApi.obtenerStock(codpro);
      setStockActual(data.stocks);
    } catch {
      setStockActual(0);
    }
  };

  useEffect(() => {
    loadArticulos();
    loadMovimientos();
  }, []);

  useEffect(() => {
    if (selectedCodpro) {
      loadStockActual(selectedCodpro);
    } else {
      setStockActual(null);
    }
  }, [selectedCodpro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCodpro) {
      toast.error("Selecciona un producto");
      return;
    }

    const cantidadNum = parseInt(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const resultado = await movimientosApi.registrar({
        codpro: selectedCodpro,
        cantidad: cantidadNum,
        tipo,
      });

      toast.success(
        `${tipo === "INGRESO" ? "Ingreso" : "Egreso"} registrado. Stock: ${resultado.stockAnterior} → ${resultado.stockNuevo}`
      );

      // Reset form
      setCantidad("");
      setStockActual(resultado.stockNuevo);

      // Reload movements
      loadMovimientos(filterCodpro || undefined);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar movimiento"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredArticulos = articulos.filter(
    (a) =>
      a.codigo.toLowerCase().includes(searchProduct.toLowerCase()) ||
      a.nombre.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const handleFilterChange = (codpro: string) => {
    const value = codpro === "__all__" ? "" : codpro;
    setFilterCodpro(value);
    loadMovimientos(value || undefined);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Movimientos de Stock</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de registro */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Registrar Movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Producto *</Label>
                <Input
                  placeholder="Escribí código o nombre..."
                  value={searchProduct}
                  onChange={(e) => {
                    setSearchProduct(e.target.value);
                    // Si se borra, limpiar selección
                    if (!e.target.value) {
                      setSelectedCodpro("");
                    }
                  }}
                />
                {/* Lista de resultados filtrados */}
                {searchProduct && filteredArticulos.length > 0 && !selectedCodpro && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                    {filteredArticulos.map((a) => (
                      <button
                        key={a.codigo}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 border-b last:border-b-0 transition-colors"
                        onClick={() => {
                          setSelectedCodpro(a.codigo);
                          setSearchProduct(`${a.codigo} - ${a.nombre}`);
                        }}
                      >
                        <span className="font-mono text-sm text-blue-600">{a.codigo}</span>
                        <span className="text-slate-400 mx-2">-</span>
                        <span>{a.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchProduct && filteredArticulos.length === 0 && (
                  <p className="text-sm text-muted-foreground">No se encontraron productos</p>
                )}
                {selectedCodpro && (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-green-800">
                      Seleccionado: <strong>{selectedCodpro}</strong>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-green-600 hover:text-green-800"
                      onClick={() => {
                        setSelectedCodpro("");
                        setSearchProduct("");
                      }}
                    >
                      Cambiar
                    </Button>
                  </div>
                )}
              </div>

              {stockActual !== null && (
                <div className="p-3 bg-slate-100 rounded-lg">
                  <p className="text-sm text-slate-600">Stock actual</p>
                  <p className="text-2xl font-bold">{stockActual}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipo de Movimiento *</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo(v as "INGRESO" | "EGRESO")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">
                      <span className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        Ingreso
                      </span>
                    </SelectItem>
                    <SelectItem value="EGRESO">
                      <span className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        Egreso
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cantidad *</Label>
                <Input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Cantidad a mover"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !selectedCodpro || !cantidad}
              >
                {isSubmitting ? "Registrando..." : "Registrar Movimiento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Historial de movimientos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historial de Movimientos</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={filterCodpro || "__all__"} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Filtrar por producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos los productos</SelectItem>
                    {articulos.map((a) => (
                      <SelectItem key={a.codigo} value={a.codigo}>
                        {a.codigo} - {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadMovimientos(filterCodpro || undefined)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Stock Anterior</TableHead>
                    <TableHead className="text-right">Stock Nuevo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientos.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-sm">
                          {formatDate(mov.fchreg)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{mov.articulo.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {mov.codpro}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {mov.cantid > 0 ? (
                            <Badge className="bg-green-100 text-green-800">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Ingreso
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Egreso
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {mov.cantid > 0 ? "+" : ""}
                          {mov.cantid}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {mov.stocks}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {mov.stocks + mov.cantid}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
