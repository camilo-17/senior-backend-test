import express from 'express';
import dotenv from 'dotenv';
import { Database } from './database';
import customersRouter from './routes/customers';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';

dotenv.config();

const app = express();
const db = new Database();

app.use(express.json());

app.use('/customers', customersRouter);

const swaggerDocument = YAML.parse(fs.readFileSync('./openapi.yaml', 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  await db.connect();
  console.log(`Customers API listening on port ${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
