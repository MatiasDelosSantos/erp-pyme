const { generarId, generarCodigo } = require('../../shared/utils/generadorId');
const { obtenerSiguienteNumero } = require('../../shared/data/memoria');

const crearCuentaBancaria = (datos) => ({
  id: generarId(),
  nombre: datos.nombre,
  numeroCuenta: datos.numeroCuenta || '',
  banco: datos.banco || '',
  saldo: datos.saldoInicial || 0,
  activa: true,
  creadoEn: new Date()
});

const crearCobro = (datos) => ({
  id: generarId(),
  numero: generarCodigo('COB', obtenerSiguienteNumero('cobro')),
  fecha: datos.fecha || new Date(),
  clienteId: datos.clienteId,
  facturaId: datos.facturaId,
  monto: datos.monto,
  metodoPago: datos.metodoPago || 'efectivo',
  cuentaBancariaId: datos.cuentaBancariaId || null,
  referencia: datos.referencia || null,
  observaciones: datos.observaciones || null,
  anulado: false,
  creadoEn: new Date()
});

const crearPago = (datos) => ({
  id: generarId(),
  numero: generarCodigo('PAG', obtenerSiguienteNumero('pago')),
  fecha: datos.fecha || new Date(),
  proveedorId: datos.proveedorId,
  monto: datos.monto,
  metodoPago: datos.metodoPago || 'transferencia',
  cuentaBancariaId: datos.cuentaBancariaId || null,
  concepto: datos.concepto,
  referencia: datos.referencia || null,
  anulado: false,
  creadoEn: new Date()
});

const crearProveedor = (datos) => ({
  id: generarId(),
  codigo: generarCodigo('PROV', obtenerSiguienteNumero('proveedor')),
  nombre: datos.nombre,
  tipoDocumento: datos.tipoDocumento || 'CUIT',
  numeroDocumento: datos.numeroDocumento || '',
  direccion: datos.direccion || '',
  telefono: datos.telefono || null,
  email: datos.email || null,
  activo: true,
  creadoEn: new Date()
});

module.exports = {
  crearCuentaBancaria,
  crearCobro,
  crearPago,
  crearProveedor
};
