const salesService = require('./sales.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

const listarSales = asyncHandler(async (req, res) => {
  const filtros = {
    estado: req.query.estado,
    clienteId: req.query.clienteId
  };
  const sales = await salesService.listarSales(filtros);
  res.json({ exito: true, datos: sales });
});

const obtenerSale = asyncHandler(async (req, res) => {
  const sale = await salesService.obtenerSale(req.params.id);
  res.json({ exito: true, datos: sale });
});

const crearSale = asyncHandler(async (req, res) => {
  const { clienteId, items } = req.body;

  // Validaciones básicas
  if (!clienteId) {
    return res.status(400).json({ exito: false, mensaje: 'clienteId es requerido' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ exito: false, mensaje: 'items debe ser un array con al menos un elemento' });
  }

  // Validar cada item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.codpro || typeof item.codpro !== 'string') {
      return res.status(400).json({ exito: false, mensaje: `Item ${i + 1}: codpro es requerido` });
    }
    if (!item.cantidad || item.cantidad <= 0) {
      return res.status(400).json({ exito: false, mensaje: `Item ${i + 1}: cantidad debe ser mayor a 0` });
    }
    if (item.precioUnitario === undefined || item.precioUnitario < 0) {
      return res.status(400).json({ exito: false, mensaje: `Item ${i + 1}: precioUnitario es requerido` });
    }
  }

  const sale = await salesService.crearSale({ clienteId, items });
  res.status(201).json({ exito: true, datos: sale, mensaje: 'Venta creada en estado DRAFT' });
});

const actualizarItems = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ exito: false, mensaje: 'items debe ser un array' });
  }

  const sale = await salesService.actualizarItems(req.params.id, items);
  res.json({ exito: true, datos: sale, mensaje: 'Items actualizados' });
});

const confirmarSale = asyncHandler(async (req, res) => {
  const result = await salesService.confirmarSale(req.params.id);
  res.json({
    exito: true,
    datos: result.sale,
    mensaje: 'Venta confirmada y stock descontado',
    movimientos: result.movimientos.length
  });
});

const eliminarSale = asyncHandler(async (req, res) => {
  const result = await salesService.eliminarSale(req.params.id);
  res.json({ exito: true, ...result });
});

module.exports = {
  listarSales,
  obtenerSale,
  crearSale,
  actualizarItems,
  confirmarSale,
  eliminarSale
};
