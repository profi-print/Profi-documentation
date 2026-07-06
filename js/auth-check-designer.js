(function() {
    const user = sessionStorage.getItem('profitprint_user');
    const role = sessionStorage.getItem('profitprint_role');
    if (!user || !role) { window.location.href = 'login.html'; return; }
    if (role !== 'designer') { window.location.href = 'index2.html'; return; }
})();