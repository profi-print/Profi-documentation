// Простая страница платежей может быть создана вами позже.
// Эти функции используются в актах сверки и могут быть вызваны из любого места.
function addPayment(clientId, date, amount, description) {
    const payment = {
        id: generateId(),
        clientId,
        date: date || getCurrentDate(),
        amount: parseFloat(amount) || 0,
        description: description || ''
    };
    Storage.savePayment(payment);
    return payment;
}

function getClientPayments(clientId) {
    return Storage.getPayments().filter(p => p.clientId === clientId);
}

// Для ручного ввода платежа можно использовать быстрое модальное окно,
// но это уже часть UI, которую вы можете реализовать при создании страницы payments.html.