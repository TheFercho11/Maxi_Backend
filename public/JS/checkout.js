document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. Verificación y Carga de Datos ---
    const authCheckDiv = document.getElementById('auth-check');
    const checkoutGrid = document.querySelector('.checkout-grid');
    let userData = JSON.parse(localStorage.getItem('maxiUser'));
    const cart = JSON.parse(localStorage.getItem('carrito')) || [];

    if (!userData || !userData.token) {
        checkoutGrid.style.display = 'none';
       authCheckDiv.innerHTML = `<div class="auth-message"><h2>Debes iniciar sesión para comprar</h2><a href="/HTML/index.html?action=login" class="btn-login">Ir a Iniciar Sesión</a></div>`;
        return;
    }

    if (cart.length === 0) {
        checkoutGrid.style.display = 'none';
        authCheckDiv.innerHTML = `<div class="auth-message"><h2>Tu carrito está vacío</h2><a href="/HTML/index.html" class="btn-login">Volver a la Tienda</a></div>`;
        return;
    }

    checkoutGrid.style.display = 'grid';

    // --- 2. Lógica de Detalles de Envío (Edición en el lugar y guardado en BD) ---
    const shippingDetailsContainer = document.getElementById('shipping-details');
    const editButton = document.getElementById('edit-shipping-btn');
    const actionsContainer = document.getElementById('shipping-actions');
    const saveButton = document.getElementById('save-shipping-btn');
    const cancelButton = document.getElementById('cancel-edit-btn');

   // Reemplaza la función completa en checkout.js
function renderShippingDetails(isEditing = false) {
    if (isEditing) {
        // --- NUEVA ESTRUCTURA DE FORMULARIO MEJORADA ---
        shippingDetailsContainer.innerHTML = `
            <div class="shipping-edit-form">
                <div class="form-field">
                    <label for="shipping-telefono">Teléfono:</label>
                    <input type="tel" id="shipping-telefono" value="${userData.user.telefono || ''}">
                </div>
                <div class="form-field">
                    <label for="shipping-ciudad">Ciudad:</label>
                    <input type="text" id="shipping-ciudad" value="${userData.user.ciudad || ''}">
                </div>
                <div class="form-field">
                    <label for="shipping-direccion">Dirección:</label>
                    <textarea id="shipping-direccion" rows="3">${userData.user.direccion || ''}</textarea>
                </div>
            </div>
            <p><strong>Nombre:</strong> ${userData.user.nombre}</p>
            <p><strong>Email:</strong> ${userData.user.email}</p>
        `;
    } else {
        shippingDetailsContainer.innerHTML = `
            <p><strong>Nombre:</strong> ${userData.user.nombre}</p>
            <p><strong>Email:</strong> ${userData.user.email}</p>
            <p><strong>Teléfono:</strong> ${userData.user.telefono || 'No especificado'}</p>
            <p><strong>Ciudad:</strong> ${userData.user.ciudad || 'No especificada'}</p>
            <p><strong>Dirección:</strong> ${userData.user.direccion || 'No especificada'}</p>`;
    }
}
    editButton.addEventListener('click', () => {
        renderShippingDetails(true);
        editButton.classList.add('hidden');
        actionsContainer.classList.remove('hidden');
    });

    cancelButton.addEventListener('click', () => {
        renderShippingDetails(false);
        actionsContainer.classList.add('hidden');
        editButton.classList.remove('hidden');
    });

    // Reemplaza este bloque completo en checkout.js

saveButton.addEventListener('click', async () => {
    const newDetails = {
        telefono: document.getElementById('shipping-telefono').value,
        ciudad: document.getElementById('shipping-ciudad').value,
        direccion: document.getElementById('shipping-direccion').value
    };
    try {
        const response = await fetch('/api/user/shipping-details', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userData.token}` },
            body: JSON.stringify(newDetails)
        });
        if (!response.ok) throw new Error('No se pudo actualizar la información.');
        
        // Actualizamos los datos del usuario en el navegador
        userData.user.telefono = newDetails.telefono;
        userData.user.ciudad = newDetails.ciudad;
        userData.user.direccion = newDetails.direccion;
        localStorage.setItem('maxiUser', JSON.stringify(userData));
        
        // Mostramos la vista normal (no edición)
        renderShippingDetails(false);
        actionsContainer.classList.add('hidden');
        editButton.classList.remove('hidden');

        // --- REEMPLAZO DEL ALERT() ---
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: '¡Información actualizada!',
            showConfirmButton: false,
            timer: 2000, // La notificación desaparecerá después de 2 segundos
            background: '#232b38',
            color: '#ffffff'
        });

    } catch (error) {
        // Mensaje de error mejorado
        Swal.fire({
            icon: 'error',
            title: 'Hubo un error',
            text: 'No pudimos guardar los cambios. Por favor, intenta de nuevo.',
            background: '#232b38',
            color: '#ffffff',
            confirmButtonColor: '#667eea'
        });
    }
});
   // Reemplaza este bloque en checkout.js

    let total = 0;
    const cartSummaryContainer = document.getElementById('cart-summary');
    const cartSummaryMobileContainer = document.getElementById('cart-summary-mobile'); // <-- Nuevo selector para móvil

    const itemsHTML = cart.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `<div class="cart-item-summary">
                    <img src="${item.imagen}" alt="${item.nombre}">
                    <div class="info">
                        <span class="name">${item.nombre} (x${item.cantidad})</span>
                    </div>
                    <span class="price">$${subtotal.toFixed(2)}</span>
                </div>`;
    }).join('');

    // --- LA CORRECCIÓN CLAVE ---
    // Llenamos ambos contenedores (desktop y móvil) con la misma información
    if(cartSummaryContainer) cartSummaryContainer.innerHTML = itemsHTML;
    if(cartSummaryMobileContainer) cartSummaryMobileContainer.innerHTML = itemsHTML;

    // Actualizamos los totales en ambas vistas
    document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;
    document.getElementById('mobile-total-amount').textContent = `$${total.toFixed(2)}`; // <-- Nuevo actualizador para móvil

    // --- 3. Lógica de Pago (Stripe y Contra Entrega) ---
    const stripe = Stripe('pk_test_51S1Xxf2WXEgLpiM8HxC4f5JThhpBCeLzaWSYgTCIlDMzBIoXkXWtiy9uwCepQLyFYPe8SDmVHiB4rP4rwq9JsuCZ00a1vid7xj');
    let elements;
    const paymentForm = document.querySelector("#payment-form");
    const paymentElementContainer = document.querySelector("#payment-element");
    const submitButton = document.querySelector("#submit-btn");
    const buttonText = document.querySelector("#button-text");

    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            if (event.target.value === 'stripe') {
                paymentElementContainer.classList.remove('hidden');
                buttonText.textContent = "Pagar ahora";
            } else {
                paymentElementContainer.classList.add('hidden');
                buttonText.textContent = "Confirmar Pedido";
            }
        });
    });

    initializeStripe();

    async function initializeStripe() {
        try {
            const response = await fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cart }),
            });
            const { clientSecret } = await response.json();
            if (!clientSecret) { return; }
            elements = stripe.elements({ clientSecret });
            const paymentElement = elements.create("payment");
            paymentElement.mount("#payment-element");
        } catch (error) {
            console.error("Error al inicializar Stripe:", error);
        }
    }

    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked');
        
        if (!selectedPaymentMethod) {
            alert("Por favor, selecciona un método de pago.");
            return;
        }

        const paymentValue = selectedPaymentMethod.value;
        if (paymentValue === 'stripe') {
            await handleStripePayment();
        } else {
            await handleCashOnDelivery();
        }
    });

    async function handleStripePayment() {
        setLoading(true);
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required'
        });
        if (error) {
            showMessage(error.message);
            setLoading(false);
            return;
        }
        if (paymentIntent.status === "succeeded") {
            await createOrderInBackend({ paymentIntentId: paymentIntent.id });
        } else {
            showMessage("El pago no se completó.");
        }
        setLoading(false);
    }

    async function handleCashOnDelivery() {
        setLoading(true);
        await createOrderInBackend({ paymentIntentId: null });
        setLoading(false);
    }

    async function createOrderInBackend(paymentDetails) {
        try {
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userData.token}` },
                body: JSON.stringify({ cart, ...paymentDetails })
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.removeItem('carrito');
                document.querySelector('.checkout-container').innerHTML = `<div class="auth-message"><h2 style="color: #27ae60;">¡Gracias por tu compra!</h2><p>Hemos recibido tu pedido.</p><p><strong>Número de Orden:</strong> ${result.numeroOrden}</p><a href="/HTML/index.html" class="btn-login">Volver a la Tienda</a></div>`;
            } else {
                showMessage(`Error al guardar tu orden: ${result.error}`);
            }
        } catch (err) {
            showMessage('No pudimos registrar tu orden. Contacta a soporte.');
        }
    }
    
    function showMessage(messageText) {
        const messageContainer = document.querySelector("#payment-message");
        if (!messageContainer) return;
        messageContainer.classList.remove("hidden");
        messageContainer.textContent = messageText;
        setTimeout(() => { messageContainer.classList.add("hidden"); messageContainer.textContent = ''; }, 5000);
    }

    function setLoading(isLoading) {
        if (!submitButton) return;
        submitButton.disabled = isLoading;
        if (isLoading) {
            buttonText.textContent = "Procesando...";
        } else {
            const selectedRadio = document.querySelector('input[name="payment-method"]:checked');
            if (selectedRadio) {
                 buttonText.textContent = selectedRadio.value === 'stripe' ? 'Pagar ahora' : 'Confirmar Pedido';
            }
        }
    }

    renderShippingDetails(false);
});