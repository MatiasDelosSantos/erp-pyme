const { generarId, generarCodigo } = require('../../shared/utils/generadorId');
const { obtenerSiguienteNumero } = require('../../shared/data/memoria');

const crearCliente = (datos) => ({
  id: generarId(),
  codigo: generarCodigo('CLI', obtenerSiguienteNumero('cliente')),
  nombre: datos.nombre,
  tipoDocumento: datos.tipoDocumento || 'DNI',
  numeroDocumento: datos.numeroDocumento || '',
  direccion: datos.direccion || '',
  telefono: datos.telefono || null,
  email: datos.email || null,
  activo: true,
  creadoEn: new Date()
});

const crearPedido = (datos, clienteId) => ({
  id: generarId(),
  numero: generarCodigo('PED', obtenerSiguienteNumero('pedido')),
  fecha: new Date(),
  clienteId: clienteId,
  estado: 'borrador',
  lineas: [],
  observaciones: datos.observaciones || null,
  total: 0,
  creadoEn: new Date()
});

const crearPedidoLinea = (datos, pedidoId) => ({
  id: generarId(),
  pedidoId: pedidoId,
  articuloId: datos.articuloId,
  cantidad: datos.cantidad,
  precioUnitario: datos.precioUnitario,
  subtotal: datos.cantidad * datos.precioUnitario
});

const crearAlbaran = (datos, pedido, cliente) => ({
  id: generarId(),
  numero: generarCodigo('ALB', obtenerSiguienteNumero('albaran')),
  fecha: new Date(),
  pedidoId: pedido.id,
  clienteId: cliente.id,
  lineas: [],
  observaciones: datos.observaciones || null,
  creadoEn: new Date()
});

const crearAlbaranLinea = (datos, albaranId) => ({
  id: generarId(),
  albaranId: albaranId,
  articuloId: datos.articuloId,
  cantidadEntregada: datos.cantidadEntregada
});

module.exports = {
  crearCliente,
  crearPedido,
  crearPedidoLinea,
  crearAlbaran,
  crearAlbaranLinea
};
