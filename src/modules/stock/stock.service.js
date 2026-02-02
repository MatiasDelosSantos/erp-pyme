const prisma = require('../../shared/data/prisma');
const { generarCodigoDesdeConteo } = require('../../shared/utils/generadorCodigo');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ ARTÍCULOS ============

const listarArticulos = async (filtros = {}) => {
  const where = { activo: true };

  if (filtros.categoriaId) {
    where.categoriaId = filtros.categoriaId;
  }
  if (filtros.busqueda) {
    where.OR = [
      { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
      { codigo: { contains: filtros.busqueda, mode: 'insensitive' } }
    ];
  }

  return prisma.articulo.findMany({
    where,
    include: { categoria: true },
    orderBy: { creadoEn: 'desc' }
  });
};

const obtenerArticulo = async (id) => {
  const articulo = await prisma.articulo.findFirst({
    where: { id, activo: true },
    include: { categoria: true }
  });

  if (!articulo) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }
  return articulo;
};

const crearNuevoArticulo = async (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre del artículo es requerido', 400);
  }

  const codigo = await generarCodigoDesdeConteo(prisma, 'articulo', 'ART');

  return prisma.articulo.create({
    data: {
      codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion || '',
      precioCompra: datos.precioCompra || 0,
      precioVenta: datos.precioVenta || 0,
      stock: datos.stock || 0,
      categoriaId: datos.categoriaId || null,
      codigoBarras: datos.codigoBarras || null
    },
    include: { categoria: true }
  });
};

const actualizarArticulo = async (id, datos) => {
  const articulo = await prisma.articulo.findFirst({
    where: { id, activo: true }
  });

  if (!articulo) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }

  return prisma.articulo.update({
    where: { id },
    data: {
      nombre: datos.nombre !== undefined ? datos.nombre : articulo.nombre,
      descripcion: datos.descripcion !== undefined ? datos.descripcion : articulo.descripcion,
      precioCompra: datos.precioCompra !== undefined ? datos.precioCompra : articulo.precioCompra,
      precioVenta: datos.precioVenta !== undefined ? datos.precioVenta : articulo.precioVenta,
      stock: datos.stock !== undefined ? datos.stock : articulo.stock,
      categoriaId: datos.categoriaId !== undefined ? datos.categoriaId : articulo.categoriaId,
      codigoBarras: datos.codigoBarras !== undefined ? datos.codigoBarras : articulo.codigoBarras
    },
    include: { categoria: true }
  });
};

const eliminarArticulo = async (id) => {
  const articulo = await prisma.articulo.findFirst({
    where: { id, activo: true }
  });

  if (!articulo) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }

  await prisma.articulo.update({
    where: { id },
    data: { activo: false }
  });

  return { mensaje: 'Artículo eliminado correctamente' };
};

const ajustarStock = async (id, cantidad) => {
  const articulo = await prisma.articulo.findFirst({
    where: { id, activo: true }
  });

  if (!articulo) {
    throw new ErrorApp('Artículo no encontrado', 404);
  }

  const nuevoStock = articulo.stock + cantidad;
  if (nuevoStock < 0) {
    throw new ErrorApp('Stock insuficiente', 400);
  }

  return prisma.articulo.update({
    where: { id },
    data: { stock: nuevoStock },
    include: { categoria: true }
  });
};

// ============ CATEGORÍAS ============

const listarCategorias = async () => {
  return prisma.categoria.findMany({
    orderBy: { nombre: 'asc' }
  });
};

const crearNuevaCategoria = async (datos) => {
  if (!datos.nombre) {
    throw new ErrorApp('El nombre de la categoría es requerido', 400);
  }

  const codigo = await generarCodigoDesdeConteo(prisma, 'categoria', 'CAT');

  return prisma.categoria.create({
    data: {
      codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion || null
    }
  });
};

const actualizarCategoria = async (id, datos) => {
  const categoria = await prisma.categoria.findUnique({ where: { id } });

  if (!categoria) {
    throw new ErrorApp('Categoría no encontrada', 404);
  }

  return prisma.categoria.update({
    where: { id },
    data: {
      nombre: datos.nombre !== undefined ? datos.nombre : categoria.nombre,
      descripcion: datos.descripcion !== undefined ? datos.descripcion : categoria.descripcion
    }
  });
};

const eliminarCategoria = async (id) => {
  const categoria = await prisma.categoria.findUnique({ where: { id } });

  if (!categoria) {
    throw new ErrorApp('Categoría no encontrada', 404);
  }

  // Verificar que no haya artículos usando esta categoría
  const articulosConCategoria = await prisma.articulo.count({
    where: { categoriaId: id, activo: true }
  });

  if (articulosConCategoria > 0) {
    throw new ErrorApp('No se puede eliminar: hay artículos usando esta categoría', 400);
  }

  await prisma.categoria.delete({ where: { id } });
  return { mensaje: 'Categoría eliminada correctamente' };
};

// ============ MOVIMIENTOS DE STOCK ============

const registrarMovimiento = async ({ codpro, cantidad, tipo }) => {
  // Validar que el producto exista
  const articulo = await prisma.articulo.findUnique({
    where: { codigo: codpro }
  });

  if (!articulo) {
    throw new ErrorApp('Producto no encontrado', 404);
  }

  // Normalizar cantidad según tipo
  const cantid = tipo === 'INGRESO' ? Math.abs(cantidad) : -Math.abs(cantidad);

  // Usar transacción para garantizar consistencia
  const resultado = await prisma.$transaction(async (tx) => {
    // Buscar o crear registro de Stock
    let stockRecord = await tx.stock.findUnique({
      where: { codpro }
    });

    if (!stockRecord) {
      stockRecord = await tx.stock.create({
        data: { codpro, stocks: 0 }
      });
    }

    const stockAnterior = stockRecord.stocks;
    const stockNuevo = stockAnterior + cantid;

    // Validar que no quede negativo
    if (stockNuevo < 0) {
      throw new ErrorApp(`Stock insuficiente. Stock actual: ${stockAnterior}, intenta egresar: ${Math.abs(cantid)}`, 400);
    }

    // Crear movimiento
    const movimiento = await tx.movimientoStock.create({
      data: {
        codpro,
        cantid,
        stocks: stockAnterior, // stock ANTES del movimiento
        fchreg: new Date()
      }
    });

    // Actualizar stock
    await tx.stock.update({
      where: { codpro },
      data: { stocks: stockNuevo }
    });

    // También actualizar el campo stock en Articulo para mantener sincronizado
    await tx.articulo.update({
      where: { codigo: codpro },
      data: { stock: stockNuevo }
    });

    return {
      movimiento,
      stockAnterior,
      stockNuevo
    };
  });

  return resultado;
};

const listarMovimientos = async (filtros = {}) => {
  const where = {};

  if (filtros.codpro) {
    where.codpro = filtros.codpro;
  }

  return prisma.movimientoStock.findMany({
    where,
    include: {
      articulo: {
        select: { codigo: true, nombre: true }
      }
    },
    orderBy: { fchreg: 'desc' },
    take: filtros.limite || 100
  });
};

const obtenerStockProducto = async (codpro) => {
  const stock = await prisma.stock.findUnique({
    where: { codpro },
    include: {
      articulo: {
        select: { codigo: true, nombre: true }
      }
    }
  });

  if (!stock) {
    // Si no existe registro, devolver 0
    const articulo = await prisma.articulo.findUnique({
      where: { codigo: codpro }
    });
    if (!articulo) {
      throw new ErrorApp('Producto no encontrado', 404);
    }
    return { codpro, stocks: 0, articulo: { codigo: articulo.codigo, nombre: articulo.nombre } };
  }

  return stock;
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
  eliminarCategoria,
  registrarMovimiento,
  listarMovimientos,
  obtenerStockProducto
};
