const generarCodigo = (prefijo, numero) => {
  const anio = new Date().getFullYear();
  const numeroFormateado = String(numero).padStart(4, '0');
  return `${prefijo}-${anio}-${numeroFormateado}`;
};

// Genera código basado en el conteo actual de registros
const generarCodigoDesdeConteo = async (prisma, modelo, prefijo) => {
  const count = await prisma[modelo].count();
  return generarCodigo(prefijo, count + 1);
};

module.exports = {
  generarCodigo,
  generarCodigoDesdeConteo
};
