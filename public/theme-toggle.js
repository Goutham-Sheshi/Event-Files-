// Dark mode enforcement: toggle removed
(()=>{
  try {
    localStorage.setItem('sheshi-vault-theme', 'dark');
  } catch (e) {}
  document.documentElement.dataset.theme = 'dark';
  const button = document.querySelector('.theme-toggle');
  if (button) button.remove();
})();