/* ============================================
   ProfitPrint – Логика страницы "Отправка в цех"
   ============================================ */

// ---------- ТЕМА ----------
const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');

function setTheme(mode) {
  body.className = mode;
  localStorage.setItem('theme', mode);
  if (themeIcon) themeIcon.textContent = mode === 'dark' ? '☀️' : '🌙';
  if (themeLabel) themeLabel.textContent = mode === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  setTheme(saved);
})();
themeToggle.addEventListener('click', () => {
  const next = body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(next);
});

// ---------- АВТО НОМЕР ТЕХКАРТЫ ----------
function generateTechCardNo() {
  const orders = JSON.parse(localStorage.getItem('print_orders') || '[]');
  return orders.length + 1;
}
document.getElementById('techcardNo').value = generateTechCardNo();

// ---------- УСЛУГИ ----------
// Порядок изменён: Флоторезка / Резка идёт перед обычной Резкой
const SERVICE_TYPES = {
  vd_lak: ['Сплошной+Матовый','Сплошной+Глянцевый','Выборочный+Матовый','Выборочный+Глянцевый'],
  lamination: ['Глянцевый','Матовый','Золота','Серебро','Голограмма'],
  embossing: ['Золота','Серебро','Голограмма'],
  die_cut: ['автомат'],
  gluing: ['1','2','3','4 и более'],
  uv_lak: ['Сплошной+Матовый','Сплошной+Глянцевый','Выборочный+Матовый','Выборочный+Глянцевый'],
  flot_cutting: [],   // новая услуга – Флоторезка / Резка
  cutting: [],        // обычная Резка (теперь после флоторезки)
};

const SERVICE_LABELS = {
  vd_lak:'ВД лак', lamination:'Ламинация',
  embossing:'Тиснение', cutting:'Резка', gluing:'Склейка', uv_lak:'УФ лак',
  die_cut:'Высечка',
  flot_cutting:'✂️ Флоторезка / Резка'  // новый лейбл
};

function buildServicesBlock() {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = '';

  for (let key in SERVICE_TYPES) {
    const div = document.createElement('div');
    div.className = 'service-item';
    if (key === 'flot_cutting') {
      div.classList.add('flot-service'); // добавляем класс для стилизации
    }

    const mainRow = document.createElement('div');
    mainRow.className = 'service-main';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'chk_' + key;
    cb.value = key;

    const lbl = document.createElement('label');
    lbl.htmlFor = 'chk_' + key;
    lbl.textContent = SERVICE_LABELS[key];

    mainRow.appendChild(cb);
    mainRow.appendChild(lbl);
    div.appendChild(mainRow);

    // ---------- ОСОБАЯ ОБРАБОТКА ДЛЯ ФЛОТОРЕЗКИ ----------
    if (key === 'flot_cutting') {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flot-actions';
      actionsDiv.id = 'flotActions';
      actionsDiv.style.display = 'none'; // скрыт по умолчанию

      const containerInner = document.createElement('div');
      containerInner.className = 'print-sheets-container';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'print-sheets-info';
      infoDiv.innerHTML = '<span>Резка: <strong id="flotCuttingResult">0</strong></span>';

      const actionsInner = document.createElement('div');
      actionsInner.className = 'print-sheets-actions';

      const btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'btn btn-sm btn-secondary';
      btn2.id = 'flotDivideBy2';
      btn2.textContent = '÷2';

      const btn4 = document.createElement('button');
      btn4.type = 'button';
      btn4.className = 'btn btn-sm btn-secondary';
      btn4.id = 'flotDivideBy4';
      btn4.textContent = '÷4';

      const resultInput = document.createElement('input');
      resultInput.type = 'number';
      resultInput.id = 'flotDividedResult';
      resultInput.readOnly = true;
      resultInput.placeholder = 'Рез-т';
      resultInput.value = '0';

      actionsInner.appendChild(btn2);
      actionsInner.appendChild(btn4);
      actionsInner.appendChild(resultInput);

      containerInner.appendChild(infoDiv);
      containerInner.appendChild(actionsInner);
      actionsDiv.appendChild(containerInner);

      div.appendChild(actionsDiv);

      // --- ЛОГИКА ПОКАЗА/СКРЫТИЯ ---
      const flotActions = actionsDiv;
      cb.addEventListener('change', function() {
        flotActions.style.display = this.checked ? 'flex' : 'none';
        if (!this.checked) {
          // Очищаем поле результата при снятии галочки
          const res = document.getElementById('flotDividedResult');
          if (res) res.value = '0';
          const resSpan = document.getElementById('flotCuttingResult');
          if (resSpan) resSpan.textContent = '0';
        }
      });

      // --- ОБРАБОТЧИКИ КНОПОК ---
      // Они будут привязаны позже, но можно сразу добавить события
      // Но для удобства мы их привяжем глобально после создания всех элементов
      // Пока сохраняем ссылки, чтобы потом привязать
    }

    // ---------- ОБЫЧНАЯ РЕЗКА (cutting) ----------
    else if (key === 'cutting') {
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'cutting-details';
      detailsDiv.id = 'cuttingDetails';
      detailsDiv.style.display = 'none';

      const select = document.createElement('select');
      select.id = 'cutting_type';
      select.className = 'cutting-select';
      select.innerHTML = `
        <option value="">Выбрать...</option>
        <option value="pre">до печать</option>
        <option value="post">пост печать</option>
        <option value="both">оба</option>
      `;
      detailsDiv.appendChild(select);

      const fieldsPre = document.createElement('div');
      fieldsPre.className = 'cutting-fields';
      fieldsPre.id = 'fields_pre';
      fieldsPre.style.display = 'none';
      fieldsPre.innerHTML = `
        <input type="number" id="cut_pre_length" placeholder="Длина" min="0">
        <input type="number" id="cut_pre_width" placeholder="Ширина" min="0">
      `;

      const fieldsPost = document.createElement('div');
      fieldsPost.className = 'cutting-fields';
      fieldsPost.id = 'fields_post';
      fieldsPost.style.display = 'none';
      fieldsPost.innerHTML = `
        <input type="number" id="cut_post_length" placeholder="Длина" min="0">
        <input type="number" id="cut_post_width" placeholder="Ширина" min="0">
      `;

      const fieldsBoth = document.createElement('div');
      fieldsBoth.className = 'cutting-fields cutting-both';
      fieldsBoth.id = 'fields_both';
      fieldsBoth.style.display = 'none';
      fieldsBoth.innerHTML = `
        <div class="cutting-row-inline">
          <label class="cutting-label">До:</label>
          <input type="number" id="cut_both_pre_length" placeholder="Длина" min="0">
          <input type="number" id="cut_both_pre_width" placeholder="Ширина" min="0">
        </div>
        <div class="cutting-row-inline">
          <label class="cutting-label">Пост:</label>
          <input type="number" id="cut_both_post_length" placeholder="Длина" min="0">
          <input type="number" id="cut_both_post_width" placeholder="Ширина" min="0">
        </div>
      `;

      detailsDiv.appendChild(fieldsPre);
      detailsDiv.appendChild(fieldsPost);
      detailsDiv.appendChild(fieldsBoth);

      select.addEventListener('change', function() {
        const val = this.value;
        fieldsPre.style.display = (val === 'pre') ? 'flex' : 'none';
        fieldsPost.style.display = (val === 'post') ? 'flex' : 'none';
        fieldsBoth.style.display = (val === 'both') ? 'flex' : 'none';
      });

      cb.addEventListener('change', function() {
        const isChecked = this.checked;
        detailsDiv.style.display = isChecked ? 'flex' : 'none';
        if (!isChecked) {
          select.value = '';
          fieldsPre.style.display = 'none';
          fieldsPost.style.display = 'none';
          fieldsBoth.style.display = 'none';
          document.querySelectorAll('#cuttingDetails input[type="number"]').forEach(inp => inp.value = '');
        }
      });

      div.appendChild(detailsDiv);
    }

    // ---------- ОСТАЛЬНЫЕ УСЛУГИ (с выбором варианта) ----------
    else {
      const sel = document.createElement('select');
      sel.id = 'sel_' + key;
      SERVICE_TYPES[key].forEach(v => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = v;
        sel.appendChild(o);
      });
      cb.addEventListener('change', function() {
        sel.style.display = this.checked ? 'block' : 'none';
        if (!this.checked) sel.selectedIndex = 0;
      });
      mainRow.appendChild(sel);
    }

    container.appendChild(div);
  }

  // ---------- ДОПОЛНИТЕЛЬНАЯ ПРИВЯЗКА СОБЫТИЙ ДЛЯ ФЛОТОРЕЗКИ ----------
  // Теперь, когда все элементы созданы, привяжем обработчики для кнопок
  const flotCheck = document.getElementById('chk_flot_cutting');
  const flotResult = document.getElementById('flotCuttingResult');
  const flotDividedInput = document.getElementById('flotDividedResult');
  const btn2 = document.getElementById('flotDivideBy2');
  const btn4 = document.getElementById('flotDivideBy4');
  const printSheetsAuto = document.getElementById('printSheetsAuto');

  if (flotCheck && btn2 && btn4) {
    function getCurrentSheets() {
      const raw = printSheetsAuto ? printSheetsAuto.textContent.trim() : '0';
      const val = parseInt(raw, 10);
      return isNaN(val) ? 0 : val;
    }

    function updateFlotResult(value) {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        if (flotResult) flotResult.textContent = '0';
        if (flotDividedInput) flotDividedInput.value = '0';
        return;
      }
      const display = Math.floor(num);
      if (flotResult) flotResult.textContent = display;
      if (flotDividedInput) flotDividedInput.value = display;
    }

    function divideSheets(divisor) {
      const base = getCurrentSheets();
      if (base === 0) {
        updateFlotResult(0);
        return;
      }
      const result = base / divisor;
      updateFlotResult(result);
    }

    btn2.addEventListener('click', function(e) {
      e.preventDefault();
      if (!flotCheck.checked) {
        flotCheck.checked = true;
        // Показать блок (имитация события change)
        const actions = document.getElementById('flotActions');
        if (actions) actions.style.display = 'flex';
      }
      divideSheets(2);
    });

    btn4.addEventListener('click', function(e) {
      e.preventDefault();
      if (!flotCheck.checked) {
        flotCheck.checked = true;
        const actions = document.getElementById('flotActions');
        if (actions) actions.style.display = 'flex';
      }
      divideSheets(4);
    });

    // Инициализация: скрыть блок, если галочка не стоит
    if (!flotCheck.checked) {
      const actions = document.getElementById('flotActions');
      if (actions) actions.style.display = 'none';
    }
  }
}

// ---------- ФОРМАТ РУЛОНА ----------
function setupMediaTypeToggle() {
  const roll = document.querySelector('input[name="media_type"][value="roll"]');
  const sheet = document.querySelector('input[name="media_type"][value="sheet"]');
  const row = document.getElementById('rollFormatRow');
  const toggle = () => row.style.display = roll.checked ? '' : 'none';
  roll.addEventListener('change', toggle);
  sheet.addEventListener('change', toggle);
  toggle();
}

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ РАСЧЁТА ==========
let currentWeightKg = 0;      // полный вес (кг)
let currentTotalSheets = 0;   // тираж листов (теперь равен order_qty)

// ========== РАСЧЁТ ТИРАЖА И ВЕСА ==========
function recalc() {
  const orderQty   = parseFloat(document.querySelector('input[name="order_qty"]')?.value) || 0;
  const width      = parseFloat(document.querySelector('input[name="size_width"]')?.value) || 0;
  const length     = parseFloat(document.querySelector('input[name="size_length"]')?.value) || 0;
  const gsm        = parseFloat(document.querySelector('input[name="gsm"]')?.value) || 0;

  const totalSheets = orderQty;
  currentTotalSheets = totalSheets;

  let weightKg = 0;
  if (width > 0 && length > 0 && gsm > 0 && totalSheets > 0) {
    weightKg = (width * length * gsm * totalSheets) / 1_000_000_000;
  }
  currentWeightKg = weightKg;

  updateUI(totalSheets, weightKg);
}

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
function updateUI(totalSheets, weightKg) {
  const hidden = document.getElementById('printSheetsHidden');
  if (hidden) hidden.value = totalSheets;

  const autoSheets = document.getElementById('printSheetsAuto');
  if (autoSheets) autoSheets.textContent = totalSheets;

  const weightEl = document.getElementById('weightResult');
  if (weightEl) {
    if (weightKg <= 0 || totalSheets <= 0) {
      weightEl.textContent = '— кг';
    } else {
      const truncated = Math.floor(weightKg * 1000) / 1000;
      weightEl.textContent = truncated.toFixed(3).replace('.', ',') + ' кг';
    }
  }

  const dividedInput = document.getElementById('dividedResult');
  if (dividedInput) dividedInput.value = '';
}

// ---------- ПРИВЯЗКА СОБЫТИЙ НА ПОЛЯ ВВОДА ----------
function setupCalcListeners() {
  const selectors = [
    'input[name="order_qty"]',
    'input[name="size_width"]',
    'input[name="size_length"]',
    'input[name="gsm"]'
  ];
  selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('input', recalc);
  });

  document.querySelectorAll('input[name="calc_mode"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });
}

// ---------- КНОПКИ ДЕЛЕНИЯ ВЕСА (для старого ÷2/÷4) ----------
function setupWeightDivision() {
  const resultInput = document.getElementById('dividedResult');
  const btn2 = document.getElementById('divideBy2');
  const btn4 = document.getElementById('divideBy4');

  if (btn2 && resultInput) {
    btn2.addEventListener('click', () => {
      if (currentWeightKg > 0) {
        resultInput.value = (currentWeightKg / 2).toFixed(2);
      }
    });
  }
  if (btn4 && resultInput) {
    btn4.addEventListener('click', () => {
      if (currentWeightKg > 0) {
        resultInput.value = (currentWeightKg / 4).toFixed(2);
      }
    });
  }
}

// ---------- PDF ----------
let pdfBase64 = null;
document.getElementById('pdfUpload').addEventListener('change', function(e){
  const f = e.target.files[0];
  document.getElementById('pdfError').textContent = '';
  if(!f) return;
  if(f.type !== 'application/pdf') {
    document.getElementById('pdfError').textContent = 'Только PDF файлы!';
    return;
  }
  if(f.size > 5*1024*1024) {
    document.getElementById('pdfError').textContent = 'Макс. 5 МБ';
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    pdfBase64 = ev.target.result;
    document.getElementById('pdfFileName').textContent = f.name;
    document.getElementById('clearPdfBtn').style.display = 'inline-block';
  };
  reader.readAsDataURL(f);
});
document.getElementById('clearPdfBtn').addEventListener('click', function(){
  pdfBase64 = null;
  document.getElementById('pdfUpload').value = '';
  document.getElementById('pdfFileName').textContent = '';
  this.style.display = 'none';
});

// ---------- ОТПРАВКА ----------
document.getElementById('orderForm').addEventListener('submit', function(e){
  e.preventDefault();
  if(!this.checkValidity()) { this.reportValidity(); return; }

  recalc();

  const fd = new FormData(this);
  const order = {
    id: Date.now(),
    techcard_no: fd.get('techcard_no'),
    manager: fd.get('manager'),
    customer: fd.get('customer'),
    product_name: fd.get('product_name'),
    description: fd.get('description'),
    print_type: fd.get('print_type'),
    media_type: fd.get('media_type'),
    paper_type: fd.get('paper_type'),
    order_qty: +fd.get('order_qty') || 0,
    make_ready: +fd.get('make_ready') || 0,
    roll_format: fd.get('roll_format') ? parseFloat(fd.get('roll_format')) : null,
    size_length: +fd.get('size_length') || 0,
    size_width: +fd.get('size_width') || 0,
    stripes: +fd.get('stripes') || 0,
    gsm: +fd.get('gsm') || 0,
    color: fd.get('color'),
    calc_mode: document.querySelector('input[name="calc_mode"]:checked')?.value || 'warehouse',
    print_sheets: currentTotalSheets,
    weight_kg: currentWeightKg,
    services: [],
    pdfData: pdfBase64 || null
  };

  // Сбор услуг
  for (let key in SERVICE_TYPES) {
    const chk = document.getElementById('chk_' + key);
    if (chk && chk.checked) {
      if (key === 'cutting') {
        const sel = document.getElementById('cutting_type');
        const val = sel.value;
        if (val === 'pre') {
          const len = parseFloat(document.getElementById('cut_pre_length').value) || 0;
          const wid = parseFloat(document.getElementById('cut_pre_width').value) || 0;
          order.services.push({ name: 'cutting', type: 'до печать', length: len, width: wid });
        } else if (val === 'post') {
          const len = parseFloat(document.getElementById('cut_post_length').value) || 0;
          const wid = parseFloat(document.getElementById('cut_post_width').value) || 0;
          order.services.push({ name: 'cutting', type: 'пост печать', length: len, width: wid });
        } else if (val === 'both') {
          const lenPre = parseFloat(document.getElementById('cut_both_pre_length').value) || 0;
          const widPre = parseFloat(document.getElementById('cut_both_pre_width').value) || 0;
          const lenPost = parseFloat(document.getElementById('cut_both_post_length').value) || 0;
          const widPost = parseFloat(document.getElementById('cut_both_post_width').value) || 0;
          order.services.push({
            name: 'cutting',
            type: 'оба',
            details: [
              { type: 'до печать', length: lenPre, width: widPre },
              { type: 'пост печать', length: lenPost, width: widPost }
            ]
          });
        }
      } else if (key === 'flot_cutting') {
        // Собираем результат деления
        const resultVal = document.getElementById('flotDividedResult')?.value || '0';
        order.services.push({ name: 'flot_cutting', result: resultVal });
      } else {
        const sel = document.getElementById('sel_' + key);
        order.services.push({ name: key, type: sel ? sel.value : '' });
      }
    }
  }

  let orders = JSON.parse(localStorage.getItem('print_orders') || '[]');
  orders.push(order);
  localStorage.setItem('print_orders', JSON.stringify(orders));

  (async () => {
    try {
      const resp = await fetch('/api/otpcex', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...order, id: String(order.id) }) });
      if (!resp.ok) throw new Error('Server save failed');
      const saved = await resp.json();
      document.getElementById('result').innerHTML = `<div class="success-msg">✅ Заказ сохранён. <a href="texKarta.html?id=${saved.id}" style="color:#065f46;">Открыть техкарту</a></div>`;
    } catch (err) {
      console.warn('Save to server failed, kept local:', err);
      document.getElementById('result').innerHTML = `<div class="success-msg">✅ Заказ сохранён локально. <a href="texKarta.html?id=${order.id}" style="color:#065f46;">Открыть техкарту</a></div>`;
    }
  })();

  document.getElementById('techcardNo').value = generateTechCardNo();
});

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
buildServicesBlock();
setupMediaTypeToggle();
setupCalcListeners();
setupWeightDivision();
recalc();