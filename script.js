document.addEventListener('DOMContentLoaded', () => {
    const CORRECT_PASSWORD = "fantasticmrfox";

    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const loginError = document.getElementById('login-error');

    const iconCircle = document.createElement('div');
    iconCircle.className = 'icon-shape circle';
    const iconLine = document.createElement('div');
    iconLine.className = 'icon-shape line';
    togglePasswordBtn.appendChild(iconCircle);
    togglePasswordBtn.appendChild(iconLine);
    togglePasswordBtn.classList.add('is-hidden');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === CORRECT_PASSWORD) {
            window.location.href = "attendance.html";
        } else {
            loginError.classList.add('visible');
            setTimeout(() => {
                loginError.classList.remove('visible');
            }, 3000);
        }
    });

    togglePasswordBtn.addEventListener('click', () => {
        const isPasswordHidden = passwordInput.type === 'password';
        if (isPasswordHidden) {
            passwordInput.type = 'text';
            togglePasswordBtn.classList.remove('is-hidden');
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.classList.add('is-hidden');
        }
    });
});