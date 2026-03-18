// Mobile nav toggle
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', function() {
            links.classList.toggle('open');
        });

        // Close menu when a link is clicked
        links.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                links.classList.remove('open');
            });
        });
    }
});
