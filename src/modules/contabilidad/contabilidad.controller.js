const contabilidadService = require('./contabilidad.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ CUENTAS CONTABLES ============

const listarCuentas = asyncHandler(async (req, res) => {
  const cuentas = await contabilidadService.listarCuentas();
  res.json({ exito: true, datos: cuentas });
});

const crearCuenta = asyncHandler(async (req, res) => {
  const cuenta = await contabilidadService.crearNuevaCuenta(req.body);
  res.status(201).json({ exito: true, datos: cuenta });
});

const actualizarCuenta = asyncHandler(async (req, res) => {
  const cuenta = await contabilidadService.actualizarCuenta(req.params.id, req.body);
  res.json({ exito: true, datos: cuenta });
});

// ============ ASIENTOS ============

const listarAsientos = asyncHandler(async (req, res) => {
  const filtros = {
    fechaDesde: req.query.fechaDesde,
    fechaHasta: req.query.fechaHasta
  };
  const asientos = await contabilidadService.listarAsientos(filtros);
  res.json({ exito: true, datos: asientos });
});

const obtenerAsiento = asyncHandler(async (req, res) => {
  const asiento = await contabilidadService.obtenerAsiento(req.params.id);
  res.json({ exito: true, datos: asiento });
});

const crearAsiento = asyncHandler(async (req, res) => {
  const asiento = await contabilidadService.crearNuevoAsiento(req.body);
  res.status(201).json({ exito: true, datos: asiento });
});

// ============ REPORTES ============

const obtenerLibroDiario = asyncHandler(async (req, res) => {
  const filtros = {
    fechaDesde: req.query.fechaDesde,
    fechaHasta: req.query.fechaHasta
  };
  const libroDiario = await contabilidadService.obtenerLibroDiario(filtros);
  res.json({ exito: true, datos: libroDiario });
});

const obtenerLibroMayor = asyncHandler(async (req, res) => {
  const libroMayor = await contabilidadService.obtenerLibroMayor(req.params.cuentaId);
  res.json({ exito: true, datos: libroMayor });
});

const obtenerBalanceSumasSaldos = asyncHandler(async (req, res) => {
  const balance = await contabilidadService.obtenerBalanceSumasSaldos();
  res.json({ exito: true, datos: balance });
});

module.exports = {
  listarCuentas,
  crearCuenta,
  actualizarCuenta,
  listarAsientos,
  obtenerAsiento,
  crearAsiento,
  obtenerLibroDiario,
  obtenerLibroMayor,
  obtenerBalanceSumasSaldos
};
