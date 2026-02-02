const stockService = require('./stock.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ ARTÍCULOS ============

const listarArticulos = asyncHandler(async (req, res) => {
  const filtros = {
    categoriaId: req.query.categoriaId,
    busqueda: req.query.busqueda
  };
  const articulos = await stockService.listarArticulos(filtros);
  res.json({ exito: true, datos: articulos });
});

const obtenerArticulo = asyncHandler(async (req, res) => {
  const articulo = await stockService.obtenerArticulo(req.params.id);
  res.json({ exito: true, datos: articulo });
});

const crearArticulo = asyncHandler(async (req, res) => {
  const articulo = await stockService.crearNuevoArticulo(req.body);
  res.status(201).json({ exito: true, datos: articulo });
});

const actualizarArticulo = asyncHandler(async (req, res) => {
  const articulo = await stockService.actualizarArticulo(req.params.id, req.body);
  res.json({ exito: true, datos: articulo });
});

const eliminarArticulo = asyncHandler(async (req, res) => {
  const resultado = await stockService.eliminarArticulo(req.params.id);
  res.json({ exito: true, ...resultado });
});

const ajustarStock = asyncHandler(async (req, res) => {
  const { cantidad } = req.body;
  if (cantidad === undefined) {
    return res.status(400).json({ exito: false, mensaje: 'La cantidad es requerida' });
  }
  const articulo = await stockService.ajustarStock(req.params.id, cantidad);
  res.json({ exito: true, datos: articulo });
});

// ============ CATEGORÍAS ============

const listarCategorias = asyncHandler(async (req, res) => {
  const categorias = await stockService.listarCategorias();
  res.json({ exito: true, datos: categorias });
});

const crearCategoria = asyncHandler(async (req, res) => {
  const categoria = await stockService.crearNuevaCategoria(req.body);
  res.status(201).json({ exito: true, datos: categoria });
});

const actualizarCategoria = asyncHandler(async (req, res) => {
  const categoria = await stockService.actualizarCategoria(req.params.id, req.body);
  res.json({ exito: true, datos: categoria });
});

const eliminarCategoria = asyncHandler(async (req, res) => {
  const resultado = await stockService.eliminarCategoria(req.params.id);
  res.json({ exito: true, ...resultado });
});

// ============ MOVIMIENTOS DE STOCK ============

const registrarMovimiento = asyncHandler(async (req, res) => {
  const { codpro, cantidad, tipo } = req.body;

  // Validaciones
  if (!codpro || typeof codpro !== 'string' || codpro.trim() === '') {
    return res.status(400).json({ exito: false, mensaje: 'codpro es requerido y debe ser un string no vacío' });
  }

  if (!cantidad || typeof cantidad !== 'number' || cantidad <= 0 || !Number.isInteger(cantidad)) {
    return res.status(400).json({ exito: false, mensaje: 'cantidad debe ser un entero mayor a 0' });
  }

  if (!tipo || !['INGRESO', 'EGRESO'].includes(tipo)) {
    return res.status(400).json({ exito: false, mensaje: 'tipo debe ser "INGRESO" o "EGRESO"' });
  }

  const resultado = await stockService.registrarMovimiento({ codpro: codpro.trim(), cantidad, tipo });

  res.status(201).json({
    exito: true,
    mensaje: `Movimiento de ${tipo.toLowerCase()} registrado correctamente`,
    datos: resultado
  });
});

const listarMovimientos = asyncHandler(async (req, res) => {
  const filtros = {
    codpro: req.query.codpro,
    limite: req.query.limite ? parseInt(req.query.limite) : 100
  };
  const movimientos = await stockService.listarMovimientos(filtros);
  res.json({ exito: true, datos: movimientos });
});

const obtenerStockProducto = asyncHandler(async (req, res) => {
  const stock = await stockService.obtenerStockProducto(req.params.codpro);
  res.json({ exito: true, datos: stock });
});

module.exports = {
  listarArticulos,
  obtenerArticulo,
  crearArticulo,
  actualizarArticulo,
  eliminarArticulo,
  ajustarStock,
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  registrarMovimiento,
  listarMovimientos,
  obtenerStockProducto
};
