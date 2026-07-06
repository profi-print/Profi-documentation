(function() {
    const user = sessionStorage.getItem('profitprint_user');
    const role = sessionStorage.getItem('profitprint_role');
    const isDiyor = user === 'Diyor' || role === 'designer';

    if (!user) {
        window.location.replace('login.html');
        return;
    }

    if (!isDiyor) {
        window.location.replace('index.html');
    }
})();