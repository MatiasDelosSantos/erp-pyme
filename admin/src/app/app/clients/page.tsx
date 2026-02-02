"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { clientesApi, type Cliente, type ClienteInput } from "@/lib/api";

export default function ClientsPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteInput>({
    nombre: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    direccion: "",
    telefono: "",
    email: "",
  });

  const loadClients = async (search?: string) => {
    setIsLoading(true);
    try {
      const data = await clientesApi.listar(search);
      setClients(data);
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleAdd = () => {
    setEditingClient(null);
    setFormData({
      nombre: "",
      tipoDocumento: "DNI",
      numeroDocumento: "",
      direccion: "",
      telefono: "",
      email: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (client: Cliente) => {
    setEditingClient(client);
    setFormData({
      nombre: client.nombre,
      tipoDocumento: client.tipoDocumento,
      numeroDocumento: client.numeroDocumento,
      direccion: client.direccion,
      telefono: client.telefono || "",
      email: client.email || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (client: Cliente) => {
    if (!confirm(`¿Eliminar "${client.nombre}"?`)) return;
    try {
      await clientesApi.eliminar(client.id);
      toast.success("Cliente eliminado");
      loadClients();
    } catch {
      toast.error("Error al eliminar cliente");
    }
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setIsSaving(true);
    try {
      if (editingClient) {
        await clientesApi.actualizar(editingClient.id, formData);
        toast.success("Cliente actualizado");
      } else {
        await clientesApi.crear(formData);
        toast.success("Cliente creado");
      }
      setDialogOpen(false);
      loadClients();
    } catch {
      toast.error("Error al guardar cliente");
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: "codigo", header: "Código" },
    { key: "nombre", header: "Nombre" },
    {
      key: "documento",
      header: "Documento",
      render: (c: Cliente) =>
        `${c.tipoDocumento}: ${c.numeroDocumento || "-"}`,
    },
    {
      key: "email",
      header: "Email",
      render: (c: Cliente) => c.email || "-",
    },
    {
      key: "telefono",
      header: "Teléfono",
      render: (c: Cliente) => c.telefono || "-",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Clientes</h1>

      <DataTable
        data={clients}
        columns={columns}
        searchPlaceholder="Buscar clientes..."
        onSearch={loadClients}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingClient ? "Editar Cliente" : "Nuevo Cliente"}
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
              placeholder="Nombre del cliente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipoDocumento">Tipo Documento</Label>
              <Select
                value={formData.tipoDocumento}
                onValueChange={(v) =>
                  setFormData({ ...formData, tipoDocumento: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CUIT">CUIT</SelectItem>
                  <SelectItem value="CUIL">CUIL</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="numeroDocumento">Número Documento</Label>
              <Input
                id="numeroDocumento"
                value={formData.numeroDocumento}
                onChange={(e) =>
                  setFormData({ ...formData, numeroDocumento: e.target.value })
                }
                placeholder="12345678"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              placeholder="Av. Corrientes 1234"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                placeholder="11-1234-5678"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="cliente@email.com"
              />
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
