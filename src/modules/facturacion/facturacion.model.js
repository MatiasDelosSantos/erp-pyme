const { generarId, generarCodigo } = require('../../shared/utils/generadorId');
const { obtenerSiguienteNumero } = require('../../shared/data/memoria');
const config = require('../../config');

const crearFactura = (datos, cliente) => {
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // 30 días por defecto

  return {
    id: generarId(),
    numero: generarCodigo('FAC', obtenerSiguienteNumero('factura')),
    fecha: new Date(),
    fechaVencimiento: datos.fechaVencimiento || fechaVencimiento,
    clienteId: cliente.id,
    pedidoId: datos.pedidoId || null,
    lineas: [],
    subtotal: 0,
    porcentajeIva: datos.porcentajeIva || config.ivaDefecto,
    montoIva: 0,
    total: 0,
    estado: 'pendiente',
    saldoPendiente: 0,
    observaciones: datos.observaciones || null,
    creadoEn: new Date()
  };
};

const crearFacturaLinea = (datos, facturaId) => ({
  id: generarId(),
  facturaId: facturaId,
  articuloId: datos.articuloId,
  descripcion: datos.descripcion,
  cantidad: datos.cantidad,
  precioUnitario: datos.precioUnitario,
  subtotal: datos.cantidad * datos.precioUnitario
});

const crearNotaCredito = (datos, factura, cliente) => ({
  id: generarId(),
  numero: generarCodigo('NC', obtenerSiguienteNumero('notaCredito')),
  fecha: new Date(),
  facturaId: factura.id,
  clienteId: cliente.id,
  motivo: datos.motivo,
  lineas: [],
  subtotal: 0,
  montoIva: 0,
  total: 0,
  aplicada: false,
  creadoEn: new Date()
});

const crearNotaCreditoLinea = (datos, notaCreditoId) => ({
  id: generarId(),
  notaCreditoId: notaCreditoId,
  articuloId: datos.articuloId,
  descripcion: datos.descripcion,
  cantidad: datos.cantidad,
  precioUnitario: datos.precioUnitario,
  subtotal: datos.cantidad * datos.precioUnitario
});

module.exports = {
  crearFactura,
  crearFacturaLinea,
  crearNotaCredito,
  crearNotaCreditoLinea
};
