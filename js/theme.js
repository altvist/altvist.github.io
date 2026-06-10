document.addEventListener("DOMContentLoaded", () => {
    (function () {
        const DARK = 'dark';
        const LIGHT = 'light';

        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            // Mirror classes on body for backward compatibility if needed
            document.body.classList.toggle('dark-theme',  theme === DARK);
            document.body.classList.toggle('light-theme', theme === LIGHT);
            localStorage.setItem('theme', theme);
        }

        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            setTheme(current === DARK ? LIGHT : DARK);
        }

        document.querySelectorAll('.switch-theme-button').forEach( (e) => {
            e.addEventListener('click', () => {
                toggleTheme();
            });
        });

    })();
});