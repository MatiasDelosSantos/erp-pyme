"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { salesApi, type Sale } from "@/lib/api";
import { Plus, Eye, Trash2, CheckCircle } from "lucide-react";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>("__all__");

  const loadSales = async (estado?: string) => {
    setIsLoading(true);
    try {
      const filter = estado === "__all__" ? undefined : estado;
      const data = await salesApi.listar(filter);
      setSales(data);
    } catch {
      toast.error("Error al cargar ventas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleFilterChange = (value: string) => {
    setFilterEstado(value);
    loadSales(value === "__all__" ? undefined : value);
  };

  const handleConfirm = async (sale: Sale) => {
    if (!confirm(`¿Confirmar venta por $${Number(sale.total).toFixed(2)}? Se descontará el stock.`)) {
      return;
    }
    try {
      await salesApi.confirmar(sale.id);
      toast.success("Venta confirmada y stock descontado");
      loadSales(filterEstado === "__all__" ? undefined : filterEstado);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al confirmar");
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
      await salesApi.eliminar(sale.id);
      toast.success("Venta eliminada");
      loadSales(filterEstado === "__all__" ? undefined : filterEstado);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ventas</h1>
        <Link href="/app/sales/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Ventas</CardTitle>
            <Select value={filterEstado} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="CONFIRMED">Confirmadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay ventas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-sm">
                        {formatDate(sale.fecha)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {sale.cliente.codigo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{sale.items.length} items</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${Number(sale.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {sale.estado === "DRAFT" ? (
                          <Badge variant="secondary">Borrador</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Confirmada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/app/sales/${sale.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {sale.estado === "DRAFT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleConfirm(sale)}
                                title="Confirmar venta"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(sale)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
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
  );
}
