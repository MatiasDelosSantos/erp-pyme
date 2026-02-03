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
import { facturasApi, type Factura, getErrorMessage } from "@/lib/api";
import { Eye, FileText } from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  ISSUED: "Emitida",
  PARTIALLY_PAID: "Parcialmente pagada",
  PAID: "Pagada",
  VOID: "Anulada",
  // Legacy
  pendiente: "Emitida",
  cobrada_parcial: "Parcialmente pagada",
  cobrada: "Pagada",
  anulada: "Anulada",
};

const ESTADO_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ISSUED: "outline",
  PARTIALLY_PAID: "secondary",
  PAID: "default",
  VOID: "destructive",
  pendiente: "outline",
  cobrada_parcial: "secondary",
  cobrada: "default",
  anulada: "destructive",
};

export default function InvoicesPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>("__all__");

  const loadFacturas = async (estado?: string) => {
    setIsLoading(true);
    try {
      const filter = estado === "__all__" ? undefined : estado;
      const data = await facturasApi.listar(filter);
      setFacturas(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFacturas();
  }, []);

  const handleFilterChange = (value: string) => {
    setFilterEstado(value);
    loadFacturas(value === "__all__" ? undefined : value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number | string) => {
    return `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-slate-600" />
          <h1 className="text-3xl font-bold">Facturas</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Facturas</CardTitle>
            <Select value={filterEstado} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="ISSUED">Emitidas</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Parcialmente pagadas</SelectItem>
                <SelectItem value="PAID">Pagadas</SelectItem>
                <SelectItem value="VOID">Anuladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : facturas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay facturas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  facturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono font-medium">
                        {factura.numero}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(factura.fecha)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{factura.cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {factura.cliente.codigo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(factura.total)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(factura.saldoPendiente) > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {formatCurrency(factura.saldoPendiente)}
                          </span>
                        ) : (
                          <span className="text-green-600">$0,00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_VARIANTS[factura.estado] || "outline"}>
                          {ESTADO_LABELS[factura.estado] || factura.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/app/invoices/${factura.id}`}>
                          <Button variant="ghost" size="icon" title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
