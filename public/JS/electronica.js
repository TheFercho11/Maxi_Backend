// /JS/electronica.js - JavaScript para la página de Electrónica
document.addEventListener('DOMContentLoaded', async function() {
    
    console.log("Paso 0: El HTML ha cargado. Ejecutando electronica.js...");

    function crearTarjetaDeProducto(producto) {
        const precioNumero = parseFloat(producto.precio);
        const precioAnteriorNumero = parseFloat(producto.precio_anterior);

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

    async function cargarProductos() {
        console.log("Paso 1: Iniciando la carga de productos...");
        
        const contenedor = document.getElementById('productos-container');
        
        if (!contenedor) {
            console.error("¡ERROR FATAL! No se encontró el div con id='productos-container' en el HTML.");
            return;
        }
        
        console.log("Paso 2: Contenedor encontrado. Realizando la petición fetch a /api/productos/electronica...");
        
        try {
            const response = await fetch('/api/productos/electronica');
            console.log("Paso 3: Respuesta del fetch recibida:", response);

            if (!response.ok) {
                throw new Error(`La respuesta del servidor no fue OK. Estado: ${response.status}`);
            }
            
            const productos = await response.json();
            console.log("Paso 4: Productos recibidos de la API:", productos);
            
            if (productos.length === 0) {
                contenedor.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
            } else {
                contenedor.innerHTML = productos.map(crearTarjetaDeProducto).join('');
            }

            document.dispatchEvent(new CustomEvent('productosCargados'));

        } catch (error) {
            console.error('Paso 5: ¡ERROR! Se ha producido un error en el bloque catch:', error);
            contenedor.innerHTML = '<p>Hubo un problema al cargar los productos. Por favor, intente de nuevo más tarde.</p>';
        }
    }

    await cargarProductos();
});