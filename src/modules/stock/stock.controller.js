const stockService = require('./stock.service');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');

// ============ ARTÍCULOS ============

const listarArticulos = asyncHandler(async (req, res) => {
  const filtros = {
    categoriaId: req.query.categoriaId,
    busqueda: req.query.busqueda
  };
  const articulos = stockService.listarArticulos(filtros);
  res.json({ exito: true, datos: articulos });
});

const obtenerArticulo = asyncHandler(async (req, res) => {
  const articulo = stockService.obtenerArticulo(req.params.id);
  res.json({ exito: true, datos: articulo });
});

const crearArticulo = asyncHandler(async (req, res) => {
  const articulo = stockService.crearNuevoArticulo(req.body);
  res.status(201).json({ exito: true, datos: articulo });
});

const actualizarArticulo = asyncHandler(async (req, res) => {
  const articulo = stockService.actualizarArticulo(req.params.id, req.body);
  res.json({ exito: true, datos: articulo });
});

const eliminarArticulo = asyncHandler(async (req, res) => {
  const resultado = stockService.eliminarArticulo(req.params.id);
  res.json({ exito: true, ...resultado });
});

const ajustarStock = asyncHandler(async (req, res) => {
  const { cantidad } = req.body;
  if (cantidad === undefined) {
    return res.status(400).json({ exito: false, mensaje: 'La cantidad es requerida' });
  }
  const articulo = stockService.ajustarStock(req.params.id, cantidad);
  res.json({ exito: true, datos: articulo });
});

// ============ CATEGORÍAS ============

const listarCategorias = asyncHandler(async (req, res) => {
  const categorias = stockService.listarCategorias();
  res.json({ exito: true, datos: categorias });
});

const crearCategoria = asyncHandler(async (req, res) => {
  const categoria = stockService.crearNuevaCategoria(req.body);
  res.status(201).json({ exito: true, datos: categoria });
});

const actualizarCategoria = asyncHandler(async (req, res) => {
  const categoria = stockService.actualizarCategoria(req.params.id, req.body);
  res.json({ exito: true, datos: categoria });
});

const eliminarCategoria = asyncHandler(async (req, res) => {
  const resultado = stockService.eliminarCategoria(req.params.id);
  res.json({ exito: true, ...resultado });
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
  eliminarCategoria
};
