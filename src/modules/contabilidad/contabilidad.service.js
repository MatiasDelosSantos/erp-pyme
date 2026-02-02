const { db } = require('../../shared/data/memoria');
const { crearCuentaContable, crearAsiento, crearMovimiento } = require('./contabilidad.model');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ CUENTAS CONTABLES ============

const listarCuentas = () => {
  return db.cuentasContables.filter(c => c.activa).sort((a, b) => a.codigo.localeCompare(b.codigo));
};

const crearNuevaCuenta = (datos) => {
  if (!datos.codigo) {
    throw new ErrorApp('El código de la cuenta es requerido', 400);
  }
  if (!datos.nombre) {
    throw new ErrorApp('El nombre de la cuenta es requerido', 400);
  }
  if (!datos.tipo) {
    throw new ErrorApp('El tipo de cuenta es requerido', 400);
  }

  const tiposValidos = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso'];
  if (!tiposValidos.includes(datos.tipo)) {
    throw new ErrorApp('Tipo de cuenta no válido', 400);
  }

  // Verificar que no exista el código
  const existente = db.cuentasContables.find(c => c.codigo === datos.codigo);
  if (existente) {
    throw new ErrorApp('Ya existe una cuenta con ese código', 400);
  }

  const cuenta = crearCuentaContable(datos);
  db.cuentasContables.push(cuenta);
  return cuenta;
};

const actualizarCuenta = (id, datos) => {
  const indice = db.cuentasContables.findIndex(c => c.id === id && c.activa);
  if (indice === -1) {
    throw new ErrorApp('Cuenta contable no encontrada', 404);
  }

  // No permitir cambiar el código si tiene movimientos
  if (datos.codigo && datos.codigo !== db.cuentasContables[indice].codigo) {
    const tieneMovimientos = db.asientos.some(a =>
      a.movimientos.some(m => m.cuentaContableId === id)
    );
    if (tieneMovimientos) {
      throw new ErrorApp('No se puede cambiar el código de una cuenta con movimientos', 400);
    }
  }

  db.cuentasContables[indice] = {
    ...db.cuentasContables[indice],
    ...datos,
    id: db.cuentasContables[indice].id,
    saldo: db.cuentasContables[indice].saldo
  };

  return db.cuentasContables[indice];
};

// ============ ASIENTOS ============

const listarAsientos = (filtros = {}) => {
  let resultado = [...db.asientos];

  if (filtros.fechaDesde) {
    const fechaDesde = new Date(filtros.fechaDesde);
    resultado = resultado.filter(a => new Date(a.fecha) >= fechaDesde);
  }
  if (filtros.fechaHasta) {
    const fechaHasta = new Date(filtros.fechaHasta);
    resultado = resultado.filter(a => new Date(a.fecha) <= fechaHasta);
  }

  return resultado.sort((a, b) => a.numero - b.numero);
};

const obtenerAsiento = (id) => {
  const asiento = db.asientos.find(a => a.id === id);
  if (!asiento) {
    throw new ErrorApp('Asiento no encontrado', 404);
  }

  const movimientosConCuenta = asiento.movimientos.map(m => ({
    ...m,
    cuentaContable: db.cuentasContables.find(c => c.id === m.cuentaContableId)
  }));

  return {
    ...asiento,
    movimientos: movimientosConCuenta
  };
};

const crearNuevoAsiento = (datos) => {
  if (!datos.descripcion) {
    throw new ErrorApp('La descripción es requerida', 400);
  }
  if (!datos.movimientos || !Array.isArray(datos.movimientos) || datos.movimientos.length < 2) {
    throw new ErrorApp('El asiento debe tener al menos dos movimientos', 400);
  }

  const asiento = crearAsiento(datos);

  let totalDebe = 0;
  let totalHaber = 0;

  for (const movData of datos.movimientos) {
    const cuenta = db.cuentasContables.find(c => c.id === movData.cuentaContableId && c.activa);
    if (!cuenta) {
      throw new ErrorApp(`Cuenta contable no encontrada: ${movData.cuentaContableId}`, 404);
    }

    const movimiento = crearMovimiento(movData, asiento.id);
    asiento.movimientos.push(movimiento);

    totalDebe += movimiento.debe;
    totalHaber += movimiento.haber;
  }

  // Validar partida doble
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    throw new ErrorApp('El asiento no está balanceado (debe = haber)', 400);
  }

  // Actualizar saldos de las cuentas
  for (const mov of asiento.movimientos) {
    const indiceCuenta = db.cuentasContables.findIndex(c => c.id === mov.cuentaContableId);
    if (indiceCuenta !== -1) {
      const cuenta = db.cuentasContables[indiceCuenta];
      // Para activos y egresos: debe aumenta, haber disminuye
      // Para pasivos, patrimonio e ingresos: haber aumenta, debe disminuye
      if (['activo', 'egreso'].includes(cuenta.tipo)) {
        cuenta.saldo += mov.debe - mov.haber;
      } else {
        cuenta.saldo += mov.haber - mov.debe;
      }
    }
  }

  db.asientos.push(asiento);
  return asiento;
};

// ============ REPORTES ============

const obtenerLibroDiario = (filtros = {}) => {
  const asientos = listarAsientos(filtros);

  const lineas = [];
  for (const asiento of asientos) {
    for (const mov of asiento.movimientos) {
      const cuenta = db.cuentasContables.find(c => c.id === mov.cuentaContableId);
      lineas.push({
        fecha: asiento.fecha,
        numeroAsiento: asiento.numero,
        descripcion: asiento.descripcion,
        codigoCuenta: cuenta ? cuenta.codigo : '',
        nombreCuenta: cuenta ? cuenta.nombre : '',
        debe: mov.debe,
        haber: mov.haber
      });
    }
  }

  return lineas;
};

const obtenerLibroMayor = (cuentaId) => {
  const cuenta = db.cuentasContables.find(c => c.id === cuentaId);
  if (!cuenta) {
    throw new ErrorApp('Cuenta contable no encontrada', 404);
  }

  const movimientos = [];
  let saldoAcumulado = 0;

  for (const asiento of db.asientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))) {
    for (const mov of asiento.movimientos) {
      if (mov.cuentaContableId === cuentaId) {
        if (['activo', 'egreso'].includes(cuenta.tipo)) {
          saldoAcumulado += mov.debe - mov.haber;
        } else {
          saldoAcumulado += mov.haber - mov.debe;
        }

        movimientos.push({
          fecha: asiento.fecha,
          numeroAsiento: asiento.numero,
          descripcion: asiento.descripcion,
          debe: mov.debe,
          haber: mov.haber,
          saldo: saldoAcumulado
        });
      }
    }
  }

  return {
    cuenta: {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo
    },
    movimientos,
    saldoFinal: saldoAcumulado
  };
};

const obtenerBalanceSumasSaldos = () => {
  const cuentas = db.cuentasContables.filter(c => c.activa);

  let totalDebe = 0;
  let totalHaber = 0;
  let totalSaldoDeudor = 0;
  let totalSaldoAcreedor = 0;

  const lineas = cuentas.map(cuenta => {
    let sumaDebe = 0;
    let sumaHaber = 0;

    for (const asiento of db.asientos) {
      for (const mov of asiento.movimientos) {
        if (mov.cuentaContableId === cuenta.id) {
          sumaDebe += mov.debe;
          sumaHaber += mov.haber;
        }
      }
    }

    const saldoDeudor = sumaDebe > sumaHaber ? sumaDebe - sumaHaber : 0;
    const saldoAcreedor = sumaHaber > sumaDebe ? sumaHaber - sumaDebe : 0;

    totalDebe += sumaDebe;
    totalHaber += sumaHaber;
    totalSaldoDeudor += saldoDeudor;
    totalSaldoAcreedor += saldoAcreedor;

    return {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      sumaDebe,
      sumaHaber,
      saldoDeudor,
      saldoAcreedor
    };
  }).filter(l => l.sumaDebe > 0 || l.sumaHaber > 0);

  return {
    lineas: lineas.sort((a, b) => a.codigo.localeCompare(b.codigo)),
    totales: {
      debe: totalDebe,
      haber: totalHaber,
      saldoDeudor: totalSaldoDeudor,
      saldoAcreedor: totalSaldoAcreedor
    }
  };
};

module.exports = {
  listarCuentas,
  crearNuevaCuenta,
  actualizarCuenta,
  listarAsientos,
  obtenerAsiento,
  crearNuevoAsiento,
  obtenerLibroDiario,
  obtenerLibroMayor,
  obtenerBalanceSumasSaldos
};
