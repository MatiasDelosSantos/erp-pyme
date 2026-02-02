const { generarId } = require('../../shared/utils/generadorId');
const { obtenerSiguienteNumero } = require('../../shared/data/memoria');

const crearCuentaContable = (datos) => ({
  id: generarId(),
  codigo: datos.codigo,
  nombre: datos.nombre,
  tipo: datos.tipo, // 'activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'
  saldo: 0,
  activa: true
});

const crearAsiento = (datos) => ({
  id: generarId(),
  numero: obtenerSiguienteNumero('asiento'),
  fecha: datos.fecha || new Date(),
  descripcion: datos.descripcion,
  movimientos: [],
  creadoEn: new Date()
});

const crearMovimiento = (datos, asientoId) => ({
  id: generarId(),
  asientoId: asientoId,
  cuentaContableId: datos.cuentaContableId,
  debe: datos.debe || 0,
  haber: datos.haber || 0,
  descripcion: datos.descripcion || null
});

module.exports = {
  crearCuentaContable,
  crearAsiento,
  crearMovimiento
};
