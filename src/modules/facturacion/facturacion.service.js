const prisma = require('../../shared/data/prisma');
const { generarCodigoDesdeConteo } = require('../../shared/utils/generadorCodigo');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

const IVA_DEFECTO = 21;

// ============ FACTURAS ============

const listarFacturas = async (filtros = {}) => {
  const where = {};

  if (filtros.estado) {
    where.estado = filtros.estado;
  }
  if (filtros.clienteId) {
    where.clienteId = filtros.clienteId;
  }

  return prisma.factura.findMany({
    where,
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerFactura = async (id) => {
  const factura = await prisma.factura.findUnique({
    where: { id },
    include: {
      cliente: true,
      pedido: true,
      lineas: { include: { articulo: true } }
    }
  });

  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }
  return factura;
};

const crearNuevaFactura = async (datos) => {
  if (!datos.clienteId) {
    throw new ErrorApp('El cliente es requerido', 400);
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, activo: true }
  });

  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  const numero = await generarCodigoDesdeConteo(prisma, 'factura', 'FAC');
  const porcentajeIva = datos.porcentajeIva || IVA_DEFECTO;

  const fechaVencimiento = datos.fechaVencimiento
    ? new Date(datos.fechaVencimiento)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  let lineasData = [];
  let subtotal = 0;

  // Si viene de un pedido, copiar las líneas
  if (datos.pedidoId) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: datos.pedidoId },
      include: { lineas: { include: { articulo: true } } }
    });

    if (!pedido) {
      throw new ErrorApp('Pedido no encontrado', 404);
    }
    if (pedido.estado !== 'entregado') {
      throw new ErrorApp('Solo se pueden facturar pedidos entregados', 400);
    }

    for (const lineaPedido of pedido.lineas) {
      const lineaSubtotal = lineaPedido.cantidad * Number(lineaPedido.precioUnitario);
      lineasData.push({
        articuloId: lineaPedido.articuloId,
        descripcion: lineaPedido.articulo?.nombre || 'Artículo',
        cantidad: lineaPedido.cantidad,
        precioUnitario: Number(lineaPedido.precioUnitario),
        subtotal: lineaSubtotal
      });
      subtotal += lineaSubtotal;
    }
  }

  // Agregar líneas manuales si vienen
  if (datos.lineas && Array.isArray(datos.lineas)) {
    for (const lineaData of datos.lineas) {
      const articulo = await prisma.articulo.findUnique({
        where: { id: lineaData.articuloId }
      });

      const precioUnitario = lineaData.precioUnitario || (articulo ? Number(articulo.precioVenta) : 0);
      const lineaSubtotal = lineaData.cantidad * precioUnitario;

      lineasData.push({
        articuloId: lineaData.articuloId,
        descripcion: lineaData.descripcion || (articulo ? articulo.nombre : 'Artículo'),
        cantidad: lineaData.cantidad,
        precioUnitario,
        subtotal: lineaSubtotal
      });
      subtotal += lineaSubtotal;
    }
  }

  const montoIva = subtotal * (porcentajeIva / 100);
  const total = subtotal + montoIva;

  return prisma.factura.create({
    data: {
      numero,
      fechaVencimiento,
      clienteId: datos.clienteId,
      pedidoId: datos.pedidoId || null,
      subtotal,
      porcentajeIva,
      montoIva,
      total,
      saldoPendiente: total,
      observaciones: datos.observaciones || null,
      lineas: { create: lineasData }
    },
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    }
  });
};

const anularFactura = async (id) => {
  const factura = await prisma.factura.findUnique({ where: { id } });

  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  if (factura.estado === 'cobrada') {
    throw new ErrorApp('No se puede anular una factura cobrada', 400);
  }

  return prisma.factura.update({
    where: { id },
    data: {
      estado: 'anulada',
      saldoPendiente: 0
    },
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    }
  });
};

const actualizarSaldoFactura = async (facturaId, montoCobrado) => {
  const factura = await prisma.factura.findUnique({ where: { id: facturaId } });

  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  const nuevoSaldo = Number(factura.saldoPendiente) - montoCobrado;
  let nuevoEstado = factura.estado;

  if (nuevoSaldo <= 0) {
    nuevoEstado = 'cobrada';
  } else if (nuevoSaldo < Number(factura.total)) {
    nuevoEstado = 'cobrada_parcial';
  }

  return prisma.factura.update({
    where: { id: facturaId },
    data: {
      saldoPendiente: Math.max(0, nuevoSaldo),
      estado: nuevoEstado
    }
  });
};

// ============ NOTAS DE CRÉDITO ============

const listarNotasCredito = async (filtros = {}) => {
  const where = {};

  if (filtros.clienteId) {
    where.clienteId = filtros.clienteId;
  }

  return prisma.notaCredito.findMany({
    where,
    include: {
      cliente: true,
      factura: true,
      lineas: { include: { articulo: true } }
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerNotaCredito = async (id) => {
  const notaCredito = await prisma.notaCredito.findUnique({
    where: { id },
    include: {
      cliente: true,
      factura: true,
      lineas: { include: { articulo: true } }
    }
  });

  if (!notaCredito) {
    throw new ErrorApp('Nota de crédito no encontrada', 404);
  }
  return notaCredito;
};

const crearNuevaNotaCredito = async (datos) => {
  if (!datos.facturaId) {
    throw new ErrorApp('La factura es requerida', 400);
  }
  if (!datos.motivo) {
    throw new ErrorApp('El motivo es requerido', 400);
  }

  const factura = await prisma.factura.findUnique({ where: { id: datos.facturaId } });

  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  const numero = await generarCodigoDesdeConteo(prisma, 'notaCredito', 'NC');

  let lineasData = [];
  let subtotal = 0;

  if (datos.lineas && Array.isArray(datos.lineas)) {
    for (const lineaData of datos.lineas) {
      const articulo = await prisma.articulo.findUnique({
        where: { id: lineaData.articuloId }
      });

      const lineaSubtotal = lineaData.cantidad * lineaData.precioUnitario;
      lineasData.push({
        articuloId: lineaData.articuloId,
        descripcion: lineaData.descripcion || (articulo ? articulo.nombre : 'Artículo'),
        cantidad: lineaData.cantidad,
        precioUnitario: lineaData.precioUnitario,
        subtotal: lineaSubtotal
      });
      subtotal += lineaSubtotal;
    }
  }

  const montoIva = subtotal * (Number(factura.porcentajeIva) / 100);
  const total = subtotal + montoIva;

  return prisma.notaCredito.create({
    data: {
      numero,
      facturaId: datos.facturaId,
      clienteId: factura.clienteId,
      motivo: datos.motivo,
      subtotal,
      montoIva,
      total,
      lineas: { create: lineasData }
    },
    include: {
      cliente: true,
      factura: true,
      lineas: { include: { articulo: true } }
    }
  });
};

const aplicarNotaCredito = async (id) => {
  const notaCredito = await prisma.notaCredito.findUnique({ where: { id } });

  if (!notaCredito) {
    throw new ErrorApp('Nota de crédito no encontrada', 404);
  }

  if (notaCredito.aplicada) {
    throw new ErrorApp('La nota de crédito ya fue aplicada', 400);
  }

  // Reducir saldo de la factura
  await actualizarSaldoFactura(notaCredito.facturaId, Number(notaCredito.total));

  return prisma.notaCredito.update({
    where: { id },
    data: { aplicada: true },
    include: {
      cliente: true,
      factura: true,
      lineas: { include: { articulo: true } }
    }
  });
};

module.exports = {
  listarFacturas,
  obtenerFactura,
  crearNuevaFactura,
  anularFactura,
  actualizarSaldoFactura,
  listarNotasCredito,
  obtenerNotaCredito,
  crearNuevaNotaCredito,
  aplicarNotaCredito
};
