const prisma = require('../../shared/data/prisma');
const { ErrorApp } = require('../../shared/middlewares/errorHandler');

// ============ CUENTAS CONTABLES ============

const listarCuentas = async () => {
  return prisma.cuentaContable.findMany({
    where: { activa: true },
    orderBy: { codigo: 'asc' }
  });
};

const crearNuevaCuenta = async (datos) => {
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
  const existente = await prisma.cuentaContable.findUnique({
    where: { codigo: datos.codigo }
  });

  if (existente) {
    throw new ErrorApp('Ya existe una cuenta con ese código', 400);
  }

  return prisma.cuentaContable.create({
    data: {
      codigo: datos.codigo,
      nombre: datos.nombre,
      tipo: datos.tipo
    }
  });
};

const actualizarCuenta = async (id, datos) => {
  const cuenta = await prisma.cuentaContable.findFirst({
    where: { id, activa: true }
  });

  if (!cuenta) {
    throw new ErrorApp('Cuenta contable no encontrada', 404);
  }

  // No permitir cambiar el código si tiene movimientos
  if (datos.codigo && datos.codigo !== cuenta.codigo) {
    const tieneMovimientos = await prisma.asientoMovimiento.count({
      where: { cuentaContableId: id }
    });

    if (tieneMovimientos > 0) {
      throw new ErrorApp('No se puede cambiar el código de una cuenta con movimientos', 400);
    }
  }

  return prisma.cuentaContable.update({
    where: { id },
    data: {
      codigo: datos.codigo !== undefined ? datos.codigo : cuenta.codigo,
      nombre: datos.nombre !== undefined ? datos.nombre : cuenta.nombre,
      tipo: datos.tipo !== undefined ? datos.tipo : cuenta.tipo
    }
  });
};

// ============ ASIENTOS ============

const listarAsientos = async (filtros = {}) => {
  const where = {};

  if (filtros.fechaDesde) {
    where.fecha = { ...where.fecha, gte: new Date(filtros.fechaDesde) };
  }
  if (filtros.fechaHasta) {
    where.fecha = { ...where.fecha, lte: new Date(filtros.fechaHasta) };
  }

  return prisma.asiento.findMany({
    where,
    include: {
      movimientos: {
        include: { cuentaContable: true }
      }
    },
    orderBy: { numero: 'asc' }
  });
};

const obtenerAsiento = async (id) => {
  const asiento = await prisma.asiento.findUnique({
    where: { id },
    include: {
      movimientos: {
        include: { cuentaContable: true }
      }
    }
  });

  if (!asiento) {
    throw new ErrorApp('Asiento no encontrado', 404);
  }
  return asiento;
};

const crearNuevoAsiento = async (datos) => {
  if (!datos.descripcion) {
    throw new ErrorApp('La descripción es requerida', 400);
  }
  if (!datos.movimientos || !Array.isArray(datos.movimientos) || datos.movimientos.length < 2) {
    throw new ErrorApp('El asiento debe tener al menos dos movimientos', 400);
  }

  let totalDebe = 0;
  let totalHaber = 0;
  const movimientosData = [];

  for (const movData of datos.movimientos) {
    const cuenta = await prisma.cuentaContable.findFirst({
      where: { id: movData.cuentaContableId, activa: true }
    });

    if (!cuenta) {
      throw new ErrorApp(`Cuenta contable no encontrada: ${movData.cuentaContableId}`, 404);
    }

    const debe = movData.debe || 0;
    const haber = movData.haber || 0;

    movimientosData.push({
      cuentaContableId: movData.cuentaContableId,
      debe,
      haber,
      descripcion: movData.descripcion || null
    });

    totalDebe += debe;
    totalHaber += haber;
  }

  // Validar partida doble
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    throw new ErrorApp('El asiento no está balanceado (debe = haber)', 400);
  }

  // Crear asiento con movimientos
  const asiento = await prisma.asiento.create({
    data: {
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
      descripcion: datos.descripcion,
      movimientos: { create: movimientosData }
    },
    include: {
      movimientos: {
        include: { cuentaContable: true }
      }
    }
  });

  // Actualizar saldos de las cuentas
  for (const mov of asiento.movimientos) {
    const cuenta = await prisma.cuentaContable.findUnique({
      where: { id: mov.cuentaContableId }
    });

    if (cuenta) {
      let ajuste = 0;
      // Para activos y egresos: debe aumenta, haber disminuye
      // Para pasivos, patrimonio e ingresos: haber aumenta, debe disminuye
      if (['activo', 'egreso'].includes(cuenta.tipo)) {
        ajuste = Number(mov.debe) - Number(mov.haber);
      } else {
        ajuste = Number(mov.haber) - Number(mov.debe);
      }

      await prisma.cuentaContable.update({
        where: { id: cuenta.id },
        data: { saldo: { increment: ajuste } }
      });
    }
  }

  return asiento;
};

// ============ REPORTES ============

const obtenerLibroDiario = async (filtros = {}) => {
  const asientos = await listarAsientos(filtros);

  const lineas = [];
  for (const asiento of asientos) {
    for (const mov of asiento.movimientos) {
      lineas.push({
        fecha: asiento.fecha,
        numeroAsiento: asiento.numero,
        descripcion: asiento.descripcion,
        codigoCuenta: mov.cuentaContable?.codigo || '',
        nombreCuenta: mov.cuentaContable?.nombre || '',
        debe: Number(mov.debe),
        haber: Number(mov.haber)
      });
    }
  }

  return lineas;
};

const obtenerLibroMayor = async (cuentaId) => {
  const cuenta = await prisma.cuentaContable.findUnique({
    where: { id: cuentaId }
  });

  if (!cuenta) {
    throw new ErrorApp('Cuenta contable no encontrada', 404);
  }

  const movimientos = await prisma.asientoMovimiento.findMany({
    where: { cuentaContableId: cuentaId },
    include: {
      asiento: true
    },
    orderBy: {
      asiento: { fecha: 'asc' }
    }
  });

  let saldoAcumulado = 0;
  const lineas = movimientos.map(mov => {
    if (['activo', 'egreso'].includes(cuenta.tipo)) {
      saldoAcumulado += Number(mov.debe) - Number(mov.haber);
    } else {
      saldoAcumulado += Number(mov.haber) - Number(mov.debe);
    }

    return {
      fecha: mov.asiento.fecha,
      numeroAsiento: mov.asiento.numero,
      descripcion: mov.asiento.descripcion,
      debe: Number(mov.debe),
      haber: Number(mov.haber),
      saldo: saldoAcumulado
    };
  });

  return {
    cuenta: {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo
    },
    movimientos: lineas,
    saldoFinal: saldoAcumulado
  };
};

const obtenerBalanceSumasSaldos = async () => {
  const cuentas = await prisma.cuentaContable.findMany({
    where: { activa: true },
    orderBy: { codigo: 'asc' }
  });

  let totalDebe = 0;
  let totalHaber = 0;
  let totalSaldoDeudor = 0;
  let totalSaldoAcreedor = 0;

  const lineas = [];

  for (const cuenta of cuentas) {
    const movimientos = await prisma.asientoMovimiento.findMany({
      where: { cuentaContableId: cuenta.id }
    });

    let sumaDebe = 0;
    let sumaHaber = 0;

    for (const mov of movimientos) {
      sumaDebe += Number(mov.debe);
      sumaHaber += Number(mov.haber);
    }

    if (sumaDebe === 0 && sumaHaber === 0) continue;

    const saldoDeudor = sumaDebe > sumaHaber ? sumaDebe - sumaHaber : 0;
    const saldoAcreedor = sumaHaber > sumaDebe ? sumaHaber - sumaDebe : 0;

    totalDebe += sumaDebe;
    totalHaber += sumaHaber;
    totalSaldoDeudor += saldoDeudor;
    totalSaldoAcreedor += saldoAcreedor;

    lineas.push({
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      sumaDebe,
      sumaHaber,
      saldoDeudor,
      saldoAcreedor
    });
  }

  return {
    lineas,
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
