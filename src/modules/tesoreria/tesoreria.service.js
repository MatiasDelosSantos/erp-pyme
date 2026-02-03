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
    const error = new Error('PAYMENT_NOT_FOUND');
    error.code = 'PAYMENT_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  return cobro;
};

const listarCobrosPorFactura = async (facturaId) => {
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId }
  });

  if (!factura) {
    const error = new Error('INVOICE_NOT_FOUND');
    error.code = 'INVOICE_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  return prisma.cobro.findMany({
    where: {
      facturaId,
      anulado: false
    },
    orderBy: { fecha: 'desc' }
  });
};

/**
 * Registra un cobro usando transacción para garantizar consistencia.
 *
 * Error codes:
 * - INVALID_AMOUNT: monto <= 0 o no proporcionado
 * - INVOICE_NOT_FOUND: factura no existe
 * - INVOICE_VOIDED: factura anulada
 * - INVOICE_ALREADY_PAID: factura ya cobrada completamente
 * - OVERPAYMENT_NOT_ALLOWED: monto excede saldo pendiente
 * - CURRENCY_MISMATCH: moneda del cobro no coincide con la factura
 */
const registrarCobro = async (datos) => {
  // Validación de monto
  if (!datos.monto || datos.monto <= 0) {
    const error = new Error('INVALID_AMOUNT');
    error.code = 'INVALID_AMOUNT';
    error.statusCode = 400;
    throw error;
  }

  // Ejecutar todo en transacción
  const result = await prisma.$transaction(async (tx) => {
    // 1. Obtener factura con bloqueo
    const factura = await tx.factura.findUnique({
      where: { id: datos.facturaId }
    });

    if (!factura) {
      const error = new Error('INVOICE_NOT_FOUND');
      error.code = 'INVOICE_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (factura.estado === 'VOID' || factura.estado === 'anulada') {
      const error = new Error('INVOICE_VOIDED');
      error.code = 'INVOICE_VOIDED';
      error.statusCode = 400;
      throw error;
    }

    if (factura.estado === 'PAID' || factura.estado === 'cobrada') {
      const error = new Error('INVOICE_ALREADY_PAID');
      error.code = 'INVOICE_ALREADY_PAID';
      error.statusCode = 400;
      throw error;
    }

    // Validar moneda si se especifica
    const monedaCobro = datos.moneda || factura.moneda || 'ARS';
    if (monedaCobro !== (factura.moneda || 'ARS')) {
      const error = new Error('CURRENCY_MISMATCH');
      error.code = 'CURRENCY_MISMATCH';
      error.statusCode = 400;
      throw error;
    }

    // Validar que no exceda el saldo
    const saldoPendiente = Number(factura.saldoPendiente);
    if (datos.monto > saldoPendiente) {
      const error = new Error('OVERPAYMENT_NOT_ALLOWED');
      error.code = 'OVERPAYMENT_NOT_ALLOWED';
      error.statusCode = 400;
      error.details = { saldoPendiente, montoIntentado: datos.monto };
      throw error;
    }

    // 2. Generar número de cobro
    const numero = await generarCodigoDesdeConteo(tx, 'cobro', 'COB');

    // 3. Crear el cobro
    const cobro = await tx.cobro.create({
      data: {
        numero,
        fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
        clienteId: factura.clienteId,
        facturaId: datos.facturaId,
        monto: datos.monto,
        moneda: monedaCobro,
        metodoPago: datos.metodoPago || 'CASH',
        cuentaBancariaId: datos.cuentaBancariaId || null,
        referencia: datos.referencia || null,
        observaciones: datos.observaciones || null
      }
    });

    // 4. Calcular nuevos valores de la factura
    const nuevoImporteCobrado = Number(factura.importeCobrado || 0) + datos.monto;
    const nuevoSaldoPendiente = Number(factura.total) - nuevoImporteCobrado;

    let nuevoEstado;
    if (nuevoSaldoPendiente <= 0) {
      nuevoEstado = 'PAID';
    } else if (nuevoImporteCobrado > 0) {
      nuevoEstado = 'PARTIALLY_PAID';
    } else {
      nuevoEstado = 'ISSUED';
    }

    // 5. Actualizar factura
    await tx.factura.update({
      where: { id: factura.id },
      data: {
        importeCobrado: nuevoImporteCobrado,
        saldoPendiente: Math.max(0, nuevoSaldoPendiente),
        estado: nuevoEstado
      }
    });

    // 6. Actualizar cuenta bancaria si aplica
    if (datos.cuentaBancariaId && datos.metodoPago !== 'CASH') {
      await tx.cuentaBancaria.update({
        where: { id: datos.cuentaBancariaId },
        data: { saldo: { increment: datos.monto } }
      });
    }

    return cobro;
  });

  // Retornar cobro con relaciones
  return prisma.cobro.findUnique({
    where: { id: result.id },
    include: {
      cliente: true,
      factura: true,
      cuentaBancaria: true
    }
  });
};

/**
 * Anula un cobro usando transacción.
 *
 * Error codes:
 * - PAYMENT_NOT_FOUND: cobro no existe o ya anulado
 */
const anularCobro = async (id) => {
  await prisma.$transaction(async (tx) => {
    const cobro = await tx.cobro.findFirst({
      where: { id, anulado: false }
    });

    if (!cobro) {
      const error = new Error('PAYMENT_NOT_FOUND');
      error.code = 'PAYMENT_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Revertir el saldo de la factura
    const factura = await tx.factura.findUnique({ where: { id: cobro.facturaId } });
    if (factura) {
      const nuevoImporteCobrado = Math.max(0, Number(factura.importeCobrado || 0) - Number(cobro.monto));
      const nuevoSaldo = Number(factura.total) - nuevoImporteCobrado;

      let nuevoEstado;
      if (nuevoImporteCobrado <= 0) {
        nuevoEstado = 'ISSUED';
      } else if (nuevoSaldo > 0) {
        nuevoEstado = 'PARTIALLY_PAID';
      } else {
        nuevoEstado = 'PAID';
      }

      await tx.factura.update({
        where: { id: factura.id },
        data: {
          importeCobrado: nuevoImporteCobrado,
          saldoPendiente: nuevoSaldo,
          estado: nuevoEstado
        }
      });
    }

    // Revertir saldo de cuenta bancaria
    if (cobro.cuentaBancariaId) {
      await tx.cuentaBancaria.update({
        where: { id: cobro.cuentaBancariaId },
        data: { saldo: { decrement: Number(cobro.monto) } }
      });
    }

    await tx.cobro.update({
      where: { id },
      data: { anulado: true }
    });
  });

  return { success: true };
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
  listarCobrosPorFactura,
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
