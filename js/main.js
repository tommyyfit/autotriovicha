  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn) menuBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });