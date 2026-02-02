# ERP PyME

ERP mínimo viable para pequeñas y medianas empresas.

## Requisitos

- Node.js 18+

## Instalación

```bash
npm install
```

## Ejecución

```bash
# Producción
npm start

# Desarrollo (con auto-reload)
npm run dev
```

El servidor estará disponible en `http://localhost:3000/api`

## Módulos

| Módulo | Ruta base | Descripción |
|--------|-----------|-------------|
| Stock | `/api/stock` | Artículos y categorías |
| Ventas | `/api/ventas` | Clientes, pedidos, albaranes |
| Facturación | `/api/facturacion` | Facturas y notas de crédito |
| Tesorería | `/api/tesoreria` | Cobros, pagos, cuentas bancarias |
| Contabilidad | `/api/contabilidad` | Plan de cuentas, asientos, reportes |

## Endpoints principales

### Stock
```
GET    /api/stock/articulos          Listar artículos
POST   /api/stock/articulos          Crear artículo
GET    /api/stock/articulos/:id      Obtener artículo
PUT    /api/stock/articulos/:id      Actualizar artículo
DELETE /api/stock/articulos/:id      Eliminar artículo
PATCH  /api/stock/articulos/:id/stock  Ajustar stock
GET    /api/stock/categorias         Listar categorías
POST   /api/stock/categorias         Crear categoría
```

### Ventas
```
GET    /api/ventas/clientes          Listar clientes
POST   /api/ventas/clientes          Crear cliente
GET    /api/ventas/pedidos           Listar pedidos
POST   /api/ventas/pedidos           Crear pedido
PATCH  /api/ventas/pedidos/:id/estado  Cambiar estado
POST   /api/ventas/albaranes         Crear albarán (entrega)
```

### Facturación
```
GET    /api/facturacion/facturas     Listar facturas
POST   /api/facturacion/facturas     Crear factura
PATCH  /api/facturacion/facturas/:id/anular  Anular factura
POST   /api/facturacion/notas-credito  Crear nota de crédito
PATCH  /api/facturacion/notas-credito/:id/aplicar  Aplicar NC
```

### Tesorería
```
GET    /api/tesoreria/cobros         Listar cobros
POST   /api/tesoreria/cobros         Registrar cobro
GET    /api/tesoreria/pagos          Listar pagos
POST   /api/tesoreria/pagos          Registrar pago
GET    /api/tesoreria/saldos-pendientes  Deudas por cliente
```

### Contabilidad
```
GET    /api/contabilidad/cuentas     Plan de cuentas
POST   /api/contabilidad/cuentas     Crear cuenta
POST   /api/contabilidad/asientos    Crear asiento
GET    /api/contabilidad/libro-diario  Libro diario
GET    /api/contabilidad/libro-mayor/:cuentaId  Libro mayor
GET    /api/contabilidad/balance-sumas-saldos  Balance
```

## Ejemplos de uso

### Crear un artículo
```bash
curl -X POST http://localhost:3000/api/stock/articulos \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Producto A", "precioVenta": 100, "stock": 50}'
```

### Crear un cliente
```bash
curl -X POST http://localhost:3000/api/ventas/clientes \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Cliente Ejemplo", "tipoDocumento": "CUIT", "numeroDocumento": "20-12345678-9"}'
```

### Crear un pedido
```bash
curl -X POST http://localhost:3000/api/ventas/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "<id-cliente>",
    "lineas": [
      {"articuloId": "<id-articulo>", "cantidad": 5}
    ]
  }'
```

### Confirmar pedido
```bash
curl -X PATCH http://localhost:3000/api/ventas/pedidos/<id>/estado \
  -H "Content-Type: application/json" \
  -d '{"estado": "confirmado"}'
```

### Crear albarán (entrega)
```bash
curl -X POST http://localhost:3000/api/ventas/albaranes \
  -H "Content-Type: application/json" \
  -d '{"pedidoId": "<id-pedido>"}'
```

### Crear factura desde pedido
```bash
curl -X POST http://localhost:3000/api/facturacion/facturas \
  -H "Content-Type: application/json" \
  -d '{"clienteId": "<id-cliente>", "pedidoId": "<id-pedido>"}'
```

### Registrar cobro
```bash
curl -X POST http://localhost:3000/api/tesoreria/cobros \
  -H "Content-Type: application/json" \
  -d '{"facturaId": "<id-factura>", "monto": 100, "metodoPago": "transferencia"}'
```

## Estructura del proyecto

```
erp-pyme/
├── src/
│   ├── config/             # Configuración
│   ├── modules/
│   │   ├── stock/          # Módulo de inventario
│   │   ├── ventas/         # Módulo de ventas
│   │   ├── facturacion/    # Módulo de facturación
│   │   ├── tesoreria/      # Módulo de tesorería
│   │   └── contabilidad/   # Módulo de contabilidad
│   ├── shared/
│   │   ├── data/           # Almacén en memoria
│   │   ├── middlewares/    # Middlewares comunes
│   │   └── utils/          # Utilidades
│   ├── routes/             # Agregador de rutas
│   └── app.js              # Configuración Express
├── server.js               # Punto de entrada
└── package.json
```

## Notas

- Los datos se almacenan en memoria (se pierden al reiniciar)
- IVA por defecto: 21%
- Todos los endpoints devuelven `{ exito: true/false, datos: ... }`
