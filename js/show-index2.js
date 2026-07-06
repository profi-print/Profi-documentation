// Показывает ссылку на index2.html только для роли designer
(function(){
  try {
    const role = sessionStorage.getItem('profitprint_role');
    const user = sessionStorage.getItem('profitprint_user');
    if (!user || !role) return;
    if (role !== 'designer') return;

    const nav = document.querySelector('.nav-menu');
    if (nav) {
      // Проверим, не добавлена ли уже
      if (!nav.querySelector('a[href="index2.html"]')) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="index2.html">🎨 Дизайнер</a>';
        nav.appendChild(li);
      }
    }
  } catch (e) {
    console.error('show-index2 error', e);
  }
})();
