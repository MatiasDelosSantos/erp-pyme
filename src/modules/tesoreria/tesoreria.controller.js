const tesoreriaService = require('./tesoreria.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ CUENTAS BANCARIAS ============

const listarCuentasBancarias = asyncHandler(async (req, res) => {
  const cuentas = await tesoreriaService.listarCuentasBancarias();
  res.json({ exito: true, datos: cuentas });
});

const crearCuentaBancaria = asyncHandler(async (req, res) => {
  const cuenta = await tesoreriaService.crearNuevaCuentaBancaria(req.body);
  res.status(201).json({ exito: true, datos: cuenta });
});

const actualizarCuentaBancaria = asyncHandler(async (req, res) => {
  const cuenta = await tesoreriaService.actualizarCuentaBancaria(req.params.id, req.body);
  res.json({ exito: true, datos: cuenta });
});

// ============ COBROS ============

const listarCobros = asyncHandler(async (req, res) => {
  const filtros = { clienteId: req.query.clienteId };
  const cobros = await tesoreriaService.listarCobros(filtros);
  res.json({ exito: true, datos: cobros });
});

const obtenerCobro = asyncHandler(async (req, res) => {
  const cobro = await tesoreriaService.obtenerCobro(req.params.id);
  res.json({ exito: true, datos: cobro });
});

const listarCobrosPorFactura = asyncHandler(async (req, res) => {
  const cobros = await tesoreriaService.listarCobrosPorFactura(req.params.facturaId);
  res.json({ exito: true, datos: cobros });
});

const registrarCobro = asyncHandler(async (req, res) => {
  const cobro = await tesoreriaService.registrarCobro(req.body);
  res.status(201).json({ exito: true, datos: cobro });
});

const anularCobro = asyncHandler(async (req, res) => {
  await tesoreriaService.anularCobro(req.params.id);
  res.json({ exito: true });
});

// ============ PAGOS ============

const listarPagos = asyncHandler(async (req, res) => {
  const filtros = { proveedorId: req.query.proveedorId };
  const pagos = await tesoreriaService.listarPagos(filtros);
  res.json({ exito: true, datos: pagos });
});

const registrarPago = asyncHandler(async (req, res) => {
  const pago = await tesoreriaService.registrarPago(req.body);
  res.status(201).json({ exito: true, datos: pago });
});

const anularPago = asyncHandler(async (req, res) => {
  const resultado = await tesoreriaService.anularPago(req.params.id);
  res.json({ exito: true, ...resultado });
});

// ============ PROVEEDORES ============

const listarProveedores = asyncHandler(async (req, res) => {
  const filtros = { busqueda: req.query.busqueda };
  const proveedores = await tesoreriaService.listarProveedores(filtros);
  res.json({ exito: true, datos: proveedores });
});

const crearProveedor = asyncHandler(async (req, res) => {
  const proveedor = await tesoreriaService.crearNuevoProveedor(req.body);
  res.status(201).json({ exito: true, datos: proveedor });
});

const actualizarProveedor = asyncHandler(async (req, res) => {
  const proveedor = await tesoreriaService.actualizarProveedor(req.params.id, req.body);
  res.json({ exito: true, datos: proveedor });
});

// ============ REPORTES ============

const obtenerSaldosPendientes = asyncHandler(async (req, res) => {
  const saldos = await tesoreriaService.obtenerSaldosPendientes();
  res.json({ exito: true, datos: saldos });
});

module.exports = {
  listarCuentasBancarias,
  crearCuentaBancaria,
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
  crearProveedor,
  actualizarProveedor,
  obtenerSaldosPendientes
};
