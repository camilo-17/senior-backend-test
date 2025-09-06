import express from 'express';
import dotenv from 'dotenv';
import { Database } from './database';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';

dotenv.config();

const app = express();
const db = new Database();

app.use(express.json());

app.use('/products', productsRouter);
app.use('/orders', ordersRouter);

const swaggerDocument = YAML.parse(fs.readFileSync('./openapi.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, async () => {
  await db.connect();
  console.log(`Orders API listening on port ${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});

app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});
