const tesoreriaService = require('./tesoreria.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ CUENTAS BANCARIAS ============

const listarCuentasBancarias = asyncHandler(async (req, res) => {
  const cuentas = tesoreriaService.listarCuentasBancarias();
  res.json({ exito: true, datos: cuentas });
});

const crearCuentaBancaria = asyncHandler(async (req, res) => {
  const cuenta = tesoreriaService.crearNuevaCuentaBancaria(req.body);
  res.status(201).json({ exito: true, datos: cuenta });
});

const actualizarCuentaBancaria = asyncHandler(async (req, res) => {
  const cuenta = tesoreriaService.actualizarCuentaBancaria(req.params.id, req.body);
  res.json({ exito: true, datos: cuenta });
});

// ============ COBROS ============

const listarCobros = asyncHandler(async (req, res) => {
  const filtros = { clienteId: req.query.clienteId };
  const cobros = tesoreriaService.listarCobros(filtros);
  res.json({ exito: true, datos: cobros });
});

const obtenerCobro = asyncHandler(async (req, res) => {
  const cobro = tesoreriaService.obtenerCobro(req.params.id);
  res.json({ exito: true, datos: cobro });
});

const registrarCobro = asyncHandler(async (req, res) => {
  const cobro = tesoreriaService.registrarCobro(req.body);
  res.status(201).json({ exito: true, datos: cobro });
});

const anularCobro = asyncHandler(async (req, res) => {
  const resultado = tesoreriaService.anularCobro(req.params.id);
  res.json({ exito: true, ...resultado });
});

// ============ PAGOS ============

const listarPagos = asyncHandler(async (req, res) => {
  const filtros = { proveedorId: req.query.proveedorId };
  const pagos = tesoreriaService.listarPagos(filtros);
  res.json({ exito: true, datos: pagos });
});

const registrarPago = asyncHandler(async (req, res) => {
  const pago = tesoreriaService.registrarPago(req.body);
  res.status(201).json({ exito: true, datos: pago });
});

const anularPago = asyncHandler(async (req, res) => {
  const resultado = tesoreriaService.anularPago(req.params.id);
  res.json({ exito: true, ...resultado });
});

// ============ PROVEEDORES ============

const listarProveedores = asyncHandler(async (req, res) => {
  const filtros = { busqueda: req.query.busqueda };
  const proveedores = tesoreriaService.listarProveedores(filtros);
  res.json({ exito: true, datos: proveedores });
});

const crearProveedor = asyncHandler(async (req, res) => {
  const proveedor = tesoreriaService.crearNuevoProveedor(req.body);
  res.status(201).json({ exito: true, datos: proveedor });
});

const actualizarProveedor = asyncHandler(async (req, res) => {
  const proveedor = tesoreriaService.actualizarProveedor(req.params.id, req.body);
  res.json({ exito: true, datos: proveedor });
});

// ============ REPORTES ============

const obtenerSaldosPendientes = asyncHandler(async (req, res) => {
  const saldos = tesoreriaService.obtenerSaldosPendientes();
  res.json({ exito: true, datos: saldos });
});

module.exports = {
  listarCuentasBancarias,
  crearCuentaBancaria,
  actualizarCuentaBancaria,
  listarCobros,
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
