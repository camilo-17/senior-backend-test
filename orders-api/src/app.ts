import express from 'express';
import dotenv from 'dotenv';
import { Database } from './database';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';

dotenv.config();

const app = express();
const db = new Database();

app.use(express.json());

app.use('/products', productsRouter);
app.use('/orders', ordersRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, async () => {
  await db.connect();
  console.log(`Orders API listening on port ${PORT}`);
});
