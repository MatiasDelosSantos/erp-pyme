class ErrorApp extends Error {
  constructor(mensaje, codigoEstado = 500) {
    super(mensaje);
    this.codigoEstado = codigoEstado;
    this.nombre = 'ErrorApp';
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  if (err instanceof ErrorApp) {
    return res.status(err.codigoEstado).json({
      exito: false,
      mensaje: err.message
    });
  }

  res.status(500).json({
    exito: false,
    mensaje: 'Error interno del servidor'
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ErrorApp,
  errorHandler,
  asyncHandler
};
