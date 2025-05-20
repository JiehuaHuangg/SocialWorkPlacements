document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
                
                // Update URL without scrolling
                history.pushState(null, null, targetId);
            }
        });
    });
    
    // Highlight active section in TOC based on scroll position
    const sections = document.querySelectorAll('.manual-section');
    const tocLinks = document.querySelectorAll('.toc-list a');
    
    function highlightActiveTocItem() {
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const scrollPosition = window.scrollY;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = '#' + section.getAttribute('id');
            }
        });
        
        tocLinks.forEach(link => {
            link.classList.remove('fw-bold', 'text-primary');
            if (link.getAttribute('href') === currentSection) {
                link.classList.add('fw-bold', 'text-primary');
            }
        });
    }
    
    window.addEventListener('scroll', highlightActiveTocItem);
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const bootstrap = window.bootstrap; // Declare the bootstrap variable
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Weight slider functionality
    const weightSlider = document.querySelector('.weight-slider-container input[type="range"]');
    const locationWeightValue = document.querySelectorAll('.slider-value')[0];
    const sectorWeightValue = document.querySelectorAll('.slider-value')[1];
    
    if (weightSlider) {
        weightSlider.addEventListener('input', function() {
            const locationWeight = this.value;
            const sectorWeight = 100 - locationWeight;
            
            locationWeightValue.textContent = locationWeight + '%';
            sectorWeightValue.textContent = sectorWeight + '%';
        });
    }
    
    // Add active class to current nav item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
    
    // Back to top button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    backToTopBtn.className = 'back-to-top-btn';
    backToTopBtn.setAttribute('title', 'Back to top');
    document.body.appendChild(backToTopBtn);
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    // Add styles for back to top button
    const style = document.createElement('style');
    style.textContent = `
        .back-to-top-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #27358C;
            color: white;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        .back-to-top-btn.show {
            opacity: 1;
            visibility: visible;
        }
        
        .back-to-top-btn:hover {
            background-color: #1e2a6e;
            transform: translateY(-3px);
        }
    `;
    document.head.appendChild(style);
});