-- ============================================
-- E-commerce Database Schema (MySQL)
-- Run this file to create the database and tables:
--   mysql -u root -p < schema.sql
-- ============================================

CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,   -- bcrypt hash
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- PRODUCTS ----------
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(100),
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- ORDERS ----------
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, shipped, cancelled
  shipping_address VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- ORDER ITEMS ----------
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL, -- snapshot in case product changes later
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,       -- price at time of order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------- SAMPLE PRODUCTS ----------
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Wireless Headphones', 'Over-ear Bluetooth headphones with noise cancellation and 30-hour battery life.', 59.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 'Electronics', 45),
('Smart Watch', 'Fitness tracker with heart-rate monitor, GPS, and 7-day battery.', 89.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', 'Electronics', 30),
('Running Shoes', 'Lightweight breathable running shoes with cushioned sole.', 74.50, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 'Footwear', 60),
('Backpack', 'Water-resistant 25L backpack with laptop compartment.', 42.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 'Accessories', 25),
('Coffee Maker', '12-cup programmable drip coffee maker with auto shut-off.', 39.99, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500', 'Home', 20),
('Desk Lamp', 'LED desk lamp with adjustable brightness and USB charging port.', 24.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500', 'Home', 50),
('Yoga Mat', 'Non-slip eco-friendly yoga mat, 6mm thick.', 19.99, 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500', 'Fitness', 70),
('Sunglasses', 'Polarized UV400 protection sunglasses with lightweight frame.', 29.99, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500', 'Accessories', 40),
('Bluetooth Speaker', 'Portable waterproof speaker with 12-hour battery life.', 34.99, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', 'Electronics', 40),
('Mechanical Keyboard', 'RGB backlit mechanical keyboard with blue switches.', 64.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500', 'Electronics', 25),
('Wireless Mouse', 'Ergonomic wireless mouse with adjustable DPI.', 22.50, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', 'Electronics', 55),
('Phone Stand', 'Adjustable aluminum phone and tablet stand.', 14.99, 'https://images.unsplash.com/photo-1601972602288-3be527b4f18b?w=500', 'Accessories', 80),
('Denim Jacket', 'Classic fit denim jacket, machine washable.', 54.00, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 'Apparel', 35),
('Cotton T-Shirt', 'Soft 100% cotton crew neck t-shirt.', 12.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', 'Apparel', 100),
('Leather Wallet', 'Slim genuine leather bifold wallet.', 27.99, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', 'Accessories', 45),
('Water Bottle', 'Insulated stainless steel bottle, keeps drinks cold 24h.', 18.50, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500', 'Fitness', 90),
('Ceramic Mug Set', 'Set of 4 handmade ceramic coffee mugs.', 29.99, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500', 'Home', 30),
('Scented Candle', 'Soy wax candle, lavender and vanilla scent, 40hr burn.', 16.99, 'https://images.unsplash.com/photo-1602874801007-bd459bf7e0a6?w=500', 'Home', 60),
('Throw Blanket', 'Soft fleece throw blanket, 50x60 inches.', 24.99, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500', 'Home', 35),
('Notebook Set', 'Pack of 3 hardcover dotted notebooks, A5 size.', 15.99, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500', 'Stationery', 70),
('Fountain Pen', 'Classic fountain pen with converter, fine nib.', 21.99, 'https://images.unsplash.com/photo-1583485088034-697b5bc36b91?w=500', 'Stationery', 40),
('Resistance Bands', 'Set of 5 resistance bands for home workouts.', 19.99, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500', 'Fitness', 65),
('Dumbbell Set', 'Adjustable dumbbell pair, 5-25 lbs each.', 89.00, 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=500', 'Fitness', 15),
('Skincare Set', 'Cleanser, toner, and moisturizer travel-size trio.', 32.99, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500', 'Beauty', 50),
('Sunscreen SPF50', 'Lightweight broad-spectrum sunscreen, 100ml.', 13.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', 'Beauty', 75),
('Kids Building Blocks', '100-piece colorful building block set.', 26.99, 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500', 'Toys', 40),
('Board Game', 'Family strategy board game for 2-6 players.', 34.99, 'https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=500', 'Toys', 20),
('Pet Bed', 'Cozy round pet bed, machine washable cover.', 38.00, 'https://images.unsplash.com/photo-1583512603806-077998240c7a?w=500', 'Pet Supplies', 25);
