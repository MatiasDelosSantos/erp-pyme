"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { salesApi, type Sale } from "@/lib/api";
import { ArrowLeft, CheckCircle, Trash2 } from "lucide-react";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSale = async () => {
    setIsLoading(true);
    try {
      const data = await salesApi.obtener(params.id as string);
      setSale(data);
    } catch {
      toast.error("Error al cargar la venta");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadSale();
    }
  }, [params.id]);

  const handleConfirm = async () => {
    if (!sale) return;
    if (!confirm(`¿Confirmar venta por $${Number(sale.total).toFixed(2)}? Se descontará el stock.`)) {
      return;
    }
    try {
      await salesApi.confirmar(sale.id);
      toast.success("Venta confirmada y stock descontado");
      loadSale();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al confirmar");
    }
  };

  const handleDelete = async () => {
    if (!sale) return;
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
      await salesApi.eliminar(sale.id);
      toast.success("Venta eliminada");
      router.push("/app/sales");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/app/sales">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Venta no encontrada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/sales">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detalle de Venta</h1>
            <p className="text-muted-foreground">{formatDate(sale.fecha)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {sale.estado === "DRAFT" && (
            <>
              <Button onClick={handleConfirm}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Venta
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium">{sale.cliente.nombre}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {sale.cliente.codigo}
                  </p>
                </div>
                <Link href={`/app/clients`}>
                  <Button variant="outline" size="sm">
                    Ver Cliente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items ({sale.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.articulo.codigo}
                      </TableCell>
                      <TableCell>{item.articulo.nombre}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(item.precioUnitario).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.cantidad}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${Number(item.subtotal).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <div className="flex justify-between items-center">
                <span>Estado:</span>
                {sale.estado === "DRAFT" ? (
                  <Badge variant="secondary">Borrador</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">
                    Confirmada
                  </Badge>
                )}
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Moneda:</span>
                <span>{sale.moneda}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Items:</span>
                <span>{sale.items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Unidades:</span>
                <span>
                  {sale.items.reduce((sum, i) => sum + i.cantidad, 0)}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="font-mono">
                    ${Number(sale.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {sale.estado === "CONFIRMED" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Venta confirmada - Stock descontado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
