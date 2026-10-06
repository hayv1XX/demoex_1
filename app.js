const express = require('express');
const session = require('express-session');
const multer = require('multer');
const methodOverride = require('method-override');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
require('dotenv').config();

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));

function auth(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

function role(...roles) {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            return res.status(403).send('Доступ запрещен');
        }
        next();
    };
}

// ============ АВТОРИЗАЦИЯ ============
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { login, password } = req.body;
    try {
        const r = await pool.query(
            `SELECT u.id AS user_id, u.full_name, r.name AS role
             FROM users u JOIN roles r ON u.role_id = r.id
             WHERE u.login = $1 AND u.password = $2`,
            [login, password]
        );
        if (r.rows.length === 0) {
            return res.render('login', { error: 'Неверный логин или пароль' });
        }
        req.session.user = r.rows[0];
        res.redirect('/products');
    } catch (e) {
        console.error(e);
        res.render('login', { error: 'Ошибка БД' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.get('/', auth, (req, res) => res.redirect('/products'));

// ============ ТОВАРЫ ============
app.get('/products', auth, async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT p.id AS product_id, p.article, p.name, p.price, p.discount,
                   p.stock_quantity, p.description, p.photo,
                   u.name AS unit_name,
                   c.name AS category_name,
                   s.name AS supplier_name,
                   m.name AS manufacturer_name,
                   p.category_id, p.supplier_id, p.manufacturer_id
            FROM products p
            JOIN units u ON p.unit_id = u.id
            JOIN categories c ON p.category_id = c.id
            JOIN suppliers s ON p.supplier_id = s.id
            JOIN manufacturers m ON p.manufacturer_id = m.id
            ORDER BY p.id
        `);

        const categories = await pool.query('SELECT * FROM categories ORDER BY name');
        const suppliers = await pool.query('SELECT * FROM suppliers ORDER BY name');
        const manufacturers = await pool.query('SELECT * FROM manufacturers ORDER BY name');

        res.render('products', {
            user: req.session.user,
            products: r.rows,
            categories: categories.rows,
            suppliers: suppliers.rows,
            manufacturers: manufacturers.rows
        });
    } catch (e) {
        console.error(e);
        res.send('Ошибка загрузки товаров: ' + e.message);
    }
});

app.get('/products/new', auth, role('Администратор'), async (req, res) => {
    const cats = await pool.query('SELECT * FROM categories ORDER BY name');
    const sups = await pool.query('SELECT * FROM suppliers ORDER BY name');
    const mans = await pool.query('SELECT * FROM manufacturers ORDER BY name');
    res.render('product_form', {
        user: req.session.user,
        product: null,
        categories: cats.rows,
        suppliers: sups.rows,
        manufacturers: mans.rows
    });
});

app.get('/products/:id/edit', auth, role('Администратор'), async (req, res) => {
    const r = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.redirect('/products');
    const cats = await pool.query('SELECT * FROM categories ORDER BY name');
    const sups = await pool.query('SELECT * FROM suppliers ORDER BY name');
    const mans = await pool.query('SELECT * FROM manufacturers ORDER BY name');
    res.render('product_form', {
        user: req.session.user,
        product: r.rows[0],
        categories: cats.rows,
        suppliers: sups.rows,
        manufacturers: mans.rows
    });
});

app.post('/products', auth, role('Администратор'), upload.single('photo'), async (req, res) => {
    try {
        const { article, name, price, discount, stock_quantity, description,
                supplier_id, manufacturer_id, category_id } = req.body;
        const photo = req.file ? req.file.filename : null;
        const unit = await pool.query(`SELECT id FROM units LIMIT 1`);
        await pool.query(
            `INSERT INTO products(article,name,unit_id,price,supplier_id,manufacturer_id,
             category_id,discount,stock_quantity,description,photo)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [article, name, unit.rows[0].id, price, supplier_id, manufacturer_id,
             category_id, discount, stock_quantity, description, photo]
        );
        res.redirect('/products');
    } catch (e) {
        console.error(e);
        res.send('Ошибка добавления: возможно, артикул уже существует. ' + e.message);
    }
});

app.post('/products/:id', auth, role('Администратор'), upload.single('photo'), async (req, res) => {
    try {
        const { article, name, price, discount, stock_quantity, description,
                supplier_id, manufacturer_id, category_id } = req.body;
        const old = await pool.query('SELECT photo FROM products WHERE id = $1', [req.params.id]);
        let photo = old.rows[0].photo;
        if (req.file) {
            if (photo) {
                const oldPath = path.join(__dirname, 'public/uploads', photo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            photo = req.file.filename;
        }
        const unit = await pool.query(`SELECT id FROM units LIMIT 1`);
        await pool.query(
            `UPDATE products SET article=$1,name=$2,unit_id=$3,price=$4,supplier_id=$5,
             manufacturer_id=$6,category_id=$7,discount=$8,stock_quantity=$9,
             description=$10,photo=$11 WHERE id=$12`,
            [article, name, unit.rows[0].id, price, supplier_id, manufacturer_id,
             category_id, discount, stock_quantity, description, photo, req.params.id]
        );
        res.redirect('/products');
    } catch (e) {
        console.error(e);
        res.send('Ошибка редактирования: ' + e.message);
    }
});

app.post('/products/:id/delete', auth, role('Администратор'), async (req, res) => {
    try {
        const check = await pool.query(
            'SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1',
            [req.params.id]
        );
        if (check.rows.length > 0) {
            return res.send('Нельзя удалить товар, который присутствует в заказе. <a href="/products">Назад</a>');
        }
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.redirect('/products');
    } catch (e) {
        console.error(e);
        res.send('Ошибка удаления: ' + e.message);
    }
});

// ============ ЗАКАЗЫ ============
app.get('/orders', auth, role('Администратор', 'Менеджер'), async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT o.id AS order_id, o.order_date, o.delivery_date,
                   o.pickup_code, o.pickup_point_id, o.user_id, o.status_id,
                   u.full_name, p.address, s.name AS status_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN pickup_points p ON o.pickup_point_id = p.id
            JOIN order_statuses s ON o.status_id = s.id
            ORDER BY o.id
        `);
        const statuses = await pool.query('SELECT * FROM order_statuses ORDER BY id');
        const points = await pool.query('SELECT * FROM pickup_points ORDER BY id');
        const users = await pool.query(`SELECT id, full_name FROM users WHERE role_id = 3 ORDER BY full_name`);
        const products = await pool.query('SELECT id, name, article, price FROM products ORDER BY name');

        const orders = r.rows;
        for (const o of orders) {
            const items = await pool.query(`
                SELECT oi.quantity, p.name, p.article
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [o.order_id]);
            o.items = items.rows;
        }

        res.render('orders', {
            user: req.session.user,
            orders, statuses: statuses.rows, points: points.rows,
            users: users.rows, products: products.rows
        });
    } catch (e) {
        console.error(e);
        res.send('Ошибка загрузки заказов: ' + e.message);
    }
});

app.get('/orders/new', auth, role('Администратор', 'Менеджер'), async (req, res) => {
    const statuses = await pool.query('SELECT * FROM order_statuses ORDER BY id');
    const points = await pool.query('SELECT * FROM pickup_points ORDER BY id');
    const users = await pool.query(`SELECT id, full_name FROM users WHERE role_id = 3 ORDER BY full_name`);
    const products = await pool.query('SELECT id, name, article, price FROM products ORDER BY name');
    res.render('order_form', {
        user: req.session.user,
        order: null, items: [],
        statuses: statuses.rows, points: points.rows,
        users: users.rows, products: products.rows
    });
});

app.get('/orders/:id/edit', auth, role('Администратор', 'Менеджер'), async (req, res) => {
    const r = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.redirect('/orders');
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    const statuses = await pool.query('SELECT * FROM order_statuses ORDER BY id');
    const points = await pool.query('SELECT * FROM pickup_points ORDER BY id');
    const users = await pool.query(`SELECT id, full_name FROM users WHERE role_id = 3 ORDER BY full_name`);
    const products = await pool.query('SELECT id, name, article, price FROM products ORDER BY name');
    res.render('order_form', {
        user: req.session.user,
        order: r.rows[0], items: items.rows,
        statuses: statuses.rows, points: points.rows,
        users: users.rows, products: products.rows
    });
});

app.post('/orders', auth, role('Администратор', 'Менеджер'), async (req, res) => {
    try {
        const { order_date, delivery_date, pickup_point_id, user_id, pickup_code, status_id,
                product_id, quantity } = req.body;
        // Получаем максимальный id и прибавляем 1 (у тебя id INTEGER без SERIAL!)
        const maxId = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS new_id FROM orders');
        const newId = maxId.rows[0].new_id;
        const od = order_date || null;
        await pool.query(
            `INSERT INTO orders(id, order_date, delivery_date, pickup_point_id, user_id, pickup_code, status_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [newId, od, delivery_date, pickup_point_id, user_id, pickup_code, status_id]
        );
        const ids = Array.isArray(product_id) ? product_id : [product_id];
        const qtys = Array.isArray(quantity) ? quantity : [quantity];
        for (let i = 0; i < ids.length; i++) {
            if (ids[i] && qtys[i]) {
                await pool.query(
                    'INSERT INTO order_items(order_id, product_id, quantity) VALUES ($1,$2,$3)',
                    [newId, ids[i], qtys[i]]
                );
            }
        }
        res.redirect('/orders');
    } catch (e) {
        console.error(e);
        res.send('Ошибка создания заказа: ' + e.message);
    }
});

app.post('/orders/:id', auth, role('Администратор', 'Менеджер'), async (req, res) => {
    try {
        const { order_date, delivery_date, pickup_point_id, user_id, pickup_code, status_id,
                product_id, quantity } = req.body;
        const od = order_date || null;
        await pool.query(
            `UPDATE orders SET order_date=$1,delivery_date=$2,pickup_point_id=$3,user_id=$4,
             pickup_code=$5,status_id=$6 WHERE id=$7`,
            [od, delivery_date, pickup_point_id, user_id, pickup_code, status_id, req.params.id]
        );
        await pool.query('DELETE FROM order_items WHERE order_id=$1', [req.params.id]);
        const ids = Array.isArray(product_id) ? product_id : [product_id];
        const qtys = Array.isArray(quantity) ? quantity : [quantity];
        for (let i = 0; i < ids.length; i++) {
            if (ids[i] && qtys[i]) {
                await pool.query(
                    'INSERT INTO order_items(order_id, product_id, quantity) VALUES ($1,$2,$3)',
                    [req.params.id, ids[i], qtys[i]]
                );
            }
        }
        res.redirect('/orders');
    } catch (e) {
        console.error(e);
        res.send('Ошибка редактирования заказа: ' + e.message);
    }
});

app.post('/orders/:id/delete', auth, role('Администратор', 'Менеджер'), async (req, res) => {
    try {
        await pool.query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
        await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
        res.redirect('/orders');
    } catch (e) {
        console.error(e);
        res.send('Ошибка удаления заказа: ' + e.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});