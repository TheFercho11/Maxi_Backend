// /JS/electronica.js - JavaScript para la página de Electrónica
document.addEventListener('DOMContentLoaded', async function() {
    
    function crearTarjetaDeProducto(producto) {
        // --- INICIO DE LA CORRECCIÓN ---
        // Convertimos los precios de texto a número antes de usarlos
        const precioNumero = parseFloat(producto.precio);
        const precioAnteriorNumero = parseFloat(producto.precio_anterior);
        // --- FIN DE LA CORRECCIÓN ---

        const precioAntiguo = precioAnteriorNumero > 0 ? `<span class="old-price">$${precioAnteriorNumero.toFixed(2)}</span>` : '';
        const descuento = producto.descuento > 0 ? `<span class="discount">-${producto.descuento}%</span>` : '';

        return `
             <div class="product-card" data-id="${producto.id}" data-name="${producto.nombre}" data-price="${precioNumero.toFixed(2)}">
              <span class="favorito">❤</span>
                <img src="${producto.imagen}" alt="${producto.nombre}">
                <h3>${producto.nombre}</h3>
                <p class="price">$${precioNumero.toFixed(2)} ${precioAntiguo}</p>
                ${descuento}
                <input type="number" class="cantidad" value="1" min="1">
                <button class="agregar-btn">Agregar</button>
            </div>
        `;
    }
    });

    async function cargarProductos() {
    const contenedor = document.getElementById('productos-container');
    if (!contenedor) return;
    
    try {
        const response = await fetch('/api/productos/electronica');
        if (!response.ok) {
            // Si la respuesta no es exitosa (ej. 404, 500), lanzamos un error
            throw new Error('La respuesta del servidor no fue exitosa.');
        }
        
        const productos = await response.json();
        
        if (productos.length === 0) {
            contenedor.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
        } else {
            contenedor.innerHTML = productos.map(crearTarjetaDeProducto).join('');
        }

        // --- CORRECCIÓN ---
        // Despachamos el evento aquí, solo si todo salió bien.
        document.dispatchEvent(new CustomEvent('productosCargados'));

    } catch (error) {
        console.error('Error al cargar los productos:', error);
        contenedor.innerHTML = '<p>Hubo un problema al cargar los productos. Por favor, intente de nuevo más tarde.</p>';
    }
}