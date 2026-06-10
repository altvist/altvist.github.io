document.addEventListener('DOMContentLoaded', () => {
    // Close menu
    function closeMenu() {
        menuButtons.classList.remove('opened');
        dropDownMenu.classList.remove('opened');
        dimmedLayer.classList.remove('show');
        document.body.classList.remove('frozen');
    }
    // Find menu elements
    let menuButtons = document.getElementById('menu-buttons');
    let dropDownMenu = document.getElementById('dropdown-menu');
    let dimmedLayer = document.getElementById('dimmed');
    // On menu button click
    menuButtons.addEventListener('click', () => {
        menuButtons.classList.toggle('opened');
        dropDownMenu.classList.toggle('opened');
        dimmedLayer.classList.toggle('show');
        document.body.classList.toggle('frozen');
    });
    // On body resize
    let resizeTimeout;
    let ready = true;
    let lastWidth = document.body.clientWidth;
    window.addEventListener('resize', () => {
        if (!ready) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout( () => {
                ready = true;
            }, 200);
        } else {
            closeMenu();
            ready = false;
        }
    });
    // On orientation change
    screen.orientation.addEventListener('change', () => {
        closeMenu();
    });
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener('change', (e) => {
        closeMenu();
    });
    // On dropdown menu item click, close the menu
    document.querySelectorAll('#dropdown-menu').forEach( (e) => {
        e.addEventListener('click', () => {
            closeMenu();
        });
    });
    // On dimmed area click
    dimmedLayer.addEventListener('click', () => {
        closeMenu();
    });
});