let isLoading = false;

        document.getElementById('login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (isLoading) return;
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validaciones básicas
            if (!email || !password) {
                showAlert('Por favor, completa todos los campos', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showAlert('Por favor, ingresa un correo válido', 'error');
                return;
            }
            
            await login(email, password);
        });

      
// Reemplaza la función login con esta nueva versión
async function login(email, password) {
    setLoading(true);
    hideAlert();

    try {
        // CORRECCIÓN: Apuntar a la ruta de admin en lugar de la de cliente
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login exitoso
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));

            showAlert('Login exitoso. Redirigiendo...', 'success');

            // Redirigir al panel de administración
            setTimeout(() => {
                // CORRECCIÓN: Redirigir a la página correcta del panel
                window.location.href = '/HTML/Panel Administracion.html'; 
            }, 1000);

        } else {
            // Login fallido
            showAlert(data.error || 'Error en las credenciales', 'error');
            setLoading(false);
        }

    } catch (error) {
        console.error('Error en login:', error);
        showAlert('Error inesperado. Inténtalo nuevamente.', 'error');
        setLoading(false);
    }
}


        function setLoading(loading) {
            isLoading = loading;
            const btn = document.getElementById('login-btn');
            const btnText = document.getElementById('btn-text');
            
            if (loading) {
                btn.disabled = true;
                btnText.innerHTML = '<span class="loading"></span>Iniciando sesión...';
            } else {
                btn.disabled = false;
                btnText.textContent = 'Iniciar Sesión';
            }
        }

        function showAlert(message, type) {
            const alert = document.getElementById('alert');
            alert.textContent = message;
            alert.className = `alert alert-${type}`;
            alert.style.display = 'block';
            
            // Auto-hide después de 5 segundos para mensajes de error
            if (type === 'error') {
                setTimeout(hideAlert, 5000);
            }
        }

        function hideAlert() {
            const alert = document.getElementById('alert');
            alert.style.display = 'none';
        }

        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleBtn = document.querySelector('.password-toggle');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = '👁️';
            }
        }

        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        function showForgotPassword() {
            alert('Para recuperar tu contraseña, contacta al administrador del sistema.\nTeléfono: +503 7593-2214\nEmail: soporte@maxidespensa.com');
        }

        // Verificar si ya está logueado al cargar la página
        document.addEventListener('DOMContentLoaded', function() {
            const token = localStorage.getItem('adminToken');
            const user = localStorage.getItem('adminUser');
            
            if (token && user) {
                try {
                    const userData = JSON.parse(user);
                    if (userData.rol === 'administrador') {
                        // Ya está logueado como admin, redirigir
                        window.location.href = '/HTML/Panel Administracion.html';
                        return;
                    }
                } catch (e) {
                    // Token inválido, limpiar
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminUser');
                }
            }
            
            // Focus automático en el campo email
            document.getElementById('email').focus();
        });

        // Manejo de tecla Enter en los campos
        document.getElementById('email').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('password').focus();
            }
        });

        // Prevenir envío múltiple del formulario
        let formSubmitted = false;
        document.getElementById('login-form').addEventListener('submit', function(e) {
            if (formSubmitted) {
                e.preventDefault();
                return false;
            }
            formSubmitted = true;
            
            // Resetear después de 3 segundos
            setTimeout(() => {
                formSubmitted = false;
            }, 3000);
        });

        // Limpiar alertas cuando el usuario empieza a escribir
        document.getElementById('email').addEventListener('input', hideAlert);
        document.getElementById('password').addEventListener('input', hideAlert);