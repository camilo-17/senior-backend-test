-- Seed data for backend test database

INSERT INTO customers (id, name, email, phone) VALUES
(1, 'ACME Corp', 'ops@acme.com', '123-456-7890'),
(2, 'Tech Solutions', 'contact@techsol.com', '987-654-3210');

INSERT INTO products (id, sku, name, price_cents, stock) VALUES
(1, 'PROD001', 'Widget A', 129900, 100),
(2, 'PROD002', 'Widget B', 89900, 50);

INSERT INTO orders (id, customer_id, status, total_cents) VALUES
(1, 1, 'CREATED', 0);

INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES
(1, 1, 2, 129900, 259800),
(1, 2, 1, 89900, 89900);

UPDATE orders SET total_cents = 349700 WHERE id = 1;
