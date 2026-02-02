const prisma = require('../../shared/data/prisma');
const { generarCodigoDesdeConteo } = require('../../shared/utils/generadorCodigo');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');
const facturacionService = require('../facturacion/facturacion.service');

// ============ CUENTAS BANCARIAS ============

const listarCuentasBancarias = async () => {
  return prisma.cuentaBancaria.findMany({
    where: { activa: true },
    orderBy: { nombre: 'asc' }
  });
};

const crearNuevaCuentaBancaria = async (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre de la cuenta es requerido', 400);
  }

  return prisma.cuentaBancaria.create({
    data: {
      nombre: datos.nombre,
      numeroCuenta: datos.numeroCuenta || '',
      banco: datos.banco || '',
      saldo: datos.saldoInicial || 0
    }
  });
};

const actualizarCuentaBancaria = async (id, datos) => {
  const cuenta = await prisma.cuentaBancaria.findFirst({
    where: { id, activa: true }
  });

  if (!cuenta) {
    throw new ErrorApp('Cuenta bancaria no encontrada', 404);
  }

  return prisma.cuentaBancaria.update({
    where: { id },
    data: {
      nombre: datos.nombre !== undefined ? datos.nombre : cuenta.nombre,
      numeroCuenta: datos.numeroCuenta !== undefined ? datos.numeroCuenta : cuenta.numeroCuenta,
      banco: datos.banco !== undefined ? datos.banco : cuenta.banco
    }
  });
};

// ============ COBROS ============

const listarCobros = async (filtros = {}) => {
  const where = { anulado: false };

  if (filtros.clienteId) {
    where.clienteId = filtros.clienteId;
  }

  return prisma.cobro.findMany({
    where,
    include: {
      cliente: true,
      factura: true,
      cuentaBancaria: true
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerCobro = async (id) => {
  const cobro = await prisma.cobro.findFirst({
    where: { id, anulado: false },
    include: {
      cliente: true,
      factura: true,
      cuentaBancaria: true
    }
  });

  if (!cobro) {
    throw new ErrorApp('Cobro no encontrado', 404);
  }
  return cobro;
};

const registrarCobro = async (datos) => {
  if (!datos.facturaId) {
    throw new ErrorApp('La factura es requerida', 400);
  }
  if (!datos.monto || datos.monto <= 0) {
    throw new ErrorApp('El monto debe ser mayor a cero', 400);
  }

  const factura = await prisma.factura.findUnique({ where: { id: datos.facturaId } });

  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }
  if (factura.estado === 'anulada') {
    throw new ErrorApp('No se puede cobrar una factura anulada', 400);
  }
  if (factura.estado === 'cobrada') {
    throw new ErrorApp('La factura ya está cobrada', 400);
  }
  if (datos.monto > Number(factura.saldoPendiente)) {
    throw new ErrorApp('El monto excede el saldo pendiente', 400);
  }

  const numero = await generarCodigoDesdeConteo(prisma, 'cobro', 'COB');

  // Crear cobro
  const cobro = await prisma.cobro.create({
    data: {
      numero,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
      clienteId: factura.clienteId,
      facturaId: datos.facturaId,
      monto: datos.monto,
      metodoPago: datos.metodoPago || 'efectivo',
      cuentaBancariaId: datos.cuentaBancariaId || null,
      referencia: datos.referencia || null,
      observaciones: datos.observaciones || null
    },
    include: {
      cliente: true,
      factura: true,
      cuentaBancaria: true
    }
  });

  // Actualizar saldo de la factura
  await facturacionService.actualizarSaldoFactura(factura.id, datos.monto);

  // Actualizar saldo de cuenta bancaria si aplica
  if (datos.cuentaBancariaId && datos.metodoPago !== 'efectivo') {
    await prisma.cuentaBancaria.update({
      where: { id: datos.cuentaBancariaId },
      data: { saldo: { increment: datos.monto } }
    });
  }

  return cobro;
};

const anularCobro = async (id) => {
  const cobro = await prisma.cobro.findFirst({
    where: { id, anulado: false }
  });

  if (!cobro) {
    throw new ErrorApp('Cobro no encontrado', 404);
  }

  // Revertir el saldo de la factura
  const factura = await prisma.factura.findUnique({ where: { id: cobro.facturaId } });
  if (factura) {
    const nuevoSaldo = Number(factura.saldoPendiente) + Number(cobro.monto);
    await prisma.factura.update({
      where: { id: factura.id },
      data: {
        saldoPendiente: nuevoSaldo,
        estado: nuevoSaldo >= Number(factura.total) ? 'pendiente' : 'cobrada_parcial'
      }
    });
  }

  // Revertir saldo de cuenta bancaria
  if (cobro.cuentaBancariaId) {
    await prisma.cuentaBancaria.update({
      where: { id: cobro.cuentaBancariaId },
      data: { saldo: { decrement: Number(cobro.monto) } }
    });
  }

  await prisma.cobro.update({
    where: { id },
    data: { anulado: true }
  });

  return { mensaje: 'Cobro anulado correctamente' };
};

// ============ PAGOS ============

const listarPagos = async (filtros = {}) => {
  const where = { anulado: false };

  if (filtros.proveedorId) {
    where.proveedorId = filtros.proveedorId;
  }

  return prisma.pago.findMany({
    where,
    include: {
      proveedor: true,
      cuentaBancaria: true
    },
    orderBy: { creadoEn: 'desc' }
  });
};

const registrarPago = async (datos) => {
  if (!datos.proveedorId) {
    throw new ErrorApp('El proveedor es requerido', 400);
  }
  if (!datos.monto || datos.monto <= 0) {
    throw new ErrorApp('El monto debe ser mayor a cero', 400);
  }
  if (!datos.concepto) {
    throw new ErrorApp('El concepto es requerido', 400);
  }

  const proveedor = await prisma.proveedor.findFirst({
    where: { id: datos.proveedorId, activo: true }
  });

  if (!proveedor) {
    throw new ErrorApp('Proveedor no encontrado', 404);
  }

  // Verificar saldo si paga desde cuenta bancaria
  if (datos.cuentaBancariaId) {
    const cuenta = await prisma.cuentaBancaria.findUnique({
      where: { id: datos.cuentaBancariaId }
    });

    if (!cuenta) {
      throw new ErrorApp('Cuenta bancaria no encontrada', 404);
    }
    if (Number(cuenta.saldo) < datos.monto) {
      throw new ErrorApp('Saldo insuficiente en la cuenta', 400);
    }

    // Descontar de cuenta bancaria
    await prisma.cuentaBancaria.update({
      where: { id: datos.cuentaBancariaId },
      data: { saldo: { decrement: datos.monto } }
    });
  }

  const numero = await generarCodigoDesdeConteo(prisma, 'pago', 'PAG');

  return prisma.pago.create({
    data: {
      numero,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
      proveedorId: datos.proveedorId,
      monto: datos.monto,
      metodoPago: datos.metodoPago || 'transferencia',
      cuentaBancariaId: datos.cuentaBancariaId || null,
      concepto: datos.concepto,
      referencia: datos.referencia || null
    },
    include: {
      proveedor: true,
      cuentaBancaria: true
    }
  });
};

const anularPago = async (id) => {
  const pago = await prisma.pago.findFirst({
    where: { id, anulado: false }
  });

  if (!pago) {
    throw new ErrorApp('Pago no encontrado', 404);
  }

  // Revertir saldo de cuenta bancaria
  if (pago.cuentaBancariaId) {
    await prisma.cuentaBancaria.update({
      where: { id: pago.cuentaBancariaId },
      data: { saldo: { increment: Number(pago.monto) } }
    });
  }

  await prisma.pago.update({
    where: { id },
    data: { anulado: true }
  });

  return { mensaje: 'Pago anulado correctamente' };
};

// ============ PROVEEDORES ============

const listarProveedores = async (filtros = {}) => {
  const where = { activo: true };

  if (filtros.busqueda) {
    where.OR = [
      { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
      { codigo: { contains: filtros.busqueda, mode: 'insensitive' } }
    ];
  }

  return prisma.proveedor.findMany({
    where,
    orderBy: { nombre: 'asc' }
  });
};

const crearNuevoProveedor = async (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre del proveedor es requerido', 400);
  }

  const codigo = await generarCodigoDesdeConteo(prisma, 'proveedor', 'PROV');

  return prisma.proveedor.create({
    data: {
      codigo,
      nombre: datos.nombre,
      tipoDocumento: datos.tipoDocumento || 'CUIT',
      numeroDocumento: datos.numeroDocumento || '',
      direccion: datos.direccion || '',
      telefono: datos.telefono || null,
      email: datos.email || null
    }
  });
};

const actualizarProveedor = async (id, datos) => {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id, activo: true }
  });

  if (!proveedor) {
    throw new ErrorApp('Proveedor no encontrado', 404);
  }

  return prisma.proveedor.update({
    where: { id },
    data: {
      nombre: datos.nombre !== undefined ? datos.nombre : proveedor.nombre,
      tipoDocumento: datos.tipoDocumento !== undefined ? datos.tipoDocumento : proveedor.tipoDocumento,
      numeroDocumento: datos.numeroDocumento !== undefined ? datos.numeroDocumento : proveedor.numeroDocumento,
      direccion: datos.direccion !== undefined ? datos.direccion : proveedor.direccion,
      telefono: datos.telefono !== undefined ? datos.telefono : proveedor.telefono,
      email: datos.email !== undefined ? datos.email : proveedor.email
    }
  });
};

// ============ REPORTES ============

const obtenerSaldosPendientes = async () => {
  const facturasPendientes = await prisma.factura.findMany({
    where: {
      estado: { in: ['pendiente', 'cobrada_parcial'] }
    },
    include: { cliente: true }
  });

  const resumenPorCliente = {};

  for (const factura of facturasPendientes) {
    const clienteId = factura.clienteId;
    if (!resumenPorCliente[clienteId]) {
      resumenPorCliente[clienteId] = {
        cliente: factura.cliente,
        totalPendiente: 0,
        cantidadFacturas: 0
      };
    }
    resumenPorCliente[clienteId].totalPendiente += Number(factura.saldoPendiente);
    resumenPorCliente[clienteId].cantidadFacturas++;
  }

  return Object.values(resumenPorCliente);
};

module.exports = {
  listarCuentasBancarias,
  crearNuevaCuentaBancaria,
  actualizarCuentaBancaria,
  listarCobros,
  obtenerCobro,
  registrarCobro,
  anularCobro,
  listarPagos,
  registrarPago,
  anularPago,
  listarProveedores,
  crearNuevoProveedor,
  actualizarProveedor,
  obtenerSaldosPendientes
};
