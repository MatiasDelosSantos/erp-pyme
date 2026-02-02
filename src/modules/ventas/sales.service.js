const prisma = require('../../shared/data/prisma');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ SALES ============

const listarSales = async (filtros = {}) => {
  const where = {};

  if (filtros.estado) {
    where.estado = filtros.estado;
  }
  if (filtros.clienteId) {
    where.clienteId = filtros.clienteId;
  }

  return prisma.sale.findMany({
    where,
    include: {
      cliente: { select: { id: true, codigo: true, nombre: true } },
      items: {
        include: {
          articulo: { select: { codigo: true, nombre: true } }
        }
      }
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerSale = async (id) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, codigo: true, nombre: true } },
      items: {
        include: {
          articulo: { select: { codigo: true, nombre: true, precioVenta: true } }
        }
      }
    }
  });

  if (!sale) {
    throw new ErrorApp('Venta no encontrada', 404);
  }

  return sale;
};

const crearSale = async ({ clienteId, items }) => {
  // Validar que el cliente exista
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId }
  });

  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  // Validar items
  if (!items || items.length === 0) {
    throw new ErrorApp('La venta debe tener al menos un item', 400);
  }

  // Validar que todos los productos existan
  for (const item of items) {
    const articulo = await prisma.articulo.findUnique({
      where: { codigo: item.codpro }
    });
    if (!articulo) {
      throw new ErrorApp(`Producto ${item.codpro} no encontrado`, 404);
    }
  }

  // Calcular total
  let total = 0;
  const itemsData = items.map(item => {
    const subtotal = item.cantidad * item.precioUnitario;
    total += subtotal;
    return {
      codpro: item.codpro,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal
    };
  });

  // Crear venta con items
  const sale = await prisma.sale.create({
    data: {
      clienteId,
      estado: 'DRAFT',
      total,
      items: {
        create: itemsData
      }
    },
    include: {
      cliente: { select: { id: true, codigo: true, nombre: true } },
      items: {
        include: {
          articulo: { select: { codigo: true, nombre: true } }
        }
      }
    }
  });

  return sale;
};

const actualizarItems = async (saleId, items) => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });

  if (!sale) {
    throw new ErrorApp('Venta no encontrada', 404);
  }

  if (sale.estado !== 'DRAFT') {
    throw new ErrorApp('Solo se pueden modificar ventas en estado DRAFT', 400);
  }

  // Validar que todos los productos existan
  for (const item of items) {
    const articulo = await prisma.articulo.findUnique({
      where: { codigo: item.codpro }
    });
    if (!articulo) {
      throw new ErrorApp(`Producto ${item.codpro} no encontrado`, 404);
    }
  }

  // Calcular nuevo total
  let total = 0;
  const itemsData = items.map(item => {
    const subtotal = item.cantidad * item.precioUnitario;
    total += subtotal;
    return {
      codpro: item.codpro,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal
    };
  });

  // Actualizar: eliminar items existentes y crear nuevos
  const updatedSale = await prisma.$transaction(async (tx) => {
    await tx.saleItem.deleteMany({ where: { saleId } });

    return tx.sale.update({
      where: { id: saleId },
      data: {
        total,
        items: {
          create: itemsData
        }
      },
      include: {
        cliente: { select: { id: true, codigo: true, nombre: true } },
        items: {
          include: {
            articulo: { select: { codigo: true, nombre: true } }
          }
        }
      }
    });
  });

  return updatedSale;
};

const confirmarSale = async (saleId) => {
  // Usar transacción para todo el proceso
  const result = await prisma.$transaction(async (tx) => {
    // 1. Obtener la venta con items
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!sale) {
      throw new ErrorApp('Venta no encontrada', 404);
    }

    if (sale.estado !== 'DRAFT') {
      throw new ErrorApp('Solo se pueden confirmar ventas en estado DRAFT', 400);
    }

    if (sale.items.length === 0) {
      throw new ErrorApp('La venta no tiene items', 400);
    }

    // 2. Verificar stock suficiente para cada item
    for (const item of sale.items) {
      let stockRecord = await tx.stock.findUnique({
        where: { codpro: item.codpro }
      });

      if (!stockRecord) {
        stockRecord = { stocks: 0 };
      }

      if (stockRecord.stocks < item.cantidad) {
        const articulo = await tx.articulo.findUnique({
          where: { codigo: item.codpro }
        });
        throw new ErrorApp(
          `Stock insuficiente para "${articulo?.nombre || item.codpro}". ` +
          `Disponible: ${stockRecord.stocks}, Requerido: ${item.cantidad}`,
          400
        );
      }
    }

    // 3. Descontar stock y generar movimientos para cada item
    const movimientos = [];
    for (const item of sale.items) {
      // Buscar o crear registro de Stock
      let stockRecord = await tx.stock.findUnique({
        where: { codpro: item.codpro }
      });

      if (!stockRecord) {
        stockRecord = await tx.stock.create({
          data: { codpro: item.codpro, stocks: 0 }
        });
      }

      const stockAnterior = stockRecord.stocks;
      const stockNuevo = stockAnterior - item.cantidad;

      // Crear movimiento de EGRESO
      const movimiento = await tx.movimientoStock.create({
        data: {
          codpro: item.codpro,
          cantid: -item.cantidad, // Negativo para egreso
          stocks: stockAnterior,
          fchreg: new Date()
        }
      });
      movimientos.push(movimiento);

      // Actualizar Stock
      await tx.stock.update({
        where: { codpro: item.codpro },
        data: { stocks: stockNuevo }
      });

      // Sincronizar campo stock en Articulo
      await tx.articulo.update({
        where: { codigo: item.codpro },
        data: { stock: stockNuevo }
      });
    }

    // 4. Cambiar estado de la venta a CONFIRMED
    const confirmedSale = await tx.sale.update({
      where: { id: saleId },
      data: { estado: 'CONFIRMED' },
      include: {
        cliente: { select: { id: true, codigo: true, nombre: true } },
        items: {
          include: {
            articulo: { select: { codigo: true, nombre: true } }
          }
        }
      }
    });

    return { sale: confirmedSale, movimientos };
  });

  return result;
};

const eliminarSale = async (saleId) => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });

  if (!sale) {
    throw new ErrorApp('Venta no encontrada', 404);
  }

  if (sale.estado !== 'DRAFT') {
    throw new ErrorApp('Solo se pueden eliminar ventas en estado DRAFT', 400);
  }

  await prisma.sale.delete({ where: { id: saleId } });

  return { mensaje: 'Venta eliminada correctamente' };
};

module.exports = {
  listarSales,
  obtenerSale,
  crearSale,
  actualizarItems,
  confirmarSale,
  eliminarSale
};
