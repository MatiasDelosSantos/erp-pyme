const { db } = require('../../shared/data/memoria');
const { crearFactura, crearFacturaLinea, crearNotaCredito, crearNotaCreditoLinea } = require('./facturacion.model');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ FACTURAS ============

const listarFacturas = (filtros = {}) => {
  let resultado = [...db.facturas];

  if (filtros.estado) {
    resultado = resultado.filter(f => f.estado === filtros.estado);
  }
  if (filtros.clienteId) {
    resultado = resultado.filter(f => f.clienteId === filtros.clienteId);
  }

  return resultado.map(f => ({
    ...f,
    cliente: db.clientes.find(c => c.id === f.clienteId)
  }));
};

const obtenerFactura = (id) => {
  const factura = db.facturas.find(f => f.id === id);
  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  const lineasConArticulo = factura.lineas.map(linea => ({
    ...linea,
    articulo: db.articulos.find(a => a.id === linea.articuloId)
  }));

  return {
    ...factura,
    cliente: db.clientes.find(c => c.id === factura.clienteId),
    pedido: factura.pedidoId ? db.pedidos.find(p => p.id === factura.pedidoId) : null,
    lineas: lineasConArticulo
  };
};

const calcularTotales = (factura) => {
  factura.subtotal = factura.lineas.reduce((sum, l) => sum + l.subtotal, 0);
  factura.montoIva = factura.subtotal * (factura.porcentajeIva / 100);
  factura.total = factura.subtotal + factura.montoIva;
  factura.saldoPendiente = factura.total;
};

const crearNuevaFactura = (datos) => {
  if (!datos.clienteId) {
    throw new ErrorApp('El cliente es requerido', 400);
  }

  const cliente = db.clientes.find(c => c.id === datos.clienteId && c.activo);
  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  const factura = crearFactura(datos, cliente);

  // Si viene de un pedido, copiar las líneas
  if (datos.pedidoId) {
    const pedido = db.pedidos.find(p => p.id === datos.pedidoId);
    if (!pedido) {
      throw new ErrorApp('Pedido no encontrado', 404);
    }
    if (pedido.estado !== 'entregado') {
      throw new ErrorApp('Solo se pueden facturar pedidos entregados', 400);
    }

    for (const lineaPedido of pedido.lineas) {
      const articulo = db.articulos.find(a => a.id === lineaPedido.articuloId);
      const linea = crearFacturaLinea({
        articuloId: lineaPedido.articuloId,
        descripcion: articulo ? articulo.nombre : 'Artículo',
        cantidad: lineaPedido.cantidad,
        precioUnitario: lineaPedido.precioUnitario
      }, factura.id);
      factura.lineas.push(linea);
    }
  }

  // Agregar líneas manuales si vienen
  if (datos.lineas && Array.isArray(datos.lineas)) {
    for (const lineaData of datos.lineas) {
      const articulo = db.articulos.find(a => a.id === lineaData.articuloId);
      const linea = crearFacturaLinea({
        articuloId: lineaData.articuloId,
        descripcion: lineaData.descripcion || (articulo ? articulo.nombre : 'Artículo'),
        cantidad: lineaData.cantidad,
        precioUnitario: lineaData.precioUnitario || (articulo ? articulo.precioVenta : 0)
      }, factura.id);
      factura.lineas.push(linea);
    }
  }

  calcularTotales(factura);
  db.facturas.push(factura);

  return factura;
};

const anularFactura = (id) => {
  const indice = db.facturas.findIndex(f => f.id === id);
  if (indice === -1) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  const factura = db.facturas[indice];
  if (factura.estado === 'cobrada') {
    throw new ErrorApp('No se puede anular una factura cobrada', 400);
  }

  factura.estado = 'anulada';
  factura.saldoPendiente = 0;

  return factura;
};

const actualizarSaldoFactura = (facturaId, montoCobrado) => {
  const indice = db.facturas.findIndex(f => f.id === facturaId);
  if (indice === -1) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  const factura = db.facturas[indice];
  factura.saldoPendiente -= montoCobrado;

  if (factura.saldoPendiente <= 0) {
    factura.saldoPendiente = 0;
    factura.estado = 'cobrada';
  } else if (factura.saldoPendiente < factura.total) {
    factura.estado = 'cobrada_parcial';
  }

  return factura;
};

// ============ NOTAS DE CRÉDITO ============

const listarNotasCredito = (filtros = {}) => {
  let resultado = [...db.notasCredito];

  if (filtros.clienteId) {
    resultado = resultado.filter(nc => nc.clienteId === filtros.clienteId);
  }

  return resultado.map(nc => ({
    ...nc,
    cliente: db.clientes.find(c => c.id === nc.clienteId),
    factura: db.facturas.find(f => f.id === nc.facturaId)
  }));
};

const obtenerNotaCredito = (id) => {
  const notaCredito = db.notasCredito.find(nc => nc.id === id);
  if (!notaCredito) {
    throw new ErrorApp('Nota de crédito no encontrada', 404);
  }

  const lineasConArticulo = notaCredito.lineas.map(linea => ({
    ...linea,
    articulo: db.articulos.find(a => a.id === linea.articuloId)
  }));

  return {
    ...notaCredito,
    cliente: db.clientes.find(c => c.id === notaCredito.clienteId),
    factura: db.facturas.find(f => f.id === notaCredito.facturaId),
    lineas: lineasConArticulo
  };
};

const crearNuevaNotaCredito = (datos) => {
  if (!datos.facturaId) {
    throw new ErrorApp('La factura es requerida', 400);
  }
  if (!datos.motivo) {
    throw new ErrorApp('El motivo es requerido', 400);
  }

  const factura = db.facturas.find(f => f.id === datos.facturaId);
  if (!factura) {
    throw new ErrorApp('Factura no encontrada', 404);
  }

  const cliente = db.clientes.find(c => c.id === factura.clienteId);
  const notaCredito = crearNotaCredito(datos, factura, cliente);

  // Agregar líneas
  if (datos.lineas && Array.isArray(datos.lineas)) {
    for (const lineaData of datos.lineas) {
      const articulo = db.articulos.find(a => a.id === lineaData.articuloId);
      const linea = crearNotaCreditoLinea({
        articuloId: lineaData.articuloId,
        descripcion: lineaData.descripcion || (articulo ? articulo.nombre : 'Artículo'),
        cantidad: lineaData.cantidad,
        precioUnitario: lineaData.precioUnitario
      }, notaCredito.id);
      notaCredito.lineas.push(linea);
    }
  }

  // Calcular totales
  notaCredito.subtotal = notaCredito.lineas.reduce((sum, l) => sum + l.subtotal, 0);
  notaCredito.montoIva = notaCredito.subtotal * (factura.porcentajeIva / 100);
  notaCredito.total = notaCredito.subtotal + notaCredito.montoIva;

  db.notasCredito.push(notaCredito);
  return notaCredito;
};

const aplicarNotaCredito = (id) => {
  const indice = db.notasCredito.findIndex(nc => nc.id === id);
  if (indice === -1) {
    throw new ErrorApp('Nota de crédito no encontrada', 404);
  }

  const notaCredito = db.notasCredito[indice];
  if (notaCredito.aplicada) {
    throw new ErrorApp('La nota de crédito ya fue aplicada', 400);
  }

  // Reducir saldo de la factura
  actualizarSaldoFactura(notaCredito.facturaId, notaCredito.total);
  notaCredito.aplicada = true;

  return notaCredito;
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
