const prisma = require('../../shared/data/prisma');
const { generarCodigoDesdeConteo } = require('../../shared/utils/generadorCodigo');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ CLIENTES ============

const listarClientes = async (filtros = {}) => {
  const where = { activo: true };

  if (filtros.busqueda) {
    where.OR = [
      { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
      { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
      { numeroDocumento: { contains: filtros.busqueda } }
    ];
  }

  return prisma.cliente.findMany({
    where,
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerCliente = async (id) => {
  const cliente = await prisma.cliente.findFirst({
    where: { id, activo: true }
  });

  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }
  return cliente;
};

const crearNuevoCliente = async (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre del cliente es requerido', 400);
  }

  const codigo = await generarCodigoDesdeConteo(prisma, 'cliente', 'CLI');

  return prisma.cliente.create({
    data: {
      codigo,
      nombre: datos.nombre,
      tipoDocumento: datos.tipoDocumento || 'DNI',
      numeroDocumento: datos.numeroDocumento || '',
      direccion: datos.direccion || '',
      telefono: datos.telefono || null,
      email: datos.email || null
    }
  });
};

const actualizarCliente = async (id, datos) => {
  const cliente = await prisma.cliente.findFirst({
    where: { id, activo: true }
  });

  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  return prisma.cliente.update({
    where: { id },
    data: {
      nombre: datos.nombre !== undefined ? datos.nombre : cliente.nombre,
      tipoDocumento: datos.tipoDocumento !== undefined ? datos.tipoDocumento : cliente.tipoDocumento,
      numeroDocumento: datos.numeroDocumento !== undefined ? datos.numeroDocumento : cliente.numeroDocumento,
      direccion: datos.direccion !== undefined ? datos.direccion : cliente.direccion,
      telefono: datos.telefono !== undefined ? datos.telefono : cliente.telefono,
      email: datos.email !== undefined ? datos.email : cliente.email
    }
  });
};

const eliminarCliente = async (id) => {
  const cliente = await prisma.cliente.findFirst({
    where: { id, activo: true }
  });

  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  await prisma.cliente.update({
    where: { id },
    data: { activo: false }
  });

  return { mensaje: 'Cliente eliminado correctamente' };
};

// ============ PEDIDOS ============

const listarPedidos = async (filtros = {}) => {
  const where = {};

  if (filtros.estado) {
    where.estado = filtros.estado;
  }
  if (filtros.clienteId) {
    where.clienteId = filtros.clienteId;
  }

  return prisma.pedido.findMany({
    where,
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerPedido = async (id) => {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    }
  });

  if (!pedido) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }
  return pedido;
};

const crearNuevoPedido = async (datos) => {
  if (!datos.clienteId) {
    throw new ErrorApp('El cliente es requerido', 400);
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: datos.clienteId, activo: true }
  });

  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  const numero = await generarCodigoDesdeConteo(prisma, 'pedido', 'PED');

  // Preparar líneas
  let lineasData = [];
  let total = 0;

  if (datos.lineas && Array.isArray(datos.lineas)) {
    for (const lineaData of datos.lineas) {
      const articulo = await prisma.articulo.findFirst({
        where: { id: lineaData.articuloId, activo: true }
      });

      if (!articulo) {
        throw new ErrorApp(`Artículo no encontrado: ${lineaData.articuloId}`, 404);
      }

      const precioUnitario = lineaData.precioUnitario || Number(articulo.precioVenta);
      const subtotal = lineaData.cantidad * precioUnitario;

      lineasData.push({
        articuloId: lineaData.articuloId,
        cantidad: lineaData.cantidad,
        precioUnitario,
        subtotal
      });

      total += subtotal;
    }
  }

  return prisma.pedido.create({
    data: {
      numero,
      clienteId: datos.clienteId,
      observaciones: datos.observaciones || null,
      total,
      lineas: {
        create: lineasData
      }
    },
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    }
  });
};

const actualizarPedido = async (id, datos) => {
  const pedido = await prisma.pedido.findUnique({ where: { id } });

  if (!pedido) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  if (pedido.estado !== 'borrador') {
    throw new ErrorApp('Solo se pueden modificar pedidos en borrador', 400);
  }

  // Si vienen nuevas líneas, eliminar las anteriores y crear nuevas
  if (datos.lineas && Array.isArray(datos.lineas)) {
    await prisma.pedidoLinea.deleteMany({ where: { pedidoId: id } });

    let lineasData = [];
    let total = 0;

    for (const lineaData of datos.lineas) {
      const articulo = await prisma.articulo.findFirst({
        where: { id: lineaData.articuloId, activo: true }
      });

      if (!articulo) {
        throw new ErrorApp(`Artículo no encontrado: ${lineaData.articuloId}`, 404);
      }

      const precioUnitario = lineaData.precioUnitario || Number(articulo.precioVenta);
      const subtotal = lineaData.cantidad * precioUnitario;

      lineasData.push({
        articuloId: lineaData.articuloId,
        cantidad: lineaData.cantidad,
        precioUnitario,
        subtotal
      });

      total += subtotal;
    }

    return prisma.pedido.update({
      where: { id },
      data: {
        observaciones: datos.observaciones !== undefined ? datos.observaciones : pedido.observaciones,
        total,
        lineas: { create: lineasData }
      },
      include: {
        cliente: true,
        lineas: { include: { articulo: true } }
      }
    });
  }

  return prisma.pedido.update({
    where: { id },
    data: {
      observaciones: datos.observaciones !== undefined ? datos.observaciones : pedido.observaciones
    },
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    }
  });
};

const cambiarEstadoPedido = async (id, nuevoEstado) => {
  const estadosValidos = ['borrador', 'confirmado', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new ErrorApp('Estado no válido', 400);
  }

  const pedido = await prisma.pedido.findUnique({ where: { id } });

  if (!pedido) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  return prisma.pedido.update({
    where: { id },
    data: { estado: nuevoEstado },
    include: {
      cliente: true,
      lineas: { include: { articulo: true } }
    }
  });
};

const cancelarPedido = async (id) => {
  return cambiarEstadoPedido(id, 'cancelado');
};

// ============ ALBARANES ============

const listarAlbaranes = async (filtros = {}) => {
  const where = {};

  if (filtros.clienteId) {
    where.clienteId = filtros.clienteId;
  }

  return prisma.albaran.findMany({
    where,
    include: {
      cliente: true,
      pedido: true,
      lineas: { include: { articulo: true } }
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerAlbaran = async (id) => {
  const albaran = await prisma.albaran.findUnique({
    where: { id },
    include: {
      cliente: true,
      pedido: true,
      lineas: { include: { articulo: true } }
    }
  });

  if (!albaran) {
    throw new ErrorApp('Albarán no encontrado', 404);
  }
  return albaran;
};

const crearNuevoAlbaran = async (datos) => {
  if (!datos.pedidoId) {
    throw new ErrorApp('El pedido es requerido', 400);
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id: datos.pedidoId },
    include: { lineas: true }
  });

  if (!pedido) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  if (pedido.estado !== 'confirmado') {
    throw new ErrorApp('Solo se pueden crear albaranes de pedidos confirmados', 400);
  }

  const numero = await generarCodigoDesdeConteo(prisma, 'albaran', 'ALB');

  // Crear líneas del albarán y descontar stock
  const lineasData = [];

  for (const lineaPedido of pedido.lineas) {
    const cantidadEntrega = datos.lineas?.find(l => l.articuloId === lineaPedido.articuloId)?.cantidadEntregada
      || lineaPedido.cantidad;

    lineasData.push({
      articuloId: lineaPedido.articuloId,
      cantidadEntregada: cantidadEntrega
    });

    // Descontar stock
    await prisma.articulo.update({
      where: { id: lineaPedido.articuloId },
      data: {
        stock: { decrement: cantidadEntrega }
      }
    });
  }

  // Crear albarán y marcar pedido como entregado
  const albaran = await prisma.albaran.create({
    data: {
      numero,
      pedidoId: datos.pedidoId,
      clienteId: pedido.clienteId,
      observaciones: datos.observaciones || null,
      lineas: { create: lineasData }
    },
    include: {
      cliente: true,
      pedido: true,
      lineas: { include: { articulo: true } }
    }
  });

  await prisma.pedido.update({
    where: { id: datos.pedidoId },
    data: { estado: 'entregado' }
  });

  return albaran;
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearNuevoCliente,
  actualizarCliente,
  eliminarCliente,
  listarPedidos,
  obtenerPedido,
  crearNuevoPedido,
  actualizarPedido,
  cambiarEstadoPedido,
  cancelarPedido,
  listarAlbaranes,
  obtenerAlbaran,
  crearNuevoAlbaran
};
