const { db } = require('../../shared/data/memoria');
const { crearArticulo, crearCategoria } = require('./stock.model');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ ARTÍCULOS ============

const listarArticulos = (filtros = {}) => {
  let resultado = db.articulos.filter(a => a.activo);

  if (filtros.categoriaId) {
    resultado = resultado.filter(a => a.categoriaId === filtros.categoriaId);
  }
  if (filtros.busqueda) {
    const busqueda = filtros.busqueda.toLowerCase();
    resultado = resultado.filter(a =>
      a.nombre.toLowerCase().includes(busqueda) ||
      a.codigo.toLowerCase().includes(busqueda)
    );
  }

  return resultado;
};

const obtenerArticulo = (id) => {
  const articulo = db.articulos.find(a => a.id === id && a.activo);
  if (!articulo) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }
  return articulo;
};

const crearNuevoArticulo = (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre del artículo es requerido', 400);
  }

  const articulo = crearArticulo(datos);
  db.articulos.push(articulo);
  return articulo;
};

const actualizarArticulo = (id, datos) => {
  const indice = db.articulos.findIndex(a => a.id === id && a.activo);
  if (indice === -1) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }

  db.articulos[indice] = {
    ...db.articulos[indice],
    ...datos,
    id: db.articulos[indice].id,
    codigo: db.articulos[indice].codigo,
    creadoEn: db.articulos[indice].creadoEn,
    actualizadoEn: new Date()
  };

  return db.articulos[indice];
};

const eliminarArticulo = (id) => {
  const indice = db.articulos.findIndex(a => a.id === id && a.activo);
  if (indice === -1) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }

  db.articulos[indice].activo = false;
  db.articulos[indice].actualizadoEn = new Date();

  return { mensaje: 'Artículo eliminado correctamente' };
};

const ajustarStock = (id, cantidad) => {
  const indice = db.articulos.findIndex(a => a.id === id && a.activo);
  if (indice === -1) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }

  const nuevoStock = db.articulos[indice].stock + cantidad;
  if (nuevoStock < 0) {
    throw new ErrorApp('Stock insuficiente', 400);
  }

  db.articulos[indice].stock = nuevoStock;
  db.articulos[indice].actualizadoEn = new Date();

  return db.articulos[indice];
};

// ============ CATEGORÍAS ============

const listarCategorias = () => {
  return db.categorias;
};

const crearNuevaCategoria = (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre de la categoría es requerido', 400);
  }

  const categoria = crearCategoria(datos);
  db.categorias.push(categoria);
  return categoria;
};

const actualizarCategoria = (id, datos) => {
  const indice = db.categorias.findIndex(c => c.id === id);
  if (indice === -1) {
    throw new ErrorApp('Categoría no encontrada', 404);
  }

  db.categorias[indice] = {
    ...db.categorias[indice],
    ...datos,
    id: db.categorias[indice].id,
    codigo: db.categorias[indice].codigo
  };

  return db.categorias[indice];
};

const eliminarCategoria = (id) => {
  const indice = db.categorias.findIndex(c => c.id === id);
  if (indice === -1) {
    throw new ErrorApp('Categoría no encontrada', 404);
  }

  // Verificar que no haya artículos usando esta categoría
  const articulosConCategoria = db.articulos.filter(a => a.categoriaId === id && a.activo);
  if (articulosConCategoria.length > 0) {
    throw new ErrorApp('No se puede eliminar: hay artículos usando esta categoría', 400);
  }

  db.categorias.splice(indice, 1);
  return { mensaje: 'Categoría eliminada correctamente' };
};

module.exports = {
  listarArticulos,
  obtenerArticulo,
  crearNuevoArticulo,
  actualizarArticulo,
  eliminarArticulo,
  ajustarStock,
  listarCategorias,
  crearNuevaCategoria,
  actualizarCategoria,
  eliminarCategoria
};
