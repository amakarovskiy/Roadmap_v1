/* ===== Share & URL state ===== */

function updateURL() {
  const ids = Route.ids;
  const url = new URL(window.location.href);
  if (ids.length > 0) {
    url.searchParams.set('route', ids.join(','));
  } else {
    url.searchParams.delete('route');
  }
  history.replaceState(null, '', url.toString());
}

function getShareURL() {
  const ids = Route.ids;
  return 'https://map.thaigo.rent/' +
    (ids.length > 0 ? '?route=' + ids.join(',') : '');
}

/* ===== CTA links (for bottom buttons — to ThaiGo) ===== */

function buildWaLink(route, stats) {
  if (route.length < 2) {
    return 'https://wa.me/66822545737?text=' +
      encodeURIComponent('Хочу арендовать байк и посетить самые крутые места Пхукета!');
  }
  const stops = route.map(function (s, i) {
    return (i + 1) + '. ' + s.name;
  }).join('\n');
  const msg = 'Хочу арендовать байк и посетить самые крутые места Пхукета!\n\nМой маршрут:\n' +
    stops + '\n\n' +
    'Расстояние: ' + stats.km.toFixed(1) + ' км, ~' + formatTime(stats.mins) +
    ', бензин ~' + stats.fuel + ' ฿';
  return 'https://wa.me/66822545737?text=' + encodeURIComponent(msg);
}

function buildTgLink(route, stats) {
  if (route.length < 2) {
    return 'https://t.me/ThaiGoSale1';
  }
  const stops = route.map(function (s, i) {
    return (i + 1) + '. ' + s.name;
  }).join('\n');
  var msg = 'Хочу арендовать байк и посетить самые крутые места Пхукета!\n\nМой маршрут:\n' +
    stops + '\n\n' +
    'Расстояние: ' + stats.km.toFixed(1) + ' км, ~' + formatTime(stats.mins) +
    ', бензин ~' + stats.fuel + ' ฿';
  return 'https://t.me/ThaiGoSale1?text=' + encodeURIComponent(msg);
}

function buildGoogleMapsLink(route) {
  if (route.length < 2) return '';
  var origin = route[0].lat + ',' + route[0].lng;
  var destination = route[route.length - 1].lat + ',' + route[route.length - 1].lng;
  var waypoints = '';
  if (route.length > 2) {
    waypoints = '&waypoints=' + route.slice(1, -1).map(function (p) {
      return p.lat + ',' + p.lng;
    }).join('|');
  }
  return 'https://www.google.com/maps/dir/?api=1&origin=' + origin +
    '&destination=' + destination + waypoints + '&travelmode=driving';
}

/* ===== Companion share (send to friend) ===== */

function buildCompanionMsg(route, stats) {
  if (route.length < 2) return '';
  var link = getShareURL();
  var stops = route.map(function (s, i) {
    return (i + 1) + '. ' + s.icon + ' ' + s.name;
  }).join('\n');
  var msg = 'Смотри маршрут по Пхукету на байке!\n\n' +
    stops + '\n\n' +
    'Расстояние: ' + stats.km.toFixed(1) + ' км\n' +
    'Время в пути: ~' + formatTime(stats.mins) + '\n' +
    'Бензин: ~' + stats.fuel + ' ฿\n\n' +
    'Открой маршрут на карте:\n' + link;
  return msg;
}

function shareCompanionWA(route, stats) {
  var msg = buildCompanionMsg(route, stats);
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareCompanionTG(route, stats) {
  var msg = buildCompanionMsg(route, stats);
  window.open('https://t.me/share/url?url=' + encodeURIComponent(getShareURL()) +
    '&text=' + encodeURIComponent(msg), '_blank');
}

/* ===== Copy link ===== */

function copyShareLink() {
  var url = getShareURL();
  navigator.clipboard.writeText(url).then(function () {
    showToast('Ссылка скопирована!');
  }).catch(function () {
    // Fallback for HTTP
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Ссылка скопирована!');
    } catch (e) {
      showToast('Не удалось скопировать', 'error');
    }
    document.body.removeChild(ta);
  });
}

/* ===== Save trip (bookmark URL) ===== */

function saveTripBookmark() {
  var url = getShareURL();
  navigator.clipboard.writeText(url).then(function () {
    showToast('Ссылка сохранена! Откройте завтра, маршрут восстановится.');
  }).catch(function () {
    showToast('Сохраните эту ссылку: ' + url);
  });
}
