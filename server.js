// =================================================================
// I. INICIALIZACIÓN Y CONFIGURACIÓN
// =================================================================

// -----------------------------------------------------------------
// 1.1 Importación de Dependencias
// -----------------------------------------------------------------
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 1.1.1 Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 1.2 Creación del Servidor Express y Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Puedes restringir esto a tu dominio en producción
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

// 1.3 Configuración de Multer Y cloudinary (Subida de Archivos)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'maxi_despensa/products',
        allowed_formats: ['jpeg', 'png', 'jpg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});
const upload = multer({ storage: storage });

// 1.4 Middlewares Globales de la Aplicación
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 1.5 Configuración de la Base de Datos (PostgreSQL Pool)
const isProduction = process.env.NODE_ENV === 'production';
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
};
const pool = new Pool(isProduction ? connectionConfig : {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// =================================================================
// II. MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN
// =================================================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

const requireAdmin = (rol) => (req, res, next) => {
    const userRole = req.user.rol_nombre;
    const requiredRoles = Array.isArray(rol) ? rol : [rol];
    if (!requiredRoles.includes(userRole) && userRole !== 'admin_general') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
};

// =================================================================
// III. LÓGICA DE SOCKET.IO (TIEMPO REAL)
// =================================================================
io.on('connection', (socket) => {
    console.log('Un administrador se ha conectado en tiempo real.');
    socket.on('disconnect', () => {
        console.log('Un administrador se ha desconectado.');
    });
});

// =================================================================
// IV. RUTAS DE LA API (ENDPOINTS)
// =================================================================

// 4.1 Rutas Públicas (Vista del Cliente)
app.get('/api/categorias', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nombre FROM categorias');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

const getProductosPorCategoria = async (categoriaNombre, res) => {
    try {
        // --- INICIO DE LA MODIFICACIÓN ---
        // Cambiamos '=' por 'ILIKE' para una búsqueda insensible a mayúsculas/minúsculas.
        const { rows } = await pool.query(`
            SELECT p.id, p.nombre, p.sku, p.precio, p.precio_anterior, p.descuento, p.stock, p.imagen, p.destacado
            FROM productos p 
            JOIN categorias c ON p.categoria_id = c.id
            WHERE c.nombre ILIKE $1 AND p.activo = TRUE`, [categoriaNombre]);
        // --- FIN DE LA MODIFICACIÓN ---
            
        res.json(rows);
    } catch (error) {
        console.error(`Error en getProductosPorCategoria (${categoriaNombre}):`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

app.get('/api/productos/hogar', (req, res) => getProductosPorCategoria('Hogar', res));
app.get('/api/productos/electronica', (req, res) => getProductosPorCategoria('Electrónica', res));
app.get('/api/productos/limpieza', (req, res) => getProductosPorCategoria('Limpieza', res));

// 4.2 Rutas de Autenticación (Registro y Login)
app.post('/api/register', async (req, res) => {
    const { nombre, apellido, email, password, telefono, direccion, ciudad } = req.body;
    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos requeridos son obligatorios.' });
    }
    try {
        const { rows: existingUser } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, telefono, direccion, ciudad, rol_id, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)',
            [nombre, apellido, email, hashedPassword, telefono || null, direccion || null, ciudad || null, 4]
        );
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }
    try {
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND rol_id = 4 AND activo = TRUE', [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas.' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas.' });

        const payload = {
            id: user.id, email: user.email, nombre: user.nombre,
            telefono: user.telefono, direccion: user.direccion, ciudad: user.ciudad
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.json({ message: 'Login exitoso', token, user: payload });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query('SELECT u.*, r.nombre_rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.email = $1 AND u.activo = TRUE', [email]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas.' });
        
        const adminRoles = ['admin_general', 'admin_productos', 'admin_reportes'];
        if (!adminRoles.includes(user.nombre_rol)) {
            return res.status(403).json({ error: 'Acceso denegado.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas.' });
        
        const payload = {
            id: user.id, email: user.email,
            nombre_completo: `${user.nombre} ${user.apellido || ''}`.trim(),
            rol_id: user.rol_id, rol_nombre: user.nombre_rol
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.json({ message: 'Login exitoso', token, user: payload });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// 4.3 Rutas de Proceso de Compra y Pago
app.post('/api/create-payment-intent', async (req, res) => {
    const { cart } = req.body;
    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío.' });
    }
    try {
        const productIds = cart.map(item => item.id);
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const { rows: productosEnDB } = await pool.query(`SELECT id, precio FROM productos WHERE id IN (${placeholders})`, productIds);
        
        let totalAmount = 0;
        for (const item of cart) {
            const productoDB = productosEnDB.find(p => p.id === item.id);
            if (productoDB) {
                totalAmount += parseFloat(productoDB.precio) * item.cantidad;
            }
        }
        
        const amountInCents = Math.round(totalAmount * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            payment_method_types: ['card'],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/create-order', authenticateToken, async (req, res) => {
    const { cart, paymentIntentId } = req.body;
    const userId = req.user.id;
    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const productIds = cart.map(item => item.id);
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const { rows: productosEnDB } = await client.query(`SELECT id, nombre, precio, stock FROM productos WHERE id IN (${placeholders})`, productIds);
        
        let totalCalculado = 0;
        for (const item of cart) {
            const productoDB = productosEnDB.find(p => p.id === parseInt(item.id));
            if (!productoDB) throw new Error(`Producto con ID ${item.id} no encontrado.`);
            if (productoDB.stock < item.cantidad) throw new Error(`Stock insuficiente para el producto: ${item.nombre}`);
            totalCalculado += parseFloat(productoDB.precio) * item.cantidad;
        }

        const numeroOrden = `MD-${Date.now()}`;
        const ordenResult = await client.query(
            'INSERT INTO ordenes (numero_orden, usuario_id, total, estado, payment_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [numeroOrden, userId, totalCalculado, 'pendiente', paymentIntentId || null]
        );
        const ordenId = ordenResult.rows[0].id;
        
        await client.query('INSERT INTO historial_ordenes (orden_id, estado) VALUES ($1, $2)', [ordenId, 'pendiente']);
        
        for (const item of cart) {
            const productoDB = productosEnDB.find(p => p.id === parseInt(item.id));
            await client.query(
                'INSERT INTO ordenes_productos (orden_id, producto_id, cantidad, precio) VALUES ($1, $2, $3, $4)',
                [ordenId, item.id, item.cantidad, productoDB.precio]
            );
            await client.query(
                'UPDATE productos SET stock = stock - $1, unidades_vendidas = unidades_vendidas + $2 WHERE id = $3',
                [item.cantidad, item.cantidad, item.id]
            );
        }
        
        await client.query('COMMIT');
        
        const { rows: [nuevaOrdenInfo] } = await pool.query(`SELECT o.numero_orden, o.total, o.estado, u.nombre FROM ordenes o JOIN usuarios u ON o.usuario_id = u.id WHERE o.id = $1`, [ordenId]);
        io.emit('nueva_orden', nuevaOrdenInfo);
        
        res.status(201).json({ message: '¡Pedido realizado con éxito!', orderId: ordenId, numeroOrden: numeroOrden });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    } finally {
        client.release();
    }
});

// 4.4 Rutas de Gestión de Cuenta de Usuario
app.put('/api/user/shipping-details', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { telefono, ciudad, direccion } = req.body;
    try {
        await pool.query(
            'UPDATE usuarios SET telefono = $1, ciudad = $2, direccion = $3 WHERE id = $4',
            [telefono || null, ciudad || null, direccion || null, userId]
        );
        res.json({ message: 'Información de envío actualizada exitosamente.' });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// 4.5 Rutas del Panel de Administración
app.get('/api/admin/dashboard', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rows: [{ total_usuarios }] } = await pool.query('SELECT COUNT(*) AS total_usuarios FROM usuarios WHERE rol_id = 4');
        const { rows: [{ total_productos }] } = await pool.query('SELECT COUNT(*) AS total_productos FROM productos WHERE activo = TRUE');
        const { rows: [{ ordenes_pendientes }] } = await pool.query('SELECT COUNT(*) AS ordenes_pendientes FROM ordenes WHERE estado = $1', ['pendiente']);
        const { rows: [{ ventas_mes }] } = await pool.query("SELECT SUM(total) AS ventas_mes FROM ordenes WHERE estado = 'entregado' AND created_at >= NOW() - INTERVAL '30 days'");
        const { rows: ultimas_ordenes } = await pool.query(`
            SELECT o.numero_orden, o.total, o.estado, u.nombre 
            FROM ordenes o JOIN usuarios u ON o.usuario_id = u.id 
            ORDER BY o.created_at DESC LIMIT 5`);
        res.json({
            total_usuarios, total_productos, ordenes_pendientes,
            ventas_mes: ventas_mes || 0,
            ultimas_ordenes
        });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.get('/api/admin/productos', authenticateToken, requireAdmin(['admin_general', 'admin_productos']), async (req, res) => {
    try {
        const { rows: productos } = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
            ORDER BY p.id DESC`);
        res.json(productos);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.post('/api/admin/productos', authenticateToken, requireAdmin(['admin_general', 'admin_productos']), upload.single('imagen'), async (req, res) => {
    const { nombre, sku, precio, precio_anterior, descuento, stock, stock_minimo, categoria_id, activo, destacado } = req.body;
    const imagenPath = req.file ? req.file.path : null;
    try {
        await pool.query(
            'INSERT INTO productos (nombre, sku, precio, precio_anterior, descuento, stock, stock_inicial, stock_minimo, imagen, categoria_id, activo, destacado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [nombre, sku, precio, precio_anterior || 0, descuento || 0, stock, stock, stock_minimo, imagenPath, categoria_id, activo, destacado]
        );
        res.status(201).json({ message: 'Producto creado exitosamente' });
    } catch (error) { res.status(500).json({ error: 'Error al crear el producto.' }); }
});

app.put('/api/admin/productos/:id', authenticateToken, requireAdmin(['admin_general', 'admin_productos']), upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { nombre, sku, precio, precio_anterior, descuento, stock, stock_minimo, categoria_id, activo, destacado } = req.body;
    try {
        let sqlQuery = 'UPDATE productos SET nombre = $1, sku = $2, precio = $3, precio_anterior = $4, descuento = $5, stock = $6, stock_minimo = $7, categoria_id = $8, activo = $9, destacado = $10';
        const params = [nombre, sku, precio, precio_anterior, descuento, stock, stock_minimo, categoria_id, activo, destacado];
        
        if (req.file) {
            sqlQuery += `, imagen = $${params.length + 1}`;
            params.push(req.file.path);
        }
        
        sqlQuery += ` WHERE id = $${params.length + 1}`;
        params.push(id);
        
        await pool.query(sqlQuery, params);
        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (error) { res.status(500).json({ error: 'Error al actualizar el producto.' }); }
});

app.delete('/api/admin/productos/:id', authenticateToken, requireAdmin(['admin_general', 'admin_productos']), async (req, res) => {
    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Producto eliminado' });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.get('/api/admin/ordenes', authenticateToken, requireAdmin(['admin_general', 'admin_reportes']), async (req, res) => {
    try {
        let query = `
            SELECT o.id, o.numero_orden, o.total, o.estado, o.created_at, CONCAT(u.nombre, ' ', u.apellido) as cliente_nombre
            FROM ordenes o JOIN usuarios u ON o.usuario_id = u.id `;
        const params = [];
        const conditions = [];
        let paramIndex = 1;

        if (req.query.cliente_nombre) {
            conditions.push(`CONCAT(u.nombre, ' ', u.apellido) ILIKE $${paramIndex++}`);
            params.push(`%${req.query.cliente_nombre}%`);
        }
        if (req.query.startDate) {
            conditions.push(`o.created_at >= $${paramIndex++}`);
            params.push(req.query.startDate);
        }
        if (req.query.endDate) {
            conditions.push(`o.created_at <= $${paramIndex++}`);
            params.push(req.query.endDate + ' 23:59:59');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ` ORDER BY o.created_at DESC`;
        
        const { rows: ordenes } = await pool.query(query, params);
        res.json(ordenes);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.get('/api/admin/ordenes/:id', authenticateToken, requireAdmin(['admin_general', 'admin_reportes']), async (req, res) => {
    try {
        const { rows: [orden] } = await pool.query(`
            SELECT o.*, u.nombre, u.apellido, u.email, u.telefono, u.direccion, u.ciudad 
            FROM ordenes o JOIN usuarios u ON o.usuario_id = u.id 
            WHERE o.id = $1`, [req.params.id]);
        
        if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

        const { rows: productos } = await pool.query(`
            SELECT p.nombre, p.sku, op.cantidad, op.precio 
            FROM ordenes_productos op JOIN productos p ON op.producto_id = p.id 
            WHERE op.orden_id = $1`, [req.params.id]);

        const { rows: historial } = await pool.query('SELECT * FROM historial_ordenes WHERE orden_id = $1 ORDER BY fecha ASC', [req.params.id]);
        
        res.json({ ...orden, productos, historial });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor' }); }
});

app.put('/api/admin/ordenes/:id/estado', authenticateToken, requireAdmin(['admin_general', 'admin_reportes']), async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: 'El nuevo estado es obligatorio.' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows: [ordenActual] } = await client.query('SELECT estado FROM ordenes WHERE id = $1', [id]);
        
        if (estado === 'cancelado' && ordenActual.estado !== 'cancelado') {
            const { rows: productosEnOrden } = await client.query('SELECT producto_id, cantidad FROM ordenes_productos WHERE orden_id = $1', [id]);
            for (const item of productosEnOrden) {
                await client.query(
                    'UPDATE productos SET stock = stock + $1, unidades_vendidas = GREATEST(0, unidades_vendidas - $2) WHERE id = $3',
                    [item.cantidad, item.cantidad, item.producto_id]
                );
            }
        }

        await client.query('UPDATE ordenes SET estado = $1 WHERE id = $2', [estado, id]);
        await client.query('INSERT INTO historial_ordenes (orden_id, estado) VALUES ($1, $2)', [id, estado]);

        await client.query('COMMIT');
        res.json({ message: 'Estado de la orden actualizado exitosamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error interno del servidor.' });
    } finally {
        client.release();
    }
});

// >> Gestión de Usuarios (Clientes)
app.get('/api/admin/usuarios/clientes', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rows: clientes } = await pool.query('SELECT id, nombre, apellido, email, activo, fecha_registro FROM usuarios WHERE rol_id = 4');
        res.json(clientes);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.get('/api/admin/usuarios/clientes/:id', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nombre, apellido, email, telefono, direccion, ciudad, activo FROM usuarios WHERE id = $1 AND rol_id = 4', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.put('/api/admin/usuarios/clientes/:id', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, activo } = req.body;
    if (!nombre || !apellido || !email) return res.status(400).json({ error: 'Nombre, apellido y correo son obligatorios.' });
    
    try {
        const { rowCount } = await pool.query(
            'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, telefono = $4, activo = $5 WHERE id = $6 AND rol_id = 4',
            [nombre, apellido, email, telefono, activo, id]
        );
        if (rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.json({ message: 'Cliente actualizado exitosamente.' });
    } catch (error) {
        if (error.code === '23505') { // Código de error de PostgreSQL para violación de unicidad
            return res.status(409).json({ error: 'El correo electrónico ya está en uso por otro usuario.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.delete('/api/admin/usuarios/clientes/:id', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1 AND rol_id = 4', [req.params.id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.json({ message: 'Cliente eliminado exitosamente.' });
    } catch (error) {
        if (error.code === '23503') { // Código de error de PostgreSQL para violación de llave foránea
            return res.status(400).json({ error: 'No se puede eliminar: el cliente tiene órdenes asociadas.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.get('/api/admin/usuarios/clientes/:id/ordenes', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rows: ordenes } = await pool.query(
            'SELECT numero_orden, total, estado, created_at FROM ordenes WHERE usuario_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(ordenes);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// >> Gestión de Usuarios (Administradores)
app.get('/api/admin/usuarios/admins', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rows: admins } = await pool.query(`
            SELECT u.id, u.nombre, u.apellido, u.email, u.activo, r.nombre_rol 
            FROM usuarios u JOIN roles r ON u.rol_id = r.id 
            WHERE u.rol_id != 4`);
        res.json(admins);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.post('/api/admin/usuarios/admins', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    const { nombre, apellido, email, password, rol_id } = req.body;
    if (!nombre || !email || !password || !rol_id) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }
    try {
        const { rows: existingUser } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (existingUser.length > 0) return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol_id, activo) VALUES ($1, $2, $3, $4, $5, TRUE)',
            [nombre, apellido || null, email, hashedPassword, rol_id]
        );
        res.status(201).json({ message: 'Administrador creado exitosamente.' });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.delete('/api/admin/usuarios/admins/:id', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    const adminIdToDelete = req.params.id;
    const currentAdminId = req.user.id;
    if (parseInt(adminIdToDelete, 10) === parseInt(currentAdminId, 10)) {
        return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
    }
    try {
        const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1 AND rol_id != 4', [adminIdToDelete]);
        if (rowCount === 0) return res.status(404).json({ error: 'Administrador no encontrado.' });
        res.json({ message: 'Administrador eliminado exitosamente.' });
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// >> Gestión de Roles
app.get('/api/admin/roles', authenticateToken, requireAdmin('admin_general'), async (req, res) => {
    try {
        const { rows: roles } = await pool.query("SELECT id, nombre_rol FROM roles WHERE nombre_rol != 'cliente'");
        res.json(roles);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// >> Perfil del Administrador Logueado
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT nombre, apellido, email FROM usuarios WHERE id = $1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Administrador no encontrado.' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.put('/api/admin/profile', authenticateToken, async (req, res) => {
    const adminId = req.user.id;
    const { nombre, apellido, email, password } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: 'El nombre y el email son obligatorios.' });
    
    try {
        let query = 'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3';
        const params = [nombre, apellido || null, email];
        let paramIndex = 4;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password = $${paramIndex++}`;
            params.push(hashedPassword);
        }
        query += ` WHERE id = $${paramIndex}`;
        params.push(adminId);
        
        await pool.query(query, params);
        
        const { rows: [updatedUser] } = await pool.query('SELECT u.*, r.nombre_rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = $1', [adminId]);
        const payload = {
            id: updatedUser.id, email: updatedUser.email,
            nombre_completo: `${updatedUser.nombre} ${updatedUser.apellido || ''}`.trim(),
            rol_id: updatedUser.rol_id, rol_nombre: updatedUser.nombre_rol
        };
        const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        
        res.json({ message: 'Perfil actualizado exitosamente.', newToken });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'El correo electrónico ya está en uso.' });
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// >> Reportes y Stock
app.get('/api/admin/stock', authenticateToken, requireAdmin(['admin_general', 'admin_productos']), async (req, res) => {
    try {
        const { rows: stockData } = await pool.query(`
            SELECT sku, nombre, stock_inicial, unidades_vendidas, stock AS stock_actual, stock_minimo
            FROM productos ORDER BY nombre ASC`);
        res.json(stockData);
    } catch (error) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

app.get('/api/admin/reportes', authenticateToken, requireAdmin(['admin_general', 'admin_reportes']), async (req, res) => {
    const { startDate, endDate } = req.query;
    const finalStartDate = startDate || '1970-01-01';
    const finalEndDate = endDate || new Date().toISOString().split('T')[0];
    try {
        const { rows: ventasPorCategoria } = await pool.query(`
            SELECT c.nombre, SUM(op.cantidad * op.precio) as total_ventas
            FROM ordenes_productos op
            JOIN productos p ON op.producto_id = p.id
            JOIN categorias c ON p.categoria_id = c.id
            JOIN ordenes o ON op.orden_id = o.id
            WHERE o.created_at BETWEEN $1 AND $2
            GROUP BY c.nombre`, [finalStartDate, finalEndDate]);
        const { rows: clientesNuevos } = await pool.query(`
            SELECT DATE(fecha_registro) as fecha, COUNT(*) as cantidad
            FROM usuarios
            WHERE rol_id = 4 AND fecha_registro BETWEEN $1 AND $2
            GROUP BY fecha`, [finalStartDate, finalEndDate]);
        res.json({ ventasPorCategoria, clientesNuevos });
    } catch (error) { res.status(500).json({ error: 'Error al generar reportes' }); }
});

// =================================================================
// V. SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND)
// =================================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'HTML', 'index.html')));
app.get('/electronica', (req, res) => res.sendFile(path.join(__dirname, 'public', 'HTML', 'Electronica', 'electronica.html')));
app.get('/limpieza', (req, res) => res.sendFile(path.join(__dirname, 'public', 'HTML', 'Limpieza', 'Limpieza.html')));
app.get('/hogar', (req, res) => res.sendFile(path.join(__dirname, 'public', 'HTML', 'Hogar', 'hogar.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'HTML', 'checkout.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'HTML', 'Panel Administracion.html')));

// =================================================================
// VI. INICIO DEL SERVIDOR
// =================================================================
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});