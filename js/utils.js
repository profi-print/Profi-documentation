// Генератор уникальных ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Форматирование суммы в UZS
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('ru-RU') + ' UZS';
}

// Безопасный вывод HTML
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Текущая дата в формате YYYY-MM-DD
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Прибавить дни к дате
function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// Парсинг даты
function parseDate(str) {
    return new Date(str);
}

// Форматирование даты в читаемый вид (ДД.ММ.ГГГГ)
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = parseDate(dateStr);
    return d.toLocaleDateString('ru-RU');
}

// ===== НОВОЕ: превращает все <input type="date"> в текстовые с маской ДД.ММ.ГГГГ =====
function initDateFields() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        // Меняем тип на текст
        input.type = 'text';
        input.placeholder = 'ДД.ММ.ГГГГ';
        input.style.textAlign = 'center';

        // Если уже есть значение в формате ISO, конвертируем
        if (input.value && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
            const parts = input.value.split('-');
            input.value = `${parts[2]}.${parts[1]}.${parts[0]}`;
            input.setAttribute('data-date-iso', input.value);
        }

        // Улучшенная маска – точки появляются сразу
        input.addEventListener('input', function(e) {
            let val = this.value.replace(/\D/g, ''); // только цифры
            if (val.length > 8) val = val.substring(0, 8);
            let formatted = '';
            if (val.length >= 1) {
                formatted += val.substring(0, 2);
            }
            if (val.length >= 3) {
                formatted += '.' + val.substring(2, 4);
            }
            if (val.length >= 5) {
                formatted += '.' + val.substring(4, 8);
            }
            this.value = formatted;
        });

        // Проверка при уходе из поля
        input.addEventListener('blur', function() {
            const val = this.value.trim();
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
                const [d, m, y] = val.split('.');
                const day = parseInt(d, 10), month = parseInt(m, 10), year = parseInt(y, 10);
                if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 2020 && year <= 2100) {
                    this.setAttribute('data-date-iso', `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
                    this.style.borderColor = '';
                } else {
                    this.setAttribute('data-date-iso', '');
                    this.style.borderColor = 'red';
                }
            } else if (val.length > 0) {
                this.setAttribute('data-date-iso', '');
                this.style.borderColor = 'red';
            } else {
                this.setAttribute('data-date-iso', '');
                this.style.borderColor = '';
            }
        });

        // Дополнительные методы для кода
        input.getISODate = function() {
            return this.getAttribute('data-date-iso') || '';
        };
        input.setISODate = function(iso) {
            if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                const [y, m, d] = iso.split('-');
                this.value = `${d}.${m}.${y}`;
                this.setAttribute('data-date-iso', iso);
                this.style.borderColor = '';
            } else {
                this.value = '';
                this.setAttribute('data-date-iso', '');
            }
        };
    });
}