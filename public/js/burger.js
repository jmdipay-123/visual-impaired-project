// Enhanced Burger Menu Script with improved UX
(function() {
  'use strict';

  // Get DOM elements
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.getElementById("navMenu");
  const body = document.body;
  const menuIcon = menuToggle.querySelector("i");

  // Track menu state
  let isMenuOpen = false;

  // Toggle menu function
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    
    // Toggle classes
    navMenu.classList.toggle("show");
    menuToggle.classList.toggle("active");
    
    // Change icon with animation
    if (isMenuOpen) {
      menuIcon.classList.remove("fa-bars");
      menuIcon.classList.add("fa-times");
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Close navigation menu");
      
      // Prevent body scroll when menu is open (optional)
      // body.style.overflow = 'hidden';
    } else {
      menuIcon.classList.remove("fa-times");
      menuIcon.classList.add("fa-bars");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
      
      // Restore body scroll
      // body.style.overflow = '';
    }
  }

  // Close menu function
  function closeMenu() {
    if (isMenuOpen) {
      toggleMenu();
    }
  }

  // Event Listeners
  
  // Toggle menu on button click
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking a nav link
  const navLinks = navMenu.querySelectorAll("a");
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (isMenuOpen && !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
      closeMenu();
    }
  });

  // Close menu on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen) {
      closeMenu();
    }
  });

  // Handle window resize - close menu when resizing to desktop
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768 && isMenuOpen) {
        closeMenu();
      }
    }, 250);
  });

  // Smooth scroll for anchor links (if any)
  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    }
  });

  // Feature card navigation (if data-target attribute exists)
  const featureCards = document.querySelectorAll(".feature-card");
  featureCards.forEach(card => {
    const target = card.getAttribute("data-target");
    
    if (target) {
      // Make cards keyboard accessible
      card.addEventListener("click", () => {
        navigateToSection(target);
      });
      
      // Add keyboard support
      card.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigateToSection(target);
        }
      });
    }
  });

  // Navigate to section function
  function navigateToSection(target) {
    if (target === "detect") {
      const detectSection = document.getElementById("detect");
      if (detectSection) {
        detectSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    } else if (target === "information") {
      // Navigate to information page
      window.location.href = "./information.html";
    }
  }

  // Add loading state to buttons (optional enhancement)
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach(button => {
    button.addEventListener("click", function() {
      if (!this.disabled && !this.classList.contains("loading")) {
        // Add subtle feedback
        this.style.transform = "scale(0.98)";
        setTimeout(() => {
          this.style.transform = "";
        }, 150);
      }
    });
  });

  // Initialize ARIA attributes
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  navMenu.setAttribute("role", "navigation");
  navMenu.setAttribute("aria-label", "Main navigation");

})();