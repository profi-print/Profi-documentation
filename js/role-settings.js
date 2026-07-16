(function (global) {
  function currentRole() {
    try { return sessionStorage.getItem('profitprint_role') || 'default'; }
    catch (e) { return 'default'; }
  }
  function scopedKey(baseKey, role) {
    return baseKey + '::' + (role || currentRole());
  }
  global.PPSettings = {
    // Ключ с привязкой к роли (на случай, если понадобится напрямую)
    scopedKey: function (baseKey, role) { return scopedKey(baseKey, role); },
 
    // true/false для текущей (или указанной) роли, с откатом на старую общую настройку
    get: function (baseKey, role) {
      var v = localStorage.getItem(scopedKey(baseKey, role));
      if (v === 'true') return true;
      if (v === 'false') return false;
      return localStorage.getItem(baseKey) === 'true'; // обратная совместимость
    },
 
    // Сохранить настройку для текущей (или указанной) роли
    set: function (baseKey, value, role) {
      localStorage.setItem(scopedKey(baseKey, role), value ? 'true' : 'false');
    },
 
    currentRole: currentRole
  };
})(window);