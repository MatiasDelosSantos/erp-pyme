const express = require('express');
const router = express.Router();
const facturacionController = require('./facturacion.controller');
const tesoreriaController = require('../tesoreria/tesoreria.controller');

// Rutas de facturas
router.get('/facturas', facturacionController.listarFacturas);
router.get('/facturas/:id', facturacionController.obtenerFactura);
router.post('/facturas', facturacionController.crearFactura);
router.patch('/facturas/:id/anular', facturacionController.anularFactura);

// Cobros de una factura (desde tesorería)
router.get('/facturas/:facturaId/cobros', tesoreriaController.listarCobrosPorFactura);

// Rutas de notas de crédito
router.get('/notas-credito', facturacionController.listarNotasCredito);
router.get('/notas-credito/:id', facturacionController.obtenerNotaCredito);
router.post('/notas-credito', facturacionController.crearNotaCredito);
router.patch('/notas-credito/:id/aplicar', facturacionController.aplicarNotaCredito);

module.exports = router;
