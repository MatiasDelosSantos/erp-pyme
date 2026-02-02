const facturacionService = require('./facturacion.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ FACTURAS ============

const listarFacturas = asyncHandler(async (req, res) => {
  const filtros = {
    estado: req.query.estado,
    clienteId: req.query.clienteId
  };
  const facturas = facturacionService.listarFacturas(filtros);
  res.json({ exito: true, datos: facturas });
});

const obtenerFactura = asyncHandler(async (req, res) => {
  const factura = facturacionService.obtenerFactura(req.params.id);
  res.json({ exito: true, datos: factura });
});

const crearFactura = asyncHandler(async (req, res) => {
  const factura = facturacionService.crearNuevaFactura(req.body);
  res.status(201).json({ exito: true, datos: factura });
});

const anularFactura = asyncHandler(async (req, res) => {
  const factura = facturacionService.anularFactura(req.params.id);
  res.json({ exito: true, datos: factura });
});

// ============ NOTAS DE CRÉDITO ============

const listarNotasCredito = asyncHandler(async (req, res) => {
  const filtros = { clienteId: req.query.clienteId };
  const notasCredito = facturacionService.listarNotasCredito(filtros);
  res.json({ exito: true, datos: notasCredito });
});

const obtenerNotaCredito = asyncHandler(async (req, res) => {
  const notaCredito = facturacionService.obtenerNotaCredito(req.params.id);
  res.json({ exito: true, datos: notaCredito });
});

const crearNotaCredito = asyncHandler(async (req, res) => {
  const notaCredito = facturacionService.crearNuevaNotaCredito(req.body);
  res.status(201).json({ exito: true, datos: notaCredito });
});

const aplicarNotaCredito = asyncHandler(async (req, res) => {
  const notaCredito = facturacionService.aplicarNotaCredito(req.params.id);
  res.json({ exito: true, datos: notaCredito });
});

module.exports = {
  listarFacturas,
  obtenerFactura,
  crearFactura,
  anularFactura,
  listarNotasCredito,
  obtenerNotaCredito,
  crearNotaCredito,
  aplicarNotaCredito
};
