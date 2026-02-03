"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  facturasApi,
  cobrosApi,
  type Factura,
  type Cobro,
  type CobroInput,
  getErrorMessage,
} from "@/lib/api";
import { ArrowLeft, Plus, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  ISSUED: "Emitida",
  PARTIALLY_PAID: "Parcialmente pagada",
  PAID: "Pagada",
  VOID: "Anulada",
  pendiente: "Emitida",
  cobrada_parcial: "Parcialmente pagada",
  cobrada: "Pagada",
  anulada: "Anulada",
};

const ESTADO_COLORS: Record<string, string> = {
  ISSUED: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  VOID: "bg-red-100 text-red-800",
  pendiente: "bg-blue-100 text-blue-800",
  cobrada_parcial: "bg-yellow-100 text-yellow-800",
  cobrada: "bg-green-100 text-green-800",
  anulada: "bg-red-100 text-red-800",
};

const METODO_PAGO_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  OTHER: "Otro",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state para nuevo cobro
  const [cobroForm, setCobroForm] = useState<Omit<CobroInput, "facturaId">>({
    monto: 0,
    metodoPago: "CASH",
    referencia: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [facturaData, cobrosData] = await Promise.all([
        facturasApi.obtener(params.id as string),
        cobrosApi.listarPorFactura(params.id as string),
      ]);
      setFactura(facturaData);
      setCobros(cobrosData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  const handleOpenDialog = () => {
    if (!factura) return;
    setCobroForm({
      monto: Number(factura.saldoPendiente),
      metodoPago: "CASH",
      referencia: "",
    });
    setDialogOpen(true);
  };

  const handleRegistrarCobro = async () => {
    if (!factura) return;
    if (cobroForm.monto <= 0) {
      toast.error("El importe debe ser mayor a cero");
      return;
    }

    setIsSaving(true);
    try {
      await cobrosApi.registrar({
        facturaId: factura.id,
        monto: cobroForm.monto,
        metodoPago: cobroForm.metodoPago,
        referencia: cobroForm.referencia || undefined,
      });
      toast.success("Cobro registrado correctamente");
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number | string) => {
    return `$${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/app/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Factura no encontrada</h1>
        </div>
      </div>
    );
  }

  const saldoPendiente = Number(factura.saldoPendiente);
  const isPaid = factura.estado === "PAID" || factura.estado === "cobrada";
  const isVoid = factura.estado === "VOID" || factura.estado === "anulada";
  const canRegisterPayment = !isPaid && !isVoid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Factura {factura.numero}</h1>
            <p className="text-muted-foreground">
              Emitida el {formatDate(factura.fecha)}
            </p>
          </div>
        </div>
        {canRegisterPayment && (
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Cobro
          </Button>
        )}
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
              <p className="text-lg font-medium">{factura.cliente.nombre}</p>
              <p className="text-sm text-muted-foreground font-mono">
                {factura.cliente.codigo}
              </p>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factura.lineas.map((linea) => (
                    <TableRow key={linea.id}>
                      <TableCell>{linea.descripcion}</TableCell>
                      <TableCell className="text-center">{linea.cantidad}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(linea.precioUnitario)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(linea.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(factura.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA ({Number(factura.porcentajeIva)}%):</span>
                  <span className="font-mono">{formatCurrency(factura.montoIva)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(factura.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cobros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cobros Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cobros.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay cobros registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Medio de Pago</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cobros.map((cobro) => (
                      <TableRow key={cobro.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(cobro.fecha)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {cobro.numero}
                        </TableCell>
                        <TableCell>
                          {METODO_PAGO_LABELS[cobro.metodoPago] || cobro.metodoPago}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cobro.referencia || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600">
                          {formatCurrency(cobro.monto)}
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
              <div className="flex justify-between items-center">
                <span>Estado:</span>
                <Badge className={ESTADO_COLORS[factura.estado] || ""}>
                  {ESTADO_LABELS[factura.estado] || factura.estado}
                </Badge>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(factura.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobrado:</span>
                  <span className="font-mono text-green-600">
                    {formatCurrency(factura.importeCobrado)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Saldo:</span>
                  <span className={`font-mono ${saldoPendiente > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {formatCurrency(saldoPendiente)}
                  </span>
                </div>
              </div>

              {isPaid && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Factura pagada completamente
                  </p>
                </div>
              )}

              {isVoid && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Factura anulada
                  </p>
                </div>
              )}

              {canRegisterPayment && saldoPendiente > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-orange-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Pendiente de cobro
                  </p>
                </div>
              )}

              <div className="pt-4 border-t text-sm text-muted-foreground">
                <p>Vencimiento: {formatDate(factura.fechaVencimiento)}</p>
                <p>Moneda: {factura.moneda || "ARS"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para registrar cobro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Saldo pendiente:</p>
              <p className="text-2xl font-bold font-mono">
                {formatCurrency(saldoPendiente)}
              </p>
            </div>

            <div>
              <Label htmlFor="monto">Importe a cobrar *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                max={saldoPendiente}
                value={cobroForm.monto}
                onChange={(e) =>
                  setCobroForm({ ...cobroForm, monto: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <Label htmlFor="metodoPago">Medio de pago *</Label>
              <Select
                value={cobroForm.metodoPago}
                onValueChange={(value) =>
                  setCobroForm({
                    ...cobroForm,
                    metodoPago: value as CobroInput["metodoPago"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="referencia">Referencia (opcional)</Label>
              <Input
                id="referencia"
                value={cobroForm.referencia}
                onChange={(e) =>
                  setCobroForm({ ...cobroForm, referencia: e.target.value })
                }
                placeholder="Ej: Recibo N° 001, Transferencia CBU..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrarCobro} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
