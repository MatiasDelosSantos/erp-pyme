const express = require('express');
const router = express.Router();
const ventasController = require('./ventas.controller');

// Rutas de clientes
router.get('/clientes', ventasController.listarClientes);
router.get('/clientes/:id', ventasController.obtenerCliente);
router.post('/clientes', ventasController.crearCliente);
router.put('/clientes/:id', ventasController.actualizarCliente);
router.delete('/clientes/:id', ventasController.eliminarCliente);

// Rutas de pedidos
router.get('/pedidos', ventasController.listarPedidos);
router.get('/pedidos/:id', ventasController.obtenerPedido);
router.post('/pedidos', ventasController.crearPedido);
router.put('/pedidos/:id', ventasController.actualizarPedido);
router.patch('/pedidos/:id/estado', ventasController.cambiarEstadoPedido);
router.delete('/pedidos/:id', ventasController.cancelarPedido);

// Rutas de albaranes
router.get('/albaranes', ventasController.listarAlbaranes);
router.get('/albaranes/:id', ventasController.obtenerAlbaran);
router.post('/albaranes', ventasController.crearAlbaran);

module.exports = router;
