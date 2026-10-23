document.addEventListener('DOMContentLoaded', () => {
    // Handle Sidebar Navigation Clicks
    const navItems = document.querySelectorAll('.nav-links li');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            console.log(`Navigating to: ${item.textContent.trim()}`);
        });
    });

    // Simple Search Functionality
    const searchInput = document.querySelector('.search-bar');
    searchInput.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.card');

        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'block' : 'none';
        });
    });
});