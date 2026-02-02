const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');

// Rutas de artículos
router.get('/articulos', stockController.listarArticulos);
router.get('/articulos/:id', stockController.obtenerArticulo);
router.post('/articulos', stockController.crearArticulo);
router.put('/articulos/:id', stockController.actualizarArticulo);
router.delete('/articulos/:id', stockController.eliminarArticulo);
router.patch('/articulos/:id/stock', stockController.ajustarStock);

// Rutas de categorías
router.get('/categorias', stockController.listarCategorias);
router.post('/categorias', stockController.crearCategoria);
router.put('/categorias/:id', stockController.actualizarCategoria);
router.delete('/categorias/:id', stockController.eliminarCategoria);

module.exports = router;
