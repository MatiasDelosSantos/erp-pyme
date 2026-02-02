const contabilidadService = require('./contabilidad.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ CUENTAS CONTABLES ============

const listarCuentas = asyncHandler(async (req, res) => {
  const cuentas = contabilidadService.listarCuentas();
  res.json({ exito: true, datos: cuentas });
});

const crearCuenta = asyncHandler(async (req, res) => {
  const cuenta = contabilidadService.crearNuevaCuenta(req.body);
  res.status(201).json({ exito: true, datos: cuenta });
});

const actualizarCuenta = asyncHandler(async (req, res) => {
  const cuenta = contabilidadService.actualizarCuenta(req.params.id, req.body);
  res.json({ exito: true, datos: cuenta });
});

// ============ ASIENTOS ============

const listarAsientos = asyncHandler(async (req, res) => {
  const filtros = {
    fechaDesde: req.query.fechaDesde,
    fechaHasta: req.query.fechaHasta
  };
  const asientos = contabilidadService.listarAsientos(filtros);
  res.json({ exito: true, datos: asientos });
});

const obtenerAsiento = asyncHandler(async (req, res) => {
  const asiento = contabilidadService.obtenerAsiento(req.params.id);
  res.json({ exito: true, datos: asiento });
});

const crearAsiento = asyncHandler(async (req, res) => {
  const asiento = contabilidadService.crearNuevoAsiento(req.body);
  res.status(201).json({ exito: true, datos: asiento });
});

// ============ REPORTES ============

const obtenerLibroDiario = asyncHandler(async (req, res) => {
  const filtros = {
    fechaDesde: req.query.fechaDesde,
    fechaHasta: req.query.fechaHasta
  };
  const libroDiario = contabilidadService.obtenerLibroDiario(filtros);
  res.json({ exito: true, datos: libroDiario });
});

const obtenerLibroMayor = asyncHandler(async (req, res) => {
  const libroMayor = contabilidadService.obtenerLibroMayor(req.params.cuentaId);
  res.json({ exito: true, datos: libroMayor });
});

const obtenerBalanceSumasSaldos = asyncHandler(async (req, res) => {
  const balance = contabilidadService.obtenerBalanceSumasSaldos();
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
