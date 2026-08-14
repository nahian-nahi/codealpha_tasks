# General Store — Basic E-commerce App

A simple e-commerce site: Express.js + MySQL backend, plain HTML/CSS/JS frontend.

## Features
- Product listing with search
- Product detail page
- Shopping cart (client-side, localStorage)
- User registration/login (JWT + bcrypt password hashing)
- Order processing (stock validation, atomic transaction, order history)

## Project structure
```
ecommerce-app/
├── backend/
│   ├── config/db.js         # MySQL connection pool
│   ├── middleware/auth.js   # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js          # register / login
│   │   ├── products.js      # product listing / detail
│   │   └── orders.js        # place order / order history
│   ├── schema.sql           # DB schema + sample products
│   ├── server.js            # Express app entry point
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html            # product listing / homepage
    ├── product.html          # product detail
    ├── cart.html             # shopping cart / checkout
    ├── login.html / register.html
    ├── orders.html           # order history
    ├── css/style.css
    └── js/ (api.js, main.js, product.js, cart.js, auth.js, orders.js)
```

## 1. Set up MySQL

Create the database and tables using the provided schema (also inserts 8 sample products):

```bash
mysql -u root -p < backend/schema.sql
```

## 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce_db
JWT_SECRET=some_long_random_string
PORT=5000
```

## 3. Install dependencies and run

```bash
cd backend
npm install
npm start
```

The server serves both the API and the frontend static files, so just open:

```
http://localhost:5000
```

For auto-restart during development:
```bash
npm run dev   # requires nodemon (already in devDependencies)
```

## API endpoints

| Method | Endpoint              | Auth required | Description                     |
|--------|------------------------|:--------------:|----------------------------------|
| POST   | /api/auth/register     | No             | Create account                  |
| POST   | /api/auth/login        | No             | Log in, returns JWT             |
| GET    | /api/products          | No             | List products (`?search=`, `?category=`) |
| GET    | /api/products/:id      | No             | Product detail                  |
| POST   | /api/orders            | Yes            | Place an order                  |
| GET    | /api/orders            | Yes            | List logged-in user's orders    |
| GET    | /api/orders/:id        | Yes            | Order detail with line items    |

Send the JWT as `Authorization: Bearer <token>` for protected routes.

## Notes / next steps for production use
- Passwords are hashed with bcrypt; never store plaintext passwords.
- Order totals are calculated server-side from the database, never trusted from the client.
- Stock is decremented inside a DB transaction with row locking (`FOR UPDATE`) to avoid overselling under concurrent checkouts.
- This is a learning/demo-grade app. For production you'd want: HTTPS, rate limiting, input validation library (e.g. Zod/Joi), refresh tokens, a real payment gateway integration (Stripe, etc.), pagination on product listing, and image uploads instead of hotlinked URLs.
