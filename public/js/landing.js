/* ============================================
   Landing Page Interactions
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('landing-navbar');
  const navLinks = document.getElementById('nav-links');
  const heroButtons = document.getElementById('hero-buttons');

  // ── Navbar scroll effect ──
  function handleScroll() {
    if (window.scrollY > 60) {
      navbar.classList.remove('transparent');
      navbar.classList.add('solid');
    } else {
      navbar.classList.remove('solid');
      navbar.classList.add('transparent');
    }
  }
  window.addEventListener('scroll', handleScroll);
  handleScroll();

  // ── Auth-aware links ──
  if (isLoggedIn()) {
    const user = getUser();
    const dashUrl = user.role === 'owner' ? '/owner_dashboard.html' : '/worker_dashboard.html';
    navLinks.innerHTML = `
      <a href="${dashUrl}">Dashboard</a>
      <a href="#" onclick="logout();return false;">Logout</a>
    `;
    heroButtons.innerHTML = `
      <a href="${dashUrl}" class="btn btn-white btn-lg">Go to Dashboard</a>
      <a href="#how-it-works" class="btn btn-outline-white btn-lg">Learn More</a>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="/login.html">Login</a>
      <a href="/register.html">Register</a>
    `;
    heroButtons.innerHTML = `
      <a href="/register.html" class="btn btn-white btn-lg">Get Started</a>
      <a href="/login.html" class="btn btn-outline-white btn-lg">Browse Services</a>
    `;
  }

  // ── Animate on scroll (simple IntersectionObserver) ──
  const animatedEls = document.querySelectorAll('.step-card, .stat-block');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = `fadeIn 0.6s ease-out ${i * 0.1}s both`;
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  animatedEls.forEach(el => obs.observe(el));
});
