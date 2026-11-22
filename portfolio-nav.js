(() => {
    const header = document.getElementById('mainHeader')
    const button = document.getElementById('menuBtn')
    const menu = document.getElementById('menuContent')
    const wideScreen = matchMedia('(min-width: 1025px)')

    function setMenuOpen(open) {
        menu.classList.toggle('show', open)
        button.setAttribute('aria-expanded', String(open))
    }

    function updateHeader() {
        header.classList.toggle('scrolled', window.scrollY > 50)
    }

    button.addEventListener('click', () => setMenuOpen(!menu.classList.contains('show')))
    document.addEventListener('click', event => {
        if (!button.contains(event.target) && !menu.contains(event.target)) setMenuOpen(false)
    })
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.classList.contains('show')) {
            setMenuOpen(false)
            button.focus()
        }
    })
    wideScreen.addEventListener('change', () => {
        if (wideScreen.matches) setMenuOpen(false)
    })
    window.addEventListener('scroll', updateHeader, { passive: true })
    updateHeader()
})()
