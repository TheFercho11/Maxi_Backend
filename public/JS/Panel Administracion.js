// --- Funciones para cerrar Modales (movidas al ámbito global) ---
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function() {
    // --- Autenticación y Carga Inicial ---
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/HTML/Login Administrador.html';
        return;
    }

    let currentAdminId = null;
    let userRole = null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('admin-name').textContent = payload.nombre_completo;
        currentAdminId = payload.id;
        userRole = payload.rol_nombre;
    } catch (e) {
        console.error("Error al decodificar el token:", e);
        logout();
        return;
    }

    const apiHeaders = { 'Authorization': `Bearer ${token}` };
    let allProducts = [], allClients = [], allAdmins = [], allCategories = [], allStock = [];
    let chartVentas = null, chartClientes = null;

    // --- Lógica de Permisos por Rol ---
    function aplicarPermisosDeRol() {
        const menuItems = document.querySelectorAll('#menu-navegacion li');
        const seccionesPermitidas = {
            'admin_general': ['dashboard', 'productos', 'ordenes', 'usuarios', 'stock', 'reportes'],
            'admin_productos': ['productos', 'stock'],
            'admin_reportes': ['ordenes', 'reportes']
        };
        const permisosUsuario = seccionesPermitidas[userRole] || [];

        menuItems.forEach(item => {
            const link = item.querySelector('a');
            const seccion = link.getAttribute('data-seccion');
            if (seccion && !permisosUsuario.includes(seccion)) {
                item.classList.add('deshabilitada');
            }
        });

        const primeraSeccionPermitida = permisosUsuario[0] || 'dashboard';
        showSection(primeraSeccionPermitida);
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-seccion="${primeraSeccionPermitida}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    
    // --- Búsqueda y Filtros (FUNCIONES) ---
    function filterProducts() {
        const searchTerm = document.getElementById('search-products').value.toLowerCase();
        const categoryId = document.getElementById('filter-category-products').value;
        return allProducts.filter(p => {
            const matchesSearch = (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) || (p.sku && p.sku.toLowerCase().includes(searchTerm));
            const matchesCategory = !categoryId || p.categoria_id == categoryId;
            return matchesSearch && matchesCategory;
        });
    }

    function filterStock() {
        const searchTerm = document.getElementById('search-stock-sku').value.toLowerCase();
        if (!searchTerm) return allStock;
        return allStock.filter(p => p.sku && p.sku.toLowerCase().includes(searchTerm));
    }


    // --- Navegación y Eventos Generales ---
   // Reemplaza este bloque completo en Panel Administracion.js

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // La lógica que ya tenías
        if (this.parentElement.classList.contains('deshabilitada')) return;
        if (this.id === 'logout-btn') { logout(); return; }
        const sectionId = this.getAttribute('data-seccion');
        showSection(sectionId);
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // --- INICIO DEL CÓDIGO AÑADIDO ---
        // Después de hacer clic, buscamos el panel lateral
        const sidebar = document.querySelector('.sidebar');
        // Comprobamos si el panel está activo (es decir, visible en el móvil)
        if (sidebar.classList.contains('active')) {
            // Si está activo, le quitamos la clase para que se oculte
            sidebar.classList.remove('active');
        }
        // --- FIN DEL CÓDIGO AÑADIDO ---
    });
});

    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            document.querySelectorAll('.tab-link, .tab-content').forEach(el => el.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });
    
    // --- ASIGNACIÓN DE EVENTOS ---
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('client-edit-form').addEventListener('submit', handleClientEditSubmit);
    document.getElementById('admin-create-form').addEventListener('submit', handleAdminCreateSubmit);
    document.getElementById('export-stock-btn').addEventListener('click', exportStockToExcel);
    document.getElementById('generate-report-btn').addEventListener('click', generateReports);
    document.getElementById('search-products').addEventListener('input', () => renderProducts(filterProducts()));
    document.getElementById('filter-category-products').addEventListener('change', () => renderProducts(filterProducts()));
    document.getElementById('filter-orders-btn').addEventListener('click', loadOrders);
    document.getElementById('search-stock-sku').addEventListener('input', () => renderStock(filterStock()));


    // --- Carga de Datos Inicial ---
    loadCategoriesIntoSelects();
    aplicarPermisosDeRol();

    // --- Conexión y Lógica de Notificaciones en Tiempo Real ---
    const socket = io();
    socket.on('nueva_orden', (data) => {
        if (userRole === 'admin_general' || userRole === 'admin_reportes') {
            showNotification(`🔔 ¡Nueva Orden!`, `N° ${data.numero_orden} de ${data.nombre} por $${parseFloat(data.total).toFixed(2)}.`);
            playNotificationSound();
            if (document.getElementById('dashboard').classList.contains('active')) loadDashboardData();
            if (document.getElementById('ordenes').classList.contains('active')) loadOrders();
        }
    });

    function showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: '/IMG/logo.png' });
        } else {
            alert(`${title}\n${message}`);
        }
    }

    function playNotificationSound() {
        const audio = new Audio('/audio/notification.mp3');
        audio.play().catch(e => console.error("Error al reproducir sonido:", e));
    }

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    function showSection(sectionId) {
        if (!sectionId) return;
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) sectionToShow.classList.add('active');
        
        switch(sectionId) {
            case 'dashboard': loadDashboardData(); break;
            case 'productos': loadProducts(); break;
            case 'ordenes': loadOrders(); break;
            case 'usuarios': loadClients(); loadAdmins(); break;
            case 'stock': loadStock(); break;
            case 'reportes': setupReportDefaults(); break;
        }
    }

    function logout() {
        localStorage.clear();
        window.location.href = '/HTML/Login Administrador.html';
    }

    // --- DASHBOARD ---
    async function loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard', { headers: apiHeaders });
            const data = await response.json();
            document.getElementById('total-usuarios').textContent = data.total_usuarios;
            document.getElementById('total-productos').textContent = data.total_productos;
            document.getElementById('ordenes-pendientes').textContent = data.ordenes_pendientes;
            document.getElementById('ventas-mes').textContent = `$${parseFloat(data.ventas_mes || 0).toFixed(2)}`;
            const ultimasOrdenesBody = document.querySelector('#ultimas-ordenes-table tbody');
            ultimasOrdenesBody.innerHTML = data.ultimas_ordenes.map(o => `<tr><td>${o.numero_orden}</td><td>${o.nombre}</td><td>$${parseFloat(o.total || 0).toFixed(2)}</td><td><span class="badge badge-${o.estado.toLowerCase()}">${o.estado}</span></td></tr>`).join('');
        } catch (error) { console.error('Error cargando dashboard:', error); }
    }
    
    // --- PRODUCTOS ---
    async function loadProducts() {
        try {
            const response = await fetch('/api/admin/productos', { headers: apiHeaders });
            allProducts = await response.json();
            renderProducts(allProducts);
        } catch (error) { console.error("Error al cargar productos:", error); }
    }

   function renderProducts(products) {
    const tbody = document.querySelector('#productos-table tbody');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td data-label="SKU">${p.sku || 'N/A'}</td>
            <td data-label="Imagen"><img src="${p.imagen || '/IMG/placeholder.png'}" alt="${p.nombre}"></td>
            <td data-label="Nombre">${p.nombre}</td>
            <td data-label="Categoría">${p.categoria_nombre || 'Sin categoría'}</td>
            <td data-label="Precio">$${p.precio ? parseFloat(p.precio).toFixed(2) : '0.00'}</td>
            <td data-label="Stock">${p.stock}</td>
            <td data-label="Estado"><span class="badge ${p.activo ? 'badge-success' : 'badge-danger'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td data-label="Acciones">
                <button class="btn btn-sm btn-info" onclick="openProductModal(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');
}

    async function handleProductSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const formData = new FormData(e.target);
        formData.set('activo', document.getElementById('product-active').checked ? 1 : 0);
        formData.set('destacado', document.getElementById('product-featured').checked ? 1 : 0);
        const url = id ? `/api/admin/productos/${id}` : '/api/admin/productos';
        const method = id ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method, headers: { 'Authorization': apiHeaders.Authorization }, body: formData });
            if (response.ok) {
                closeProductModal();
                loadProducts();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'No se pudo guardar el producto.'}`);
            }
        } catch (error) {
            alert('Error de conexión al guardar el producto.');
        }
    }
    
    window.openProductModal = (id = null) => {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        form.reset();
        document.getElementById('product-id').value = '';
        const preview = document.getElementById('image-preview');
        preview.style.display = 'none';
        preview.src = '';
        if (id) {
            document.getElementById('product-modal-title').textContent = 'Editar Producto';
            const product = allProducts.find(p => p.id === id);
            if(product) {
                document.getElementById('product-id').value = product.id;
                document.getElementById('product-name').value = product.nombre;
                document.getElementById('product-sku').value = product.sku;
                document.getElementById('product-category').value = product.categoria_id;
                document.getElementById('product-discount').value = product.descuento;
                document.getElementById('product-price').value = product.precio;
                document.getElementById('product-old-price').value = product.precio_anterior;
                document.getElementById('product-stock').value = product.stock;
                document.getElementById('product-min-stock').value = product.stock_minimo;
                document.getElementById('product-active').checked = product.activo;
                document.getElementById('product-featured').checked = product.destacado;
                if (product.imagen) {
                    preview.src = product.imagen;
                    preview.style.display = 'block';
                }
            }
        } else {
            document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
        }
        modal.style.display = 'block';
    };
    
    window.deleteProduct = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
        try {
            const response = await fetch(`/api/admin/productos/${id}`, { method: 'DELETE', headers: apiHeaders });
            if (response.ok) {
                loadProducts();
            } else {
                alert('No se pudo eliminar el producto.');
            }
        } catch (error) { console.error('Error al eliminar producto:', error); }
    };

    async function loadCategoriesIntoSelects() {
        try {
            const response = await fetch('/api/categorias');
            allCategories = await response.json();
            const selects = document.querySelectorAll('#product-category, #filter-category-products');
            selects.forEach(select => {
                select.innerHTML = '<option value="">Todas las categorías</option>';
                select.innerHTML += allCategories.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
            });
        } catch(e) { console.error("No se pudieron cargar las categorías"); }
    }

    // --- ÓRDENES ---
    async function loadOrders() {
    const cliente = document.getElementById('search-orders-cliente').value;
    const startDate = document.getElementById('order-start-date').value;
    const endDate = document.getElementById('order-end-date').value;
    const url = new URL(window.location.origin + '/api/admin/ordenes');
    if (cliente) url.searchParams.append('cliente_nombre', cliente);
    if (startDate) url.searchParams.append('startDate', startDate);
    if (endDate) url.searchParams.append('endDate', endDate);
    
    try {
        const response = await fetch(url, { headers: apiHeaders });
        const ordenes = await response.json();
        const tbody = document.querySelector('#ordenes-table tbody');
        tbody.innerHTML = ordenes.map(o => `<tr><td data-label="N° Orden">${o.numero_orden}</td><td data-label="Cliente">${o.cliente_nombre}</td><td data-label="Total">$${parseFloat(o.total).toFixed(2)}</td><td data-label="Estado"><span class="badge badge-${o.estado.toLowerCase()}">${o.estado}</span></td><td data-label="Fecha">${new Date(o.created_at).toLocaleDateString()}</td><td data-label="Acciones"><button class="btn btn-sm" onclick="viewOrderDetails(${o.id})">👁️ Ver Detalles</button></td></tr>`).join('');
    } catch(e) { console.error("Error al cargar órdenes:", e); }
}

    window.viewOrderDetails = async (id) => {
        try {
            const response = await fetch(`/api/admin/ordenes/${id}`, { headers: apiHeaders });
            if (!response.ok) throw new Error('No se pudieron cargar los detalles de la orden.');
            
            const orden = await response.json();
            const contentDiv = document.getElementById('order-details-content');
            const controlsDiv = document.getElementById('order-status-controls');

            // Renderizar los detalles de la orden
            let detailsHTML = `<h4>Orden: ${orden.numero_orden}</h4><p><strong>Cliente:</strong> ${orden.nombre} ${orden.apellido}</p><p><strong>Email:</strong> ${orden.email}</p><p><strong>Dirección:</strong> ${orden.direccion || 'No especificada'}</p><p><strong>Total:</strong> $${parseFloat(orden.total).toFixed(2)}</p><p><strong>Estado Actual:</strong> <span class="badge badge-${orden.estado.toLowerCase()}">${orden.estado}</span></p><hr><h5>Productos</h5><table class="table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead><tbody>${orden.productos.map(p => `<tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>$${parseFloat(p.precio).toFixed(2)}</td></tr>`).join('')}</tbody></table><hr><h5>Historial de Estados</h5><ul>${orden.historial.map(h => `<li><strong>${h.estado.toUpperCase()}:</strong> ${new Date(h.fecha).toLocaleString()}</li>`).join('')}</ul>`;
            contentDiv.innerHTML = detailsHTML;

            // Renderizar los controles para cambiar el estado
            const estadosPosibles = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];
            controlsDiv.innerHTML = `
                <div class="form-group">
                    <label for="order-status-select"><strong>Cambiar Estado:</strong></label>
                    <select id="order-status-select" class="form-control">
                        ${estadosPosibles.map(e => `<option value="${e}" ${e === orden.estado ? 'selected' : ''}>${e.charAt(0).toUpperCase() + e.slice(1)}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-success" id="save-status-btn">Guardar Estado</button>
            `;

            // Añadir el evento al nuevo botón
            document.getElementById('save-status-btn').addEventListener('click', async () => {
                const nuevoEstado = document.getElementById('order-status-select').value;
                if (nuevoEstado === orden.estado) {
                    alert('El nuevo estado es el mismo que el actual.');
                    return;
                }

                try {
                    const updateResponse = await fetch(`/api/admin/ordenes/${id}/estado`, {
                        method: 'PUT',
                        headers: { ...apiHeaders, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: nuevoEstado })
                    });

                    const result = await updateResponse.json();
                    alert(result.message || result.error);

                    if (updateResponse.ok) {
                        closeOrderDetailsModal(); // Cerrar el modal
                        loadOrders(); // Recargar la lista de órdenes para ver el cambio
                    }
                } catch (err) {
                    alert('Error de conexión al actualizar el estado.');
                }
            });

            document.getElementById('order-details-modal').style.display = 'block';
        } catch (error) {
            console.error('Error al ver detalles de la orden:', error);
            alert('No se pudo cargar la información de la orden.');
        }
    };
    
    // --- USUARIOS (CLIENTES Y ADMINS) ---
    async function loadClients() {
        try {
            const response = await fetch('/api/admin/usuarios/clientes', { headers: apiHeaders });
            allClients = await response.json();
            renderClients(allClients);
        } catch (error) { console.error("Error al cargar clientes:", error); }
    }

   function renderClients(clients) {
    const tbody = document.querySelector('#clientes-table tbody');
    tbody.innerHTML = clients.map(c => `
        <tr>
            <td data-label="Nombre">${c.nombre} ${c.apellido || ''}</td>
            <td data-label="Email">${c.email}</td>
            <td data-label="Estado"><span class="badge ${c.activo ? 'badge-success' : 'badge-danger'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td data-label="Acciones">
                <button class="btn btn-sm btn-info" onclick="openEditClientModal(${c.id})"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn btn-sm btn-success" onclick="viewClientPurchases(${c.id})"><i class="fas fa-shopping-bag"></i> Ver Compras</button>
                <button class="btn btn-sm btn-danger" onclick="deleteClient(${c.id})"><i class="fas fa-trash-alt"></i> Eliminar</button>
            </td>
        </tr>
    `).join('');
}
    async function handleClientEditSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('client-id').value;
        const clientData = {
            nombre: document.getElementById('client-name').value,
            apellido: document.getElementById('client-apellido').value,
            email: document.getElementById('client-email').value,
            telefono: document.getElementById('client-telefono').value,
            activo: document.getElementById('client-activo').checked ? 1 : 0
        };
        try {
            const response = await fetch(`/api/admin/usuarios/clientes/${id}`, {
                method: 'PUT',
                headers: { ...apiHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });
            const result = await response.json();
            alert(result.message || result.error);
            if (response.ok) {
                closeAllModals();
                loadClients();
            }
        } catch (error) {
            alert('Error de conexión al actualizar el cliente.');
        }
    }

    window.openEditClientModal = async (id) => {
        try {
            const response = await fetch(`/api/admin/usuarios/clientes/${id}`, { headers: apiHeaders });
            if (!response.ok) throw new Error('No se pudieron obtener los datos del cliente.');
            const client = await response.json();
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.nombre;
            document.getElementById('client-apellido').value = client.apellido;
            document.getElementById('client-email').value = client.email;
            document.getElementById('client-telefono').value = client.telefono || '';
            document.getElementById('client-activo').checked = client.activo;
            document.getElementById('client-edit-modal').style.display = 'block';
        } catch (error) {
            alert(error.message);
        }
    };

    window.viewClientPurchases = async (id) => {
        try {
            const response = await fetch(`/api/admin/usuarios/clientes/${id}/ordenes`, { headers: apiHeaders });
            const ordenes = await response.json();
            const contentDiv = document.getElementById('client-purchases-content');
            if (ordenes.length === 0) {
                contentDiv.innerHTML = '<p>Este cliente aún no ha realizado ninguna compra.</p>';
            } else {
                let tableHTML = `<table class="table"><thead><tr><th>N° Orden</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>`;
                tableHTML += ordenes.map(o => `<tr><td>${o.numero_orden}</td><td>$${parseFloat(o.total).toFixed(2)}</td><td><span class="badge badge-${o.estado.toLowerCase()}">${o.estado}</span></td><td>${new Date(o.created_at).toLocaleDateString()}</td></tr>`).join('');
                tableHTML += `</tbody></table>`;
                contentDiv.innerHTML = tableHTML;
            }
            document.getElementById('client-purchases-modal').style.display = 'block';
        } catch (error) {
            alert('Error al cargar el historial de compras.');
        }
    };

    window.deleteClient = async (id) => {
        if (!confirm('¿Seguro que quieres eliminar este cliente? Esta acción podría fallar si tiene órdenes asociadas.')) return;
        try {
            const response = await fetch(`/api/admin/usuarios/clientes/${id}`, { method: 'DELETE', headers: apiHeaders });
            const result = await response.json();
            alert(result.message || result.error);
            if (response.ok) loadClients();
        } catch (e) { alert('Error de conexión.'); }
    };

   async function loadAdmins() {
    try {
        const response = await fetch('/api/admin/usuarios/admins', { headers: apiHeaders });
        allAdmins = await response.json();
        const tbody = document.querySelector('#admins-table tbody');
        tbody.innerHTML = allAdmins.map(a => `
            <tr>
                <td data-label="Nombre">${a.nombre} ${a.apellido || ''}</td>
                <td data-label="Email">${a.email}</td>
                <td data-label="Rol">${a.nombre_rol}</td>
                <td data-label="Acciones">
                    ${ a.id !== currentAdminId ? 
                       `<button class="btn btn-sm btn-danger" onclick="deleteAdmin(${a.id})"><i class="fas fa-trash-alt"></i> Eliminar</button>` : 
                       'Cuenta Actual' 
                    }
                </td>
            </tr>
        `).join('');
    } catch (error) { console.error("Error al cargar administradores:", error); }
}
    window.deleteAdmin = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar a este administrador? Esta acción es irreversible.')) return;
        try {
            const response = await fetch(`/api/admin/usuarios/admins/${id}`, { method: 'DELETE', headers: apiHeaders });
            const result = await response.json();
            alert(result.message || result.error);
            if (response.ok) {
                loadAdmins();
            }
        } catch (e) {
            console.error("Error al eliminar admin:", e);
            alert('Error de conexión al intentar eliminar el administrador.');
        }
    };

    window.openAdminCreateModal = async () => {
        try {
            const response = await fetch('/api/admin/roles', { headers: apiHeaders });
            const roles = await response.json();
            const rolSelect = document.getElementById('admin-rol');
            rolSelect.innerHTML = roles.map(r => `<option value="${r.id}">${r.nombre_rol}</option>`).join('');
            document.getElementById('admin-create-form').reset();
            document.getElementById('admin-create-modal').style.display = 'block';
        } catch(e) {
            alert('Error al cargar los roles de administrador.');
        }
    };

    async function handleAdminCreateSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('/api/admin/usuarios/admins', {
                method: 'POST',
                headers: { ...apiHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            alert(result.message || result.error);
            if(response.ok) {
                closeAllModals();
                loadAdmins();
            }
        } catch(e) {
            alert('Error de conexión al crear el administrador.');
        }
    }

    // --- STOCK ---
    async function loadStock() {
        try {
            const response = await fetch('/api/admin/stock', { headers: apiHeaders });
            allStock = await response.json();
            renderStock(allStock);
        } catch(e) { console.error("Error al cargar el stock:", e); }
    }
    
    function renderStock(stockData) {
    const tbody = document.querySelector('#stock-table tbody');
    tbody.innerHTML = stockData.map(p => {
        const estado = p.stock_actual > p.stock_minimo ? 'ok' : (p.stock_actual > 0 ? 'bajo' : 'agotado');
        const estadoClass = { ok: 'success', bajo: 'warning', agotado: 'danger' }[estado];
        return `<tr>
                    <td data-label="SKU">${p.sku || 'N/A'}</td>
                    <td data-label="Producto">${p.nombre}</td>
                    <td data-label="Stock Inicial">${p.stock_inicial}</td>
                    <td data-label="Unidades Vendidas">${p.unidades_vendidas}</td>
                    <td data-label="Stock Actual">${p.stock_actual}</td>
                    <td data-label="Stock Mínimo">${p.stock_minimo}</td>
                    <td data-label="Estado"><span class="badge badge-${estadoClass}">${estado.toUpperCase()}</span></td>
                </tr>`;
    }).join('');
}

     function exportStockToExcel() {
        // 1. Preparar los datos y los encabezados
        const headers = ["SKU", "Producto", "Stock Inicial", "Unidades Vendidas", "Stock Actual", "Stock Mínimo", "Estado"];
        const dataToExport = allStock.map(p => ({
            SKU: p.sku || 'N/A',
            Producto: p.nombre,
            'Stock Inicial': p.stock_inicial,
            'Unidades Vendidas': p.unidades_vendidas,
            'Stock Actual': p.stock_actual,
            'Stock Mínimo': p.stock_minimo,
            Estado: p.stock_actual > p.stock_minimo ? 'OK' : (p.stock_actual > 0 ? 'BAJO' : 'AGOTADO')
        }));

        // 2. Crear una nueva hoja de cálculo vacía
        const worksheet = XLSX.utils.aoa_to_sheet([]);

        // 3. Añadir el título y la fecha
        const fecha = new Date().toLocaleDateString('es-SV');
        XLSX.utils.sheet_add_aoa(worksheet, [['Reporte de Inventario - Maxi Despensa']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Fecha de Generación: ${fecha}`]], { origin: 'A2' });

        // 4. Fusionar las celdas para el título
        worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
        
        // 5. Añadir los encabezados de la tabla en la fila 4
        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A4' });

        // 6. Añadir los datos del inventario justo debajo de los encabezados
        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A5', skipHeader: true });

        // 7. Calcular y aplicar el ancho de las columnas
        const columnWidths = headers.map((header, i) => {
            const maxLength = Math.max(
                header.length,
                ...dataToExport.map(row => (row[header] ? row[header].toString().length : 0))
            );
            return { wch: maxLength + 2 }; // Añadimos un poco de padding
        });
        worksheet['!cols'] = columnWidths;

        // 8. Crear un nuevo libro de trabajo y añadir la hoja
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Stock");

        // 9. Generar y descargar el archivo con un nombre claro
        const fileName = `Reporte_Stock_MaxiDespensa_${fecha.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    }
    // --- REPORTES ---
    function setupReportDefaults(){
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        document.getElementById('report-start-date').valueAsDate = startDate;
        document.getElementById('report-end-date').valueAsDate = endDate;
        generateReports(); 
    }
    
    async function generateReports() {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        try {
            const response = await fetch(`/api/admin/reportes?startDate=${startDate}&endDate=${endDate}`, { headers: apiHeaders });
            const data = await response.json();
            renderVentasChart(data.ventasPorCategoria);
            renderClientesChart(data.clientesNuevos);
        } catch(e) { console.error("Error al generar reportes:", e); }
    }

    function renderVentasChart(data) {
        const ctx = document.getElementById('ventas-chart').getContext('2d');
        if (chartVentas) chartVentas.destroy();
        chartVentas = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.nombre),
                datasets: [{
                    label: 'Ventas por Categoría',
                    data: data.map(d => d.total_ventas),
                    backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e', '#1abc9c']
                }]
            }
        });
    }

   function renderClientesChart(data) {
        const ctx = document.getElementById('clientes-chart').getContext('2d');
        if (chartClientes) chartClientes.destroy();

        chartClientes = new Chart(ctx, {
            // MEJORA 1: Cambiado a 'line' para ver mejor la tendencia
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-SV', { day: 'numeric', month: 'short' })),
                datasets: [{
                    label: 'Clientes Nuevos',
                    data: data.map(d => d.cantidad),
                    
                    // MEJORA 2: Estilos para un look más profesional
                    backgroundColor: 'rgba(52, 152, 219, 0.2)', // Relleno semitransparente
                    borderColor: '#3498db', // Color de la línea
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3 // Hace la línea ligeramente curva
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            // MEJORA 3: Asegura que el eje Y solo muestre números enteros
                            stepSize: 1 
                        }
                    }
                },
                plugins: {
                    // MEJORA 4: Título claro y tooltips informativos
                    title: {
                        display: true,
                        text: 'Adquisición de Nuevos Clientes por Día',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return `Fecha: ${tooltipItems[0].label}`;
                            },
                            label: function(tooltipItem) {
                                return ` Nuevos Clientes: ${tooltipItem.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Funciones para cerrar Modales ---
    window.closeProductModal = () => document.getElementById('product-modal').style.display = 'none';
    window.closeOrderDetailsModal = () => document.getElementById('order-details-modal').style.display = 'none';
    window.closeClientModals = closeAllModals;
});