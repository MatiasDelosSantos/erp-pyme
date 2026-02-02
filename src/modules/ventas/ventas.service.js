const { db } = require('../../shared/data/memoria');
const { crearCliente, crearPedido, crearPedidoLinea, crearAlbaran, crearAlbaranLinea } = require('./ventas.model');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');
const stockService = require('../stock/stock.service');

// ============ CLIENTES ============

const listarClientes = (filtros = {}) => {
  let resultado = db.clientes.filter(c => c.activo);

  if (filtros.busqueda) {
    const busqueda = filtros.busqueda.toLowerCase();
    resultado = resultado.filter(c =>
      c.nombre.toLowerCase().includes(busqueda) ||
      c.codigo.toLowerCase().includes(busqueda) ||
      c.numeroDocumento.includes(busqueda)
    );
  }

  return resultado;
};

const obtenerCliente = (id) => {
  const cliente = db.clientes.find(c => c.id === id && c.activo);
  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }
  return cliente;
};

const crearNuevoCliente = (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre del cliente es requerido', 400);
  }

  const cliente = crearCliente(datos);
  db.clientes.push(cliente);
  return cliente;
};

const actualizarCliente = (id, datos) => {
  const indice = db.clientes.findIndex(c => c.id === id && c.activo);
  if (indice === -1) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  db.clientes[indice] = {
    ...db.clientes[indice],
    ...datos,
    id: db.clientes[indice].id,
    codigo: db.clientes[indice].codigo,
    creadoEn: db.clientes[indice].creadoEn
  };

  return db.clientes[indice];
};

const eliminarCliente = (id) => {
  const indice = db.clientes.findIndex(c => c.id === id && c.activo);
  if (indice === -1) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  db.clientes[indice].activo = false;
  return { mensaje: 'Cliente eliminado correctamente' };
};

// ============ PEDIDOS ============

const listarPedidos = (filtros = {}) => {
  let resultado = [...db.pedidos];

  if (filtros.estado) {
    resultado = resultado.filter(p => p.estado === filtros.estado);
  }
  if (filtros.clienteId) {
    resultado = resultado.filter(p => p.clienteId === filtros.clienteId);
  }

  return resultado.map(p => ({
    ...p,
    cliente: db.clientes.find(c => c.id === p.clienteId)
  }));
};

const obtenerPedido = (id) => {
  const pedido = db.pedidos.find(p => p.id === id);
  if (!pedido) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  const cliente = db.clientes.find(c => c.id === pedido.clienteId);
  const lineasConArticulo = pedido.lineas.map(linea => ({
    ...linea,
    articulo: db.articulos.find(a => a.id === linea.articuloId)
  }));

  return {
    ...pedido,
    cliente,
    lineas: lineasConArticulo
  };
};

const crearNuevoPedido = (datos) => {
  if (!datos.clienteId) {
    throw new ErrorApp('El cliente es requerido', 400);
  }

  const cliente = db.clientes.find(c => c.id === datos.clienteId && c.activo);
  if (!cliente) {
    throw new ErrorApp('Cliente no encontrado', 404);
  }

  const pedido = crearPedido(datos, datos.clienteId);

  // Agregar líneas si vienen en el request
  if (datos.lineas && Array.isArray(datos.lineas)) {
    for (const lineaData of datos.lineas) {
      const articulo = stockService.obtenerArticulo(lineaData.articuloId);
      const linea = crearPedidoLinea({
        ...lineaData,
        precioUnitario: lineaData.precioUnitario || articulo.precioVenta
      }, pedido.id);
      pedido.lineas.push(linea);
    }
    pedido.total = pedido.lineas.reduce((sum, l) => sum + l.subtotal, 0);
  }

  db.pedidos.push(pedido);
  return pedido;
};

const actualizarPedido = (id, datos) => {
  const indice = db.pedidos.findIndex(p => p.id === id);
  if (indice === -1) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  const pedido = db.pedidos[indice];
  if (pedido.estado !== 'borrador') {
    throw new ErrorApp('Solo se pueden modificar pedidos en borrador', 400);
  }

  // Actualizar líneas si vienen
  if (datos.lineas && Array.isArray(datos.lineas)) {
    pedido.lineas = [];
    for (const lineaData of datos.lineas) {
      const articulo = stockService.obtenerArticulo(lineaData.articuloId);
      const linea = crearPedidoLinea({
        ...lineaData,
        precioUnitario: lineaData.precioUnitario || articulo.precioVenta
      }, pedido.id);
      pedido.lineas.push(linea);
    }
    pedido.total = pedido.lineas.reduce((sum, l) => sum + l.subtotal, 0);
  }

  if (datos.observaciones !== undefined) {
    pedido.observaciones = datos.observaciones;
  }

  return pedido;
};

const cambiarEstadoPedido = (id, nuevoEstado) => {
  const estadosValidos = ['borrador', 'confirmado', 'entregado', 'cancelado'];
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new ErrorApp('Estado no válido', 400);
  }

  const indice = db.pedidos.findIndex(p => p.id === id);
  if (indice === -1) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  db.pedidos[indice].estado = nuevoEstado;
  return db.pedidos[indice];
};

const cancelarPedido = (id) => {
  return cambiarEstadoPedido(id, 'cancelado');
};

// ============ ALBARANES ============

const listarAlbaranes = (filtros = {}) => {
  let resultado = [...db.albaranes];

  if (filtros.clienteId) {
    resultado = resultado.filter(a => a.clienteId === filtros.clienteId);
  }

  return resultado.map(a => ({
    ...a,
    cliente: db.clientes.find(c => c.id === a.clienteId),
    pedido: db.pedidos.find(p => p.id === a.pedidoId)
  }));
};

const obtenerAlbaran = (id) => {
  const albaran = db.albaranes.find(a => a.id === id);
  if (!albaran) {
    throw new ErrorApp('Albarán no encontrado', 404);
  }

  const lineasConArticulo = albaran.lineas.map(linea => ({
    ...linea,
    articulo: db.articulos.find(a => a.id === linea.articuloId)
  }));

  return {
    ...albaran,
    cliente: db.clientes.find(c => c.id === albaran.clienteId),
    pedido: db.pedidos.find(p => p.id === albaran.pedidoId),
    lineas: lineasConArticulo
  };
};

const crearNuevoAlbaran = (datos) => {
  if (!datos.pedidoId) {
    throw new ErrorApp('El pedido es requerido', 400);
  }

  const pedido = db.pedidos.find(p => p.id === datos.pedidoId);
  if (!pedido) {
    throw new ErrorApp('Pedido no encontrado', 404);
  }

  if (pedido.estado !== 'confirmado') {
    throw new ErrorApp('Solo se pueden crear albaranes de pedidos confirmados', 400);
  }

  const cliente = db.clientes.find(c => c.id === pedido.clienteId);
  const albaran = crearAlbaran(datos, pedido, cliente);

  // Crear líneas del albarán y descontar stock
  for (const lineaPedido of pedido.lineas) {
    const cantidadEntrega = datos.lineas?.find(l => l.articuloId === lineaPedido.articuloId)?.cantidadEntregada
      || lineaPedido.cantidad;

    const lineaAlbaran = crearAlbaranLinea({
      articuloId: lineaPedido.articuloId,
      cantidadEntregada: cantidadEntrega
    }, albaran.id);

    albaran.lineas.push(lineaAlbaran);

    // Descontar stock
    stockService.ajustarStock(lineaPedido.articuloId, -cantidadEntrega);
  }

  // Marcar pedido como entregado
  pedido.estado = 'entregado';

  db.albaranes.push(albaran);
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
