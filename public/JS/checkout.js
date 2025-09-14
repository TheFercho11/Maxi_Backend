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

    function renderShippingDetails(isEditing = false) {
        if (isEditing) {
            shippingDetailsContainer.innerHTML = `
                <div class="shipping-field"><strong>Nombre:</strong> <span>${userData.user.nombre}</span></div>
                <div class="shipping-field"><strong>Email:</strong> <span>${userData.user.email}</span></div>
                <div class="shipping-field"><strong>Teléfono:</strong><input type="tel" id="shipping-telefono" value="${userData.user.telefono || ''}"></div>
                <div class="shipping-field"><strong>Ciudad:</strong><input type="text" id="shipping-ciudad" value="${userData.user.ciudad || ''}"></div>
                <div class="shipping-field"><strong>Dirección:</strong><textarea id="shipping-direccion" rows="3">${userData.user.direccion || ''}</textarea></div>`;
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
            userData.user.telefono = newDetails.telefono;
            userData.user.ciudad = newDetails.ciudad;
            userData.user.direccion = newDetails.direccion;
            localStorage.setItem('maxiUser', JSON.stringify(userData));
            renderShippingDetails(false);
            actionsContainer.classList.add('hidden');
            editButton.classList.remove('hidden');
            alert('¡Información de envío actualizada exitosamente!');
        } catch (error) {
            alert('Hubo un error al guardar los cambios.');
        }
    });

    let total = 0;
    document.getElementById('cart-summary').innerHTML = cart.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `<div class="cart-item-summary"><img src="${item.imagen}" alt="${item.nombre}"><div class="info"><span class="name">${item.nombre} (x${item.cantidad})</span></div><span class="price">$${subtotal.toFixed(2)}</span></div>`;
    }).join('');
    document.getElementById('total-amount').textContent = `$${total.toFixed(2)}`;

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