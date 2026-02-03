-- AlterTable
ALTER TABLE "cobros" ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'ARS',
ALTER COLUMN "metodoPago" SET DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "importeCobrado" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'ARS',
ALTER COLUMN "estado" SET DEFAULT 'ISSUED';

-- CreateIndex
CREATE INDEX "cobros_facturaId_idx" ON "cobros"("facturaId");

-- CreateIndex
CREATE INDEX "cobros_clienteId_idx" ON "cobros"("clienteId");

-- CreateIndex
CREATE INDEX "facturas_clienteId_idx" ON "facturas"("clienteId");

-- CreateIndex
CREATE INDEX "facturas_estado_idx" ON "facturas"("estado");
