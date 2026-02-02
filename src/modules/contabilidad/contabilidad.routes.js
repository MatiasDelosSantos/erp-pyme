const express = require('express');
const router = express.Router();
const contabilidadController = require('./contabilidad.controller');

// Rutas de cuentas contables
router.get('/cuentas', contabilidadController.listarCuentas);
router.post('/cuentas', contabilidadController.crearCuenta);
router.put('/cuentas/:id', contabilidadController.actualizarCuenta);

// Rutas de asientos
router.get('/asientos', contabilidadController.listarAsientos);
router.get('/asientos/:id', contabilidadController.obtenerAsiento);
router.post('/asientos', contabilidadController.crearAsiento);

// Reportes
router.get('/libro-diario', contabilidadController.obtenerLibroDiario);
router.get('/libro-mayor/:cuentaId', contabilidadController.obtenerLibroMayor);
router.get('/balance-sumas-saldos', contabilidadController.obtenerBalanceSumasSaldos);

module.exports = router;
