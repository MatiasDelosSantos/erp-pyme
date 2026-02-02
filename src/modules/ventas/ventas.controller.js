const ventasService = require('./ventas.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ CLIENTES ============

const listarClientes = asyncHandler(async (req, res) => {
  const filtros = { busqueda: req.query.busqueda };
  const clientes = await ventasService.listarClientes(filtros);
  res.json({ exito: true, datos: clientes });
});

const obtenerCliente = asyncHandler(async (req, res) => {
  const cliente = await ventasService.obtenerCliente(req.params.id);
  res.json({ exito: true, datos: cliente });
});

const crearCliente = asyncHandler(async (req, res) => {
  const cliente = await ventasService.crearNuevoCliente(req.body);
  res.status(201).json({ exito: true, datos: cliente });
});

const actualizarCliente = asyncHandler(async (req, res) => {
  const cliente = await ventasService.actualizarCliente(req.params.id, req.body);
  res.json({ exito: true, datos: cliente });
});

const eliminarCliente = asyncHandler(async (req, res) => {
  const resultado = await ventasService.eliminarCliente(req.params.id);
  res.json({ exito: true, ...resultado });
});

// ============ PEDIDOS ============

const listarPedidos = asyncHandler(async (req, res) => {
  const filtros = {
    estado: req.query.estado,
    clienteId: req.query.clienteId
  };
  const pedidos = await ventasService.listarPedidos(filtros);
  res.json({ exito: true, datos: pedidos });
});

const obtenerPedido = asyncHandler(async (req, res) => {
  const pedido = await ventasService.obtenerPedido(req.params.id);
  res.json({ exito: true, datos: pedido });
});

const crearPedido = asyncHandler(async (req, res) => {
  const pedido = await ventasService.crearNuevoPedido(req.body);
  res.status(201).json({ exito: true, datos: pedido });
});

const actualizarPedido = asyncHandler(async (req, res) => {
  const pedido = await ventasService.actualizarPedido(req.params.id, req.body);
  res.json({ exito: true, datos: pedido });
});

const cambiarEstadoPedido = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  const pedido = await ventasService.cambiarEstadoPedido(req.params.id, estado);
  res.json({ exito: true, datos: pedido });
});

const cancelarPedido = asyncHandler(async (req, res) => {
  const pedido = await ventasService.cancelarPedido(req.params.id);
  res.json({ exito: true, datos: pedido });
});

// ============ ALBARANES ============

const listarAlbaranes = asyncHandler(async (req, res) => {
  const filtros = { clienteId: req.query.clienteId };
  const albaranes = await ventasService.listarAlbaranes(filtros);
  res.json({ exito: true, datos: albaranes });
});

const obtenerAlbaran = asyncHandler(async (req, res) => {
  const albaran = await ventasService.obtenerAlbaran(req.params.id);
  res.json({ exito: true, datos: albaran });
});

const crearAlbaran = asyncHandler(async (req, res) => {
  const albaran = await ventasService.crearNuevoAlbaran(req.body);
  res.status(201).json({ exito: true, datos: albaran });
});

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  listarPedidos,
  obtenerPedido,
  crearPedido,
  actualizarPedido,
  cambiarEstadoPedido,
  cancelarPedido,
  listarAlbaranes,
  obtenerAlbaran,
  crearAlbaran
};
