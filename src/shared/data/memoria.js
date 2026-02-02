// Almacén de datos en memoria (simula base de datos)
const db = {
  // Stock
  articulos: [],
  categorias: [],

  // Ventas
  clientes: [],
  pedidos: [],
  albaranes: [],

  // Facturación
  facturas: [],
  notasCredito: [],

  // Tesorería
  cuentasBancarias: [],
  cobros: [],
  pagos: [],
  proveedores: [],

  // Contabilidad
  cuentasContables: [],
  asientos: [],

  // Contadores para códigos
  contadores: {
    articulo: 0,
    categoria: 0,
    cliente: 0,
    pedido: 0,
    albaran: 0,
    factura: 0,
    notaCredito: 0,
    cobro: 0,
    pago: 0,
    proveedor: 0,
    asiento: 0
  }
};

const obtenerSiguienteNumero = (entidad) => {
  db.contadores[entidad]++;
  return db.contadores[entidad];
};

module.exports = {
  db,
  obtenerSiguienteNumero
};
