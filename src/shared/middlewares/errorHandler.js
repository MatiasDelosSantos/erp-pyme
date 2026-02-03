class ErrorApp extends Error {
  constructor(mensaje, codigoEstado = 500) {
    super(mensaje);
    this.codigoEstado = codigoEstado;
    this.nombre = 'ErrorApp';
  }
}

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.code || err.message}`);

  // Error con código (nuevo formato para API)
  if (err.code) {
    const statusCode = err.statusCode || 500;
    const response = {
      exito: false,
      error: {
        code: err.code
      }
    };
    if (err.details) {
      response.error.details = err.details;
    }
    return res.status(statusCode).json(response);
  }

  // Error de aplicación (formato antiguo)
  if (err instanceof ErrorApp) {
    return res.status(err.codigoEstado).json({
      exito: false,
      mensaje: err.message
    });
  }

  res.status(500).json({
    exito: false,
    error: { code: 'INTERNAL_ERROR' }
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
