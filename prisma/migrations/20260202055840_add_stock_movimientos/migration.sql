-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "codpro" TEXT NOT NULL,
    "stocks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" TEXT NOT NULL,
    "codpro" TEXT NOT NULL,
    "cantid" INTEGER NOT NULL,
    "stocks" INTEGER NOT NULL,
    "fchreg" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_codpro_key" ON "stock"("codpro");

-- CreateIndex
CREATE INDEX "stock_codpro_idx" ON "stock"("codpro");

-- CreateIndex
CREATE INDEX "movimientos_stock_codpro_idx" ON "movimientos_stock"("codpro");

-- CreateIndex
CREATE INDEX "movimientos_stock_fchreg_idx" ON "movimientos_stock"("fchreg");

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_codpro_fkey" FOREIGN KEY ("codpro") REFERENCES "articulos"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_codpro_fkey" FOREIGN KEY ("codpro") REFERENCES "articulos"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
