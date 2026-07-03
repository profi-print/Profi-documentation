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
const SERVICE_TYPES = {
  vd_lak: ['Сплошной+Матовый','Сплошной+Глянцевый','Выборочный+Матовый','Выборочный+Глянцевый'],
  lamination: ['Глянцевый','Матовый','Золота','Серебро','Голограмма'],
  embossing: ['Золота','Серебро', 'Голограмма'],
  cutting: [],          // ← предпоследняя
  gluing: ['1','2','3','4 и более'],
  uv_lak: ['Сплошной+Матовый','Сплошной+Глянцевый','Выборочный+Матовый','Выборочный+Глянцевый'],
  die_cut: ['автомат'],  // ← последняя

};

const SERVICE_LABELS = {
  vd_lak:'ВД лак', lamination:'Ламинация',
  embossing:'Тиснение',cutting:'Резка', gluing:'Склейка', uv_lak:'УФ лак',
  die_cut:'Высечка'
};

function buildServicesBlock() {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = '';

  for (let key in SERVICE_TYPES) {
    const div = document.createElement('div');
    div.className = 'service-item';

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

    if (key === 'cutting') {
      // Блок резки
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
    } else {
      // Обычный select
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

// ---------- ТИРАЖ ----------
function setupCalc() {
  const qty = document.querySelector('input[name="order_qty"]');
  const str = document.querySelector('input[name="stripes"]');
  const mr = document.querySelector('input[name="make_ready"]');
  const res = document.querySelector('input[name="print_sheets"]');
  const calc = () => {
    res.value = (parseInt(qty.value)||0) + (parseInt(str.value)||0) + (parseInt(mr.value)||0);
  };
  qty.addEventListener('input', calc);
  str.addEventListener('input', calc);
  mr.addEventListener('input', calc);
  calc();
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
    services: [],
    pdfData: pdfBase64 || null
  };

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
      } else {
        const sel = document.getElementById('sel_' + key);
        order.services.push({ name: key, type: sel ? sel.value : '' });
      }
    }
  }

  let orders = JSON.parse(localStorage.getItem('print_orders') || '[]');
  orders.push(order);
  localStorage.setItem('print_orders', JSON.stringify(orders));

  document.getElementById('result').innerHTML =
    `<div class="success-msg">✅ Заказ сохранён. <a href="texKarta.html?id=${order.id}" style="color:#065f46;">Открыть техкарту</a></div>`;

  document.getElementById('techcardNo').value = generateTechCardNo();
});

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
buildServicesBlock();
setupMediaTypeToggle();
setupCalc();