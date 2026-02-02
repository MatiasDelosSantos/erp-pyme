const express = require('express');
const router = express.Router();

const stockRoutes = require('../modules/stock/stock.routes');
const ventasRoutes = require('../modules/ventas/ventas.routes');
const facturacionRoutes = require('../modules/facturacion/facturacion.routes');
const tesoreriaRoutes = require('../modules/tesoreria/tesoreria.routes');
const contabilidadRoutes = require('../modules/contabilidad/contabilidad.routes');

// Montar rutas de cada módulo
router.use('/stock', stockRoutes);
router.use('/ventas', ventasRoutes);
router.use('/facturacion', facturacionRoutes);
router.use('/tesoreria', tesoreriaRoutes);
router.use('/contabilidad', contabilidadRoutes);

// Ruta de información del API
router.get('/', (req, res) => {
  res.json({
    nombre: 'ERP PyME API',
    version: '1.0.0',
    modulos: [
      { nombre: 'Stock', ruta: '/api/stock' },
      { nombre: 'Ventas', ruta: '/api/ventas' },
      { nombre: 'Facturación', ruta: '/api/facturacion' },
      { nombre: 'Tesorería', ruta: '/api/tesoreria' },
      { nombre: 'Contabilidad', ruta: '/api/contabilidad' }
    ]
  });
});

module.exports = router;
