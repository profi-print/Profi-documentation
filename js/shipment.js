(function() {
  window.curShipmentOrderId = null;

  window.openShipmentModal = function(orderId) {
    window.curShipmentOrderId = orderId;
    document.getElementById('shipmentDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('shipmentQty').value = '';
    document.getElementById('shipmentWeight').value = '';
    document.getElementById('shipmentBoxes').value = '';
    document.getElementById('shipmentPhoto').value = '';
    document.getElementById('shipmentPreview').style.display = 'none';
    document.getElementById('shipmentModal').classList.add('show');
  };

  window.closeShipmentModal = function() {
    document.getElementById('shipmentModal').classList.remove('show');
    window.curShipmentOrderId = null;
  };

  document.getElementById('shipmentPhoto').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        document.getElementById('shipmentPreview').src = ev.target.result;
        document.getElementById('shipmentPreview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  window.confirmShipment = function() {
    if (!window.curShipmentOrderId) return;
    let orders = JSON.parse(localStorage.getItem('pp_orders') || '[]');
    let order = orders.find(o => String(o.id) === String(window.curShipmentOrderId));
    let storageKey = 'pp_orders';

    if (!order) {
      orders = JSON.parse(localStorage.getItem('pp_warehouse_orders') || '[]');
      order = orders.find(o => String(o.id) === String(window.curShipmentOrderId));
      storageKey = 'pp_warehouse_orders';
    }

    if (!order) return alert('Заказ не найден');

    const date = document.getElementById('shipmentDate').value;
    const qty = parseInt(document.getElementById('shipmentQty').value, 10) || 0;
    const weight = parseFloat(document.getElementById('shipmentWeight').value) || 0;
    const boxes = parseInt(document.getElementById('shipmentBoxes').value, 10) || 0;
    const preview = document.getElementById('shipmentPreview');
    let photoBase64 = preview.src && preview.style.display !== 'none' ? preview.src : '';

    if (!date || qty <= 0) {
      alert('Дата и количество обязательны');
      return;
    }

    if (!order.shipment_history) order.shipment_history = [];
    order.shipment_history.push({
      date: date,
      qty: qty,
      weight_kg: weight,
      boxes: boxes,
      photo: photoBase64,
      timestamp: Date.now()
    });

    let allOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const idx = allOrders.findIndex(o => String(o.id) === String(order.id));
    if (idx >= 0) allOrders[idx] = order;
    else allOrders.push(order);
    localStorage.setItem(storageKey, JSON.stringify(allOrders));

    closeShipmentModal();
    alert('Отгрузка сохранена');
    if (window.refreshCurrentView) window.refreshCurrentView();
  };
})();