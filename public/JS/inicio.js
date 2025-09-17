document.addEventListener('DOMContentLoaded', () => {
   // --- CÓDIGO A AÑADIR (INICIO) ---
    // Revisa si la URL tiene el parámetro para abrir el login
     const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'login') {
        const popupUsuario = document.querySelector('.contenido-usuario');
        const opciones = popupUsuario ? popupUsuario.querySelector('.usuario-opciones') : null;
        const formIniciar = popupUsuario ? popupUsuario.querySelector('.form-iniciar') : null;

        // Se asegura de que todos los elementos existan antes de actuar
        if (popupUsuario && opciones && formIniciar) {
            // 1. Muestra el popup de usuario principal
            popupUsuario.classList.add('active');
            
            // 2. Oculta los botones de "Iniciar Sesión" y "Registrarse"
            opciones.style.display = 'none';

            // 3. Muestra el formulario para iniciar sesión
            formIniciar.style.display = 'flex';
        }
    }
    // --- CÓDIGO A AÑADIR (FIN) ---
  // ---------------- SLIDER PUBLICIDAD ----------------
  const track = document.querySelector('.publicidad');
  if (track) {
    const slides = Array.from(track.querySelectorAll(':scope > div'));
    if (slides.length > 1) {
      const prevBtn = document.querySelector('.btn-izquierdo');
      const nextBtn = document.querySelector('.btn-derecho');
      let index = 1;
      let autoplay;
      const firstClone = slides[0].cloneNode(true);
      const lastClone = slides[slides.length - 1].cloneNode(true);
      firstClone.id = 'first-clone';
      lastClone.id = 'last-clone';
      track.appendChild(firstClone);
      track.insertBefore(lastClone, track.firstChild);
      const allSlides = Array.from(track.querySelectorAll(':scope > div'));
      const total = allSlides.length;
      const size = 100;
      track.style.transform = `translateX(-${index * size}%)`;
      function moveToSlide(i) {
        track.style.transition = 'transform 0.5s ease';
        index = i;
        track.style.transform = `translateX(-${index * size}%)`;
      }
      function nextSlide() {
        if (index >= total - 1) return;
        moveToSlide(index + 1);
      }
      function prevSlide() {
        if (index <= 0) return;
        moveToSlide(index - 1);
      }
      if (nextBtn) nextBtn.addEventListener('click', nextSlide);
      if (prevBtn) prevBtn.addEventListener('click', prevSlide);
      function startAutoplay() {
        autoplay = setInterval(nextSlide, 3000);
      }
      function stopAutoplay() {
        clearInterval(autoplay);
      }
      track.addEventListener('mouseenter', stopAutoplay);
      track.addEventListener('mouseleave', startAutoplay);
      track.addEventListener('transitionend', () => {
        if (allSlides[index].id === 'first-clone') {
          track.style.transition = 'none';
          index = 1;
          track.style.transform = `translateX(-${index * size}%)`;
        }
        if (allSlides[index].id === 'last-clone') {
          track.style.transition = 'none';
          index = total - 2;
          track.style.transform = `translateX(-${index * size}%)`;
        }
      });
      startAutoplay();
    }
  }

  // ---------------- POPUPS (genérico) ----------------
  const popups = document.querySelectorAll('.popup-container');
  if (popups.length) {
    popups.forEach(container => {
      const popup = container.querySelector('.popup');
      if (!popup) return;
      popup.addEventListener('click', e => e.stopPropagation());
      container.addEventListener('click', e => {
        e.stopPropagation();
        popups.forEach(c => {
          if (c !== container) {
            const p = c.querySelector('.popup');
            if (!p) return;
            p.classList.remove('active');
            const fIniciar = p.querySelector('.form-iniciar');
            const fRegistrar = p.querySelector('.form-registrar');
            if (fIniciar) fIniciar.reset();
            if (fRegistrar) fRegistrar.reset();
            const opciones = p.querySelector('.usuario-opciones');
            if (opciones) opciones.style.display = 'flex';
            if (fIniciar) fIniciar.style.display = 'none';
            if (fRegistrar) fRegistrar.style.display = 'none';
          }
        });
        popup.classList.toggle('active');
      });
    });
    document.addEventListener('click', () => {
      popups.forEach(c => {
        const popup = c.querySelector('.popup');
        if (!popup) return;
        popup.classList.remove('active');
        const fIniciar = popup.querySelector('.form-iniciar');
        const fRegistrar = popup.querySelector('.form-registrar');
        if (fIniciar) fIniciar.reset();
        if (fRegistrar) fRegistrar.reset();
        const opciones = popup.querySelector('.usuario-opciones');
        if (opciones) opciones.style.display = 'flex';
        if (fIniciar) fIniciar.style.display = 'none';
        if (fRegistrar) fRegistrar.style.display = 'none';
      });
    });
  }

  // ---------------- POPUP USUARIO (Navegación interna) ----------------
const mainPopupUsuario = document.querySelector('.contenido-usuario');
if (mainPopupUsuario) {
  const btnIniciar = mainPopupUsuario.querySelector('.btn-iniciar');
  const btnRegistrar = mainPopupUsuario.querySelector('.btn-registrar');
  const formIniciar = mainPopupUsuario.querySelector('.form-iniciar');
  const formRegistrar = mainPopupUsuario.querySelector('.form-registrar');
  const volverBtns = mainPopupUsuario.querySelectorAll('.volver');
  const btnAdmin = mainPopupUsuario.querySelector('.btn-admin'); // <-- AÑADIDO

  if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
      mainPopupUsuario.querySelector('.usuario-opciones').style.display = 'none';
      if (btnAdmin) btnAdmin.style.display = 'none'; // <-- AÑADIDO
      formIniciar.style.display = 'flex';
    });
  }

  if (btnRegistrar) {
    btnRegistrar.addEventListener('click', () => {
      mainPopupUsuario.querySelector('.usuario-opciones').style.display = 'none';
      if (btnAdmin) btnAdmin.style.display = 'none'; // <-- AÑADIDO
      formRegistrar.style.display = 'flex';
    });
  }

  volverBtns.forEach(p => {
    p.addEventListener('click', () => {
      formIniciar.style.display = 'none';
      formRegistrar.style.display = 'none';
      mainPopupUsuario.querySelector('.usuario-opciones').style.display = 'flex';
      if (btnAdmin) btnAdmin.style.display = 'block'; // <-- AÑADIDO
      formIniciar.reset();
      formRegistrar.reset();
    });
  });
}

  // --------------- LÓGICA DE AUTENTICACIÓN DE CLIENTE ---------------
  const popupUsuario = document.querySelector('.contenido-usuario');
  const userDisplay = document.querySelector('.nombre-usuario');
  const userOptions = popupUsuario.querySelector('.usuario-opciones');
  const adminLoginBtn = popupUsuario.querySelector('.btn-admin');
  const formIniciar = popupUsuario.querySelector('.form-iniciar');
  const formRegistrar = popupUsuario.querySelector('.form-registrar');

  const actualizarVistaUsuario = () => {
    const userData = JSON.parse(localStorage.getItem('maxiUser'));
    if (userData && userData.token) {
      userDisplay.textContent = `Hola, ${userData.user.nombre}`;
      if (userOptions) userOptions.style.display = 'none';
      if (adminLoginBtn) adminLoginBtn.style.display = 'none';
      let loggedInMenu = popupUsuario.querySelector('.usuario-logueado');
      if (!loggedInMenu) {
        loggedInMenu = document.createElement('div');
        loggedInMenu.className = 'usuario-logueado';
        loggedInMenu.innerHTML = `<button class="btn-cerrar-sesion" style="width: 100%; padding: 12px; border-radius: 15px; border: none; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; font-weight: 600; cursor: pointer;">Cerrar Sesión</button>`;
        popupUsuario.appendChild(loggedInMenu);
        loggedInMenu.querySelector('.btn-cerrar-sesion').addEventListener('click', () => {
          localStorage.removeItem('maxiUser');
          window.location.reload();
        });
      }
      loggedInMenu.style.display = 'block';
    } else {
      userDisplay.textContent = 'Usuario';
      if (userOptions) userOptions.style.display = 'flex';
      if (adminLoginBtn) adminLoginBtn.style.display = 'block';
      const loggedInMenu = popupUsuario.querySelector('.usuario-logueado');
      if (loggedInMenu) loggedInMenu.style.display = 'none';
    }
  };

  if (formIniciar) {
    formIniciar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = formIniciar.querySelector('input[name="email"]').value;
      const password = formIniciar.querySelector('input[name="password"]').value;
      try {
        const response = await fetch('/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('maxiUser', JSON.stringify(data));
          actualizarVistaUsuario();
          const popupContainer = formIniciar.closest('.popup');
          if(popupContainer) popupContainer.classList.remove('active');
        } else {
          alert(data.error || 'Error al iniciar sesión');
        }
      } catch (err) {
        alert('Error de conexión. Inténtalo de nuevo.');
      }
    });
  }
  
 if (formRegistrar) {
    formRegistrar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = formRegistrar.querySelector('input[name="password"]').value;
      const passwordConfirm = formRegistrar.querySelector('input[name="password_confirm"]').value;

      // Validación de contraseñas con SweetAlert2
      if (password !== passwordConfirm) {
        Swal.fire({
            icon: 'error',
            title: 'Las contraseñas no coinciden',
            text: 'Por favor, verifica que ambas contraseñas sean iguales.',
            background: '#232b38',
            color: '#ffffff',
            confirmButtonColor: '#667eea'
        });
        return;
      }

      const formData = new FormData(formRegistrar);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch('/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();

        if (response.ok) {
          // Mensaje de éxito con SweetAlert2
          Swal.fire({
              icon: 'success',
              title: '¡Registro exitoso!',
              text: 'Ahora puedes iniciar sesión con tu nueva cuenta.',
              background: '#232b38',
              color: '#ffffff',
              confirmButtonColor: '#667eea'
          }).then(() => {
              // Redirige al usuario al formulario de login después de registrarse
              formRegistrar.style.display = 'none';
              formIniciar.style.display = 'flex';
              formRegistrar.reset();
          });
        } else {
          // Mensaje de error desde el servidor con SweetAlert2
          Swal.fire({
              icon: 'error',
              title: 'Error en el registro',
              text: result.error || 'Ocurrió un problema. Por favor, intenta de nuevo.',
              background: '#232b38',
              color: '#ffffff',
              confirmButtonColor: '#667eea'
          });
        }
      } catch (err) {
        // Mensaje de error de conexión con SweetAlert2
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No pudimos comunicarnos con el servidor. Por favor, revisa tu conexión a internet.',
            background: '#232b38',
            color: '#ffffff',
            confirmButtonColor: '#667eea'
        });
      }
    });
  }

  // --------------- CARRITO & FAVORITOS ---------------
  const contadorCarrito = document.querySelector('.contador');
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  let favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];

  const fmt = n => (typeof n === 'number' ? n : parseFloat(n || 0)).toLocaleString('es-SV', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  });

  function updateCounter() {
    if (!contadorCarrito) return;
    const total = carrito.reduce((acc, it) => acc + (parseInt(it.cantidad, 10) || 0), 0);
    contadorCarrito.textContent = String(total);
  }

  function saveCart() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
    updateCounter();
    renderCart();
  }

  function saveFavs() {
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
    renderFavorites();
    syncHeartStates();
  }

  function addToCart({ id, nombre, precio, cantidad = 1, imagen }) {
    if (!id || !nombre || isNaN(precio)) return;
    const existente = carrito.find(p => p.id === id);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      carrito.push({ id, nombre, precio, cantidad, imagen });
    }
    saveCart();
  }

  // --- FUNCIÓN COMPLETA Y CORREGIDA PARA EL CARRITO ---
  function renderCart() {
    const contenedor = document.querySelector('.contenido-carrito');
    if (!contenedor) return;

    let total = 0;
    let itemsHTML = '';

    if (carrito.length === 0) {
        itemsHTML = '<p style="text-align: center; color: #a7b0c9;">Tu carrito está vacío.</p>';
    } else {
        carrito.forEach((item) => {
            const subtotal = (item.precio || 0) * (item.cantidad || 0);
            total += subtotal;
            itemsHTML += `
                <div class="carrito-item" data-id="${item.id}">
                    <img src="${item.imagen || '/IMG/placeholder.png'}" alt="${item.nombre}">
                    <div class="item-info">
                        <span class="nombre">${item.nombre}</span>
                        <span class="cantidad">Cantidad: ${item.cantidad}</span>
                        <span class="precio">${fmt(subtotal)}</span>
                    </div>
                    <button class="eliminar" aria-label="Eliminar">✕</button>
                </div>
            `;
        });
    }

    contenedor.innerHTML = `
        <h4>Tu Carrito</h4>
        <div class="carrito-items">${itemsHTML}</div>
        <div class="total">
            <span>Total:</span>
            <span class="monto">${fmt(total)}</span>
        </div>
        <button class="btn-checkout">Ir al Checkout</button>
        <p class="vaciar-carrito">Vaciar Carrito</p>
    `;

    contenedor.querySelectorAll('.eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemId = btn.closest('.carrito-item').dataset.id;
            const itemIndex = carrito.findIndex(p => p.id == itemId);
            if (itemIndex > -1) {
                carrito.splice(itemIndex, 1);
                saveCart();
            }
        });
    });

    const vaciarBtn = contenedor.querySelector('.vaciar-carrito');
    if (vaciarBtn) {
        vaciarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            Swal.fire({
                title: '¿Estás seguro?',
                text: "No podrás revertir esta acción.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#667eea',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, ¡vaciar!',
                cancelButtonText: 'Cancelar',
                background: '#232b38',
                color: '#ffffff'
            }).then((result) => {
                if (result.isConfirmed) {
                    carrito = [];
                    saveCart();
                    Swal.fire({
                        title: '¡Vaciado!',
                        text: 'Tu carrito ha sido vaciado.',
                        icon: 'success',
                        background: '#232b38',
                        color: '#ffffff',
                        confirmButtonColor: '#667eea'
                    });
                }
            });
        });
    }

    const checkoutBtn = contenedor.querySelector('.btn-checkout');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (carrito.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Tu carrito está vacío',
                    text: 'Añade productos a tu carrito antes de proceder al pago.',
                    confirmButtonColor: '#667eea',
                    background: '#232b38',
                    color: '#ffffff'
                });
                return;
            }
            window.location.href = '/HTML/checkout.html';
        });
    }
  }

  // --- FUNCIÓN COMPLETA Y CORREGIDA PARA FAVORITOS ---
  function renderFavorites() {
    const contenedor = document.querySelector('.contenido-favorito');
    if (!contenedor) return;

    contenedor.innerHTML = '<h4>Favoritos</h4>';

    if (favoritos.length === 0) {
        contenedor.innerHTML += '<p>No tienes productos favoritos aún.</p>';
        return;
    }

    const lista = document.createElement('div');
    lista.className = 'carrito-items'; 

    favoritos.forEach((fav, idx) => {
        const item = document.createElement('div');
        item.className = 'carrito-item'; 
        
        item.innerHTML = `
            <img src="${fav.imagen || '/IMG/placeholder.png'}" alt="${fav.nombre}">
            <div class="item-info">
                <span class="nombre">${fav.nombre}</span>
                <span class="precio">${fmt(fav.precio)}</span>
            </div>
            <div class="favorito-acciones">
                <button class="btn-accion-fav pasar-carrito">Agregar</button>
                <button class="eliminar" aria-label="Eliminar">✕</button>
            </div>
        `;

        item.querySelector('.pasar-carrito').addEventListener('click', e => {
            e.stopPropagation();
            addToCart({ id: fav.id, nombre: fav.nombre, precio: fav.precio, cantidad: 1, imagen: fav.imagen });
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Agregado al carrito',
                showConfirmButton: false,
                timer: 1500,
                background: '#232b38',
                color: '#ffffff'
            });
        });

        item.querySelector('.eliminar').addEventListener('click', e => {
            e.stopPropagation();
            favoritos.splice(idx, 1);
            saveFavs();
        });

        lista.appendChild(item);
    });

    contenedor.appendChild(lista);
  }

  function syncHeartStates() {
    document.querySelectorAll('.product-card .favorito').forEach(h => {
      const card = h.closest('.product-card');
      const nombre = card?.dataset?.name;
      if (!nombre) return;
      if (favoritos.some(f => f.nombre === nombre)) {
        h.classList.add('active');
        h.style.color = '#ff0000';
      } else {
        h.classList.remove('active');
        h.style.color = '#ff6b6b';
      }
    });
  }

  document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.closest('.favorito')) {
      e.stopPropagation();
      const card = target.closest('.product-card');
      if (!card) return;
      const id = parseInt(card.dataset.id, 10);
      const nombre = card.dataset.name;
      const precio = parseFloat(card.dataset.price || '0');
      const imagen = card.querySelector('img')?.src;
      const idx = favoritos.findIndex(f => f.id === id);
      if (idx >= 0) {
        favoritos.splice(idx, 1);
      } else {
        favoritos.push({ id, nombre, precio, imagen });
      }
      saveFavs();
    } else if (target.closest('.agregar-btn')) {
      e.stopPropagation();
      const card = target.closest('.product-card');
      if (!card) return;
      const id = parseInt(card.dataset.id, 10);
      const nombre = card.dataset.name;
      const precio = parseFloat(card.dataset.price || '0');
      const imagen = card.querySelector('img')?.src;
      const cantidad = Math.max(1, parseInt(card.querySelector('.cantidad')?.value || '1', 10));
      addToCart({ id, nombre, precio, cantidad, imagen });
      Swal.fire({ // Reemplazando el alert() por SweetAlert2
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `${cantidad} ${nombre} agregado(s)`,
          showConfirmButton: false,
          timer: 2000,
          background: '#232b38',
          color: '#ffffff'
      });
    }
  });

  document.addEventListener('productosCargados', () => {
    syncHeartStates();
  });

  // ----- Inicialización -----
  updateCounter();
  renderCart();
  renderFavorites();
  syncHeartStates();
  actualizarVistaUsuario();
});

// ---------------- BARRA DE BÚSQUEDA ----------------
const searchInput = document.querySelector('.barra-busqueda');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase().trim();
    document.querySelectorAll('.product-card').forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      if (name.includes(term)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// === LÓGICA PARA LA MARQUESINA CON MENSAJES DINÁMICOS ===

document.addEventListener('DOMContentLoaded', () => {
    const marquesinaP = document.querySelector('.marquesina p');

    // Si no existe el elemento, no hacemos nada
    if (!marquesinaP) {
        return;
    }

    // Aquí puedes poner todos los mensajes que quieras mostrar
    const mensajes = [
        "🌟 ¡Precios bajos todos los días!",
        "🚚 ¡Envío gratis en pedidos desde $5!",
        "💳 Aceptamos todas las tarjetas de crédito y débito"
    ];

    let mensajeActualIndex = 0;

    // Función para cambiar el mensaje con efecto de desvanecimiento
    function cambiarMensaje() {
        // Desvanecer el texto actual
        marquesinaP.style.opacity = '0';

        setTimeout(() => {
            // Cambiar al siguiente mensaje
            mensajeActualIndex = (mensajeActualIndex + 1) % mensajes.length;
            marquesinaP.textContent = mensajes[mensajeActualIndex];

            // Aparecer el nuevo texto
            marquesinaP.style.opacity = '1';
        }, 500); // 0.5 segundos para la transición
    }

    // Iniciar el ciclo de cambio de mensajes cada 5 segundos
    setInterval(cambiarMensaje, 5000);
});

// ==================================================================
// NUEVO: LÓGICA PARA CARGAR PRODUCTOS EN PÁGINAS DE CATEGORÍA
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Identificamos en qué página de categoría estamos
    const productosContainer = document.getElementById('productos-container');
    if (!productosContainer) {
        // Si no hay un contenedor de productos, no estamos en una página de categoría.
        return; 
    }

    let categoriaAPI = '';
    // Revisamos la URL para saber qué productos cargar
    if (window.location.pathname.includes('/Electronica/')) {
        categoriaAPI = 'electronica';
    } else if (window.location.pathname.includes('/Limpieza/')) {
        categoriaAPI = 'limpieza';
    } else if (window.location.pathname.includes('/Hogar/')) {
        categoriaAPI = 'hogar';
    }

    // Si no identificamos una categoría, no hacemos nada.
    if (!categoriaAPI) {
        return;
    }

    // 2. Definimos la función para crear la tarjeta (la misma que ya tenías)
    function crearTarjetaDeProducto(producto) {
        const precioNumero = parseFloat(producto.precio);
        const precioAnteriorNumero = parseFloat(producto.precio_anterior);
        const precioAntiguo = precioAnteriorNumero > 0 ? `<span class="old-price">$${precioAnteriorNumero.toFixed(2)}</span>` : '';
        const descuento = producto.descuento > 0 ? `<span class="discount">-${producto.descuento}%</span>` : '';
        return `
            <div class="product-card" data-id="${producto.id}" data-name="${producto.nombre}" data-price="${precioNumero.toFixed(2)}">
                <div class="product-image-container">
                    <span class="favorito">❤</span>
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                    ${descuento}
                </div>
                <div class="product-details">
                    <h3>${producto.nombre}</h3>
                    <p class="price">$${precioNumero.toFixed(2)} ${precioAntiguo}</p>
                </div>
                <div class="product-actions">
                    <input type="number" class="cantidad" value="1" min="1">
                    <button class="agregar-btn">Agregar</button>
                </div>
            </div>
        `;
    }

    // 3. Definimos la función para cargar los productos desde la API
    async function cargarProductosDeCategoria() {
        try {
            const response = await fetch(`/api/productos/${categoriaAPI}`);
            if (!response.ok) throw new Error('Error al cargar productos');
            
            const productos = await response.json();
            
            if (productos.length === 0) {
                productosContainer.innerHTML = '<p>No hay productos en esta categoría.</p>';
            } else {
                productosContainer.innerHTML = productos.map(crearTarjetaDeProducto).join('');
            }
            // Disparamos el evento para que los corazones de favoritos se actualicen
            document.dispatchEvent(new CustomEvent('productosCargados'));
        } catch (error) {
            console.error('Error:', error);
            productosContainer.innerHTML = '<p>No se pudieron cargar los productos.</p>';
        }
    }

    // 4. Llamamos a la función para que se ejecute
    cargarProductosDeCategoria();
});