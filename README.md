# Backend Test - Senior Backend (Node.js + MySQL + Docker + Lambda)

Sistema mínimo compuesto por APIs de Customers y Orders, y un Lambda orquestador para crear y confirmar pedidos.

## Arquitectura

- **customers-api**: API para gestión de clientes (puerto 3001).
- **orders-api**: API para gestión de productos y órdenes (puerto 3002).
- **lambda-orchestrator**: Lambda para orquestar creación y confirmación de pedidos.
- **db**: MySQL con schema y seed.

## Levantamiento Local

1. Clona el repo.
2. Copia `.env.example` a `.env` en cada servicio.
3. `docker-compose build`
4. `docker-compose up -d`
5. Verifica: `http://localhost:3001/health`, `http://localhost:3002/health`
6. Para Lambda local: `cd lambda-orchestrator && npm run dev` (puerto 3000)

## Variables de Entorno

### customers-api
- `DB_HOST=localhost`
- `DB_USER=user`
- `DB_PASSWORD=password`
- `DB_NAME=backend_test`
- `DB_PORT=3306`
- `PORT=3001`
- `SERVICE_TOKEN=secret-service-token`

### orders-api
- `DB_HOST=localhost`
- `DB_USER=user`
- `DB_PASSWORD=password`
- `DB_NAME=backend_test`
- `DB_PORT=3306`
- `PORT=3002`
- `SERVICE_TOKEN=secret-service-token`
- `CUSTOMERS_API_BASE=http://localhost:3001`

### lambda-orchestrator
- `CUSTOMERS_API_BASE=http://localhost:3001`
- `ORDERS_API_BASE=http://localhost:3002`
- `SERVICE_TOKEN=secret-service-token`

## Endpoints

### Customers API (http://localhost:3001)
- `POST /customers` - Crear cliente
- `GET /customers/:id` - Detalle cliente
- `GET /customers?search=&cursor=&limit=` - Buscar clientes
- `PUT /customers/:id` - Actualizar cliente
- `DELETE /customers/:id` - Eliminar cliente
- `GET /customers/internal/:id` - Detalle interno (requiere Authorization)

### Orders API (http://localhost:3002)
- `POST /products` - Crear producto
- `PATCH /products/:id` - Actualizar producto
- `GET /products/:id` - Detalle producto
- `GET /products?search=&cursor=&limit=` - Buscar productos
- `POST /orders` - Crear orden
- `GET /orders/:id` - Detalle orden
- `GET /orders?status=&from=&to=&cursor=&limit=` - Buscar órdenes
- `POST /orders/:id/confirm` - Confirmar orden (requiere X-Idempotency-Key)
- `POST /orders/:id/cancel` - Cancelar orden

### Lambda Orchestrator
- `POST /orchestrator/create-and-confirm-order` - Crear y confirmar orden
         
## Probar con Postman

Importa `backend-test.postman_collection.json`. Ajusta variables:
- `customers_base`: http://localhost:3001
- `orders_base`: http://localhost:3002
- `lambda_base`: http://localhost:3000

## Lambda Local y AWS

### Local
- `cd lambda-orchestrator`
- `npm run dev` (serverless-offline en puerto 3000)

### AWS
- Configura AWS credentials.
- `npm run deploy`
- Endpoint: URL de API Gateway.

## Scripts NPM

- `npm run build` - Compilar TypeScript
- `npm run start` - Ejecutar producción
- `npm run dev` - Desarrollo con hot reload
- `npm run deploy` - Deploy Lambda (solo lambda-orchestrator)

## Base de Datos

- Schema: `db/schema.sql`
- Seed: `db/seed.sql`
- Conectar: `docker-compose exec db mysql -u user -p backend_test`

## Documentación OpenAPI

- customers-api: `customers-api/openapi.yaml` | UI: `http://localhost:3001/api-docs`
- orders-api: `orders-api/openapi.yaml` | UI: `http://localhost:3002/api-docs`
