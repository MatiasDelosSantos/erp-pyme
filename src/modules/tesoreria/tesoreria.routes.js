const express = require('express');
const router = express.Router();
const tesoreriaController = require('./tesoreria.controller');

// Rutas de cuentas bancarias
router.get('/cuentas-bancarias', tesoreriaController.listarCuentasBancarias);
router.post('/cuentas-bancarias', tesoreriaController.crearCuentaBancaria);
router.put('/cuentas-bancarias/:id', tesoreriaController.actualizarCuentaBancaria);

// Rutas de cobros
router.get('/cobros', tesoreriaController.listarCobros);
router.get('/cobros/:id', tesoreriaController.obtenerCobro);
router.post('/cobros', tesoreriaController.registrarCobro);
router.delete('/cobros/:id', tesoreriaController.anularCobro);

// Rutas de pagos
router.get('/pagos', tesoreriaController.listarPagos);
router.post('/pagos', tesoreriaController.registrarPago);
router.delete('/pagos/:id', tesoreriaController.anularPago);

// Rutas de proveedores
router.get('/proveedores', tesoreriaController.listarProveedores);
router.post('/proveedores', tesoreriaController.crearProveedor);
router.put('/proveedores/:id', tesoreriaController.actualizarProveedor);

// Reportes
router.get('/saldos-pendientes', tesoreriaController.obtenerSaldosPendientes);

module.exports = router;
