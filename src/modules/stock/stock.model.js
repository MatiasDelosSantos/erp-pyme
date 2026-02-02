const { generarId, generarCodigo } = require('../../shared/utils/generadorId');
const { obtenerSiguienteNumero } = require('../../shared/data/memoria');

const crearArticulo = (datos) => ({
  id: generarId(),
  codigo: generarCodigo('ART', obtenerSiguienteNumero('articulo')),
  nombre: datos.nombre,
  descripcion: datos.descripcion || '',
  precioCompra: datos.precioCompra || 0,
  precioVenta: datos.precioVenta || 0,
  stock: datos.stock || 0,
  categoriaId: datos.categoriaId || null,
  codigoBarras: datos.codigoBarras || null,
  activo: true,
  creadoEn: new Date(),
  actualizadoEn: new Date()
});

const crearCategoria = (datos) => ({
  id: generarId(),
  codigo: generarCodigo('CAT', obtenerSiguienteNumero('categoria')),
  nombre: datos.nombre,
  descripcion: datos.descripcion || null
});

module.exports = {
  crearArticulo,
  crearCategoria
};
