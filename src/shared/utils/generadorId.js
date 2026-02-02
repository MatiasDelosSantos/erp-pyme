const { v4: uuidv4 } = require('uuid');

const generarId = () => uuidv4();

const generarCodigo = (prefijo, numero) => {
  const anio = new Date().getFullYear();
  const numeroFormateado = String(numero).padStart(4, '0');
  return `${prefijo}-${anio}-${numeroFormateado}`;
};

module.exports = {
  generarId,
  generarCodigo
};
