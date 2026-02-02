const { db } = require('../../shared/data/memoria');
const { crearCuentaBancaria, crearCobro, crearPago, crearProveedor } = require('./tesoreria.model');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');
const facturacionService = require('../facturacion/facturacion.service');

// ============ CUENTAS BANCARIAS ============

const listarCuentasBancarias = () => {
  return db.cuentasBancarias.filter(c => c.activa);
};

const crearNuevaCuentaBancaria = (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre de la cuenta es requerido', 400);
  }

  const cuenta = crearCuentaBancaria(datos);
  db.cuentasBancarias.push(cuenta);
  return cuenta;
};

const actualizarCuentaBancaria = (id, datos) => {
  const indice = db.cuentasBancarias.findIndex(c => c.id === id && c.activa);
  if (indice === -1) {
    throw new ErrorApp('Cuenta bancaria no encontrada', 404);
  }

  db.cuentasBancarias[indice] = {
    ...db.cuentasBancarias[indice],
    ...datos,
    id: db.cuentasBancarias[indice].id,
    creadoEn: db.cuentasBancarias[indice].creadoEn
  };

  return db.cuentasBancarias[indice];
};

const actualizarSaldoCuenta = (cuentaId, monto) => {
  const indice = db.cuentasBancarias.findIndex(c => c.id === cuentaId);
  if (indice !== -1) {
    db.cuentasBancarias[indice].saldo += monto;
  }
};

// ============ COBROS ============

const listarCobros = (filtros = {}) => {
  let resultado = db.cobros.filter(c => !c.anulado);

  if (filtros.clienteId) {
    resultado = resultado.filter(c => c.clienteId === filtros.clienteId);
  }

  return resultado.map(c => ({
    ...c,
    cliente: db.clientes.find(cl => cl.id === c.clienteId),
    factura: db.facturas.find(f => f.id === c.facturaId)
  }));
};

const obtenerCobro = (id) => {
  const cobro = db.cobros.find(c => c.id === id && !c.anulado);
  if (!cobro) {
    throw new ErrorApp('Cobro no encontrado', 404);
  }

  return {
    ...cobro,
    cliente: db.clientes.find(c => c.id === cobro.clienteId),
    factura: db.facturas.find(f => f.id === cobro.facturaId),
    cuentaBancaria: cobro.cuentaBancariaId
      ? db.cuentasBancarias.find(cb => cb.id === cobro.cuentaBancariaId)
      : null
  };
};

const registrarCobro = (datos) => {
  if (!datos.facturaId) {
    throw new ErrorApp('La factura es requerida', 400);
  }
  if (!datos.monto || datos.monto <= 0) {
    throw new ErrorApp('El monto debe ser mayor a cero', 400);
  }

  const factura = db.facturas.find(f => f.id === datos.facturaId);
  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }
  if (factura.estado === 'anulada') {
    throw new ErrorApp('No se puede cobrar una factura anulada', 400);
  }
  if (factura.estado === 'cobrada') {
    throw new ErrorApp('La factura ya está cobrada', 400);
  }
  if (datos.monto > factura.saldoPendiente) {
    throw new ErrorApp('El monto excede el saldo pendiente', 400);
  }

  const cobro = crearCobro({
    ...datos,
    clienteId: factura.clienteId
  });

  // Actualizar saldo de la factura
  facturacionService.actualizarSaldoFactura(factura.id, datos.monto);

  // Actualizar saldo de cuenta bancaria si aplica
  if (datos.cuentaBancariaId && datos.metodoPago !== 'efectivo') {
    actualizarSaldoCuenta(datos.cuentaBancariaId, datos.monto);
  }

  db.cobros.push(cobro);
  return cobro;
};

const anularCobro = (id) => {
  const indice = db.cobros.findIndex(c => c.id === id && !c.anulado);
  if (indice === -1) {
    throw new ErrorApp('Cobro no encontrado', 404);
  }

  const cobro = db.cobros[indice];

  // Revertir el saldo de la factura
  const facturaIndice = db.facturas.findIndex(f => f.id === cobro.facturaId);
  if (facturaIndice !== -1) {
    db.facturas[facturaIndice].saldoPendiente += cobro.monto;
    if (db.facturas[facturaIndice].saldoPendiente > 0) {
      db.facturas[facturaIndice].estado = 'pendiente';
    }
  }

  // Revertir saldo de cuenta bancaria
  if (cobro.cuentaBancariaId) {
    actualizarSaldoCuenta(cobro.cuentaBancariaId, -cobro.monto);
  }

  cobro.anulado = true;
  return { mensaje: 'Cobro anulado correctamente' };
};

// ============ PAGOS ============

const listarPagos = (filtros = {}) => {
  let resultado = db.pagos.filter(p => !p.anulado);

  if (filtros.proveedorId) {
    resultado = resultado.filter(p => p.proveedorId === filtros.proveedorId);
  }

  return resultado.map(p => ({
    ...p,
    proveedor: db.proveedores.find(prov => prov.id === p.proveedorId)
  }));
};

const registrarPago = (datos) => {
  if (!datos.proveedorId) {
    throw new ErrorApp('El proveedor es requerido', 400);
  }
  if (!datos.monto || datos.monto <= 0) {
    throw new ErrorApp('El monto debe ser mayor a cero', 400);
  }
  if (!datos.concepto) {
    throw new ErrorApp('El concepto es requerido', 400);
  }

  const proveedor = db.proveedores.find(p => p.id === datos.proveedorId && p.activo);
  if (!proveedor) {
    throw new ErrorApp('Proveedor no encontrado', 404);
  }

  const pago = crearPago(datos);

  // Descontar de cuenta bancaria si aplica
  if (datos.cuentaBancariaId) {
    const cuenta = db.cuentasBancarias.find(c => c.id === datos.cuentaBancariaId);
    if (!cuenta) {
      throw new ErrorApp('Cuenta bancaria no encontrada', 404);
    }
    if (cuenta.saldo < datos.monto) {
      throw new ErrorApp('Saldo insuficiente en la cuenta', 400);
    }
    actualizarSaldoCuenta(datos.cuentaBancariaId, -datos.monto);
  }

  db.pagos.push(pago);
  return pago;
};

const anularPago = (id) => {
  const indice = db.pagos.findIndex(p => p.id === id && !p.anulado);
  if (indice === -1) {
    throw new ErrorApp('Pago no encontrado', 404);
  }

  const pago = db.pagos[indice];

  // Revertir saldo de cuenta bancaria
  if (pago.cuentaBancariaId) {
    actualizarSaldoCuenta(pago.cuentaBancariaId, pago.monto);
  }

  pago.anulado = true;
  return { mensaje: 'Pago anulado correctamente' };
};

// ============ PROVEEDORES ============

const listarProveedores = (filtros = {}) => {
  let resultado = db.proveedores.filter(p => p.activo);

  if (filtros.busqueda) {
    const busqueda = filtros.busqueda.toLowerCase();
    resultado = resultado.filter(p =>
      p.nombre.toLowerCase().includes(busqueda) ||
      p.codigo.toLowerCase().includes(busqueda)
    );
  }

  return resultado;
};

const crearNuevoProveedor = (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre del proveedor es requerido', 400);
  }

  const proveedor = crearProveedor(datos);
  db.proveedores.push(proveedor);
  return proveedor;
};

const actualizarProveedor = (id, datos) => {
  const indice = db.proveedores.findIndex(p => p.id === id && p.activo);
  if (indice === -1) {
    throw new ErrorApp('Proveedor no encontrado', 404);
  }

  db.proveedores[indice] = {
    ...db.proveedores[indice],
    ...datos,
    id: db.proveedores[indice].id,
    codigo: db.proveedores[indice].codigo,
    creadoEn: db.proveedores[indice].creadoEn
  };

  return db.proveedores[indice];
};

// ============ REPORTES ============

const obtenerSaldosPendientes = () => {
  const facturasPendientes = db.facturas.filter(f =>
    f.estado === 'pendiente' || f.estado === 'cobrada_parcial'
  );

  const resumenPorCliente = {};

  for (const factura of facturasPendientes) {
    const clienteId = factura.clienteId;
    if (!resumenPorCliente[clienteId]) {
      const cliente = db.clientes.find(c => c.id === clienteId);
      resumenPorCliente[clienteId] = {
        cliente: cliente,
        totalPendiente: 0,
        cantidadFacturas: 0
      };
    }
    resumenPorCliente[clienteId].totalPendiente += factura.saldoPendiente;
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
