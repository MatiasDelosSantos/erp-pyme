const app = require('./src/app');
const config = require('./src/config');

const iniciarServidor = () => {
  app.listen(config.puerto, () => {
    console.log('=========================================');
    console.log('         ERP PyME - Servidor API         ');
    console.log('=========================================');
    console.log(`Entorno: ${config.entorno}`);
    console.log(`Puerto: ${config.puerto}`);
    console.log(`URL: http://localhost:${config.puerto}/api`);
    console.log('=========================================');
    console.log('Módulos disponibles:');
    console.log('  - Stock:        /api/stock');
    console.log('  - Ventas:       /api/ventas');
    console.log('  - Facturación:  /api/facturacion');
    console.log('  - Tesorería:    /api/tesoreria');
    console.log('  - Contabilidad: /api/contabilidad');
    console.log('=========================================');
  });
};

iniciarServidor();
