/* ===== SVG Map — custom drawn Phuket map ===== */

/* Coordinate system:
   Real GPS: lat 7.74..8.18 (south..north), lng 98.26..98.42 (west..east)
   SVG viewBox: 0 0 600 1000
   We map GPS → SVG with Y inverted (north = top) */

var MAP_BOUNDS = {
  latMin: 7.74, latMax: 8.18,
  lngMin: 98.26, lngMax: 98.42
};

var SVG_W = 600, SVG_H = 1000;

/* Current pan/zoom state */
var mapViewBox = { x: 0, y: 0, w: SVG_W, h: SVG_H };
var mapDragging = false;
var mapDragStart = { x: 0, y: 0, vx: 0, vy: 0 };

/* ===== GPS → SVG coordinate conversion ===== */
function gpsToSvg(lat, lng) {
  var x = ((lng - MAP_BOUNDS.lngMin) / (MAP_BOUNDS.lngMax - MAP_BOUNDS.lngMin)) * SVG_W;
  var y = ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * SVG_H;
  return { x: x, y: y };
}

/* ===== Island coastline path (simplified realistic Phuket shape) ===== */
var ISLAND_COORDS = [
  [8.165, 98.305], [8.160, 98.295], [8.150, 98.288],
  [8.135, 98.283], [8.120, 98.280], [8.105, 98.278],
  [8.090, 98.276], [8.075, 98.274], [8.060, 98.273],
  [8.045, 98.272], [8.030, 98.271], [8.015, 98.275],
  [8.000, 98.278], [7.985, 98.275], [7.970, 98.272],
  [7.955, 98.275], [7.940, 98.276], [7.925, 98.278],
  [7.910, 98.280], [7.895, 98.285], [7.880, 98.283],
  [7.865, 98.280], [7.850, 98.278], [7.835, 98.280],
  [7.820, 98.283], [7.810, 98.286], [7.800, 98.288],
  [7.790, 98.290], [7.780, 98.293], [7.770, 98.298],
  [7.762, 98.305], [7.758, 98.312], [7.755, 98.320],
  [7.758, 98.330], [7.762, 98.340], [7.770, 98.345],
  [7.780, 98.342], [7.790, 98.338], [7.800, 98.340],
  [7.810, 98.345], [7.815, 98.355], [7.820, 98.365],
  [7.830, 98.375], [7.840, 98.380], [7.850, 98.385],
  [7.860, 98.390], [7.870, 98.395], [7.880, 98.400],
  [7.890, 98.405], [7.900, 98.408], [7.910, 98.405],
  [7.920, 98.400], [7.930, 98.395], [7.940, 98.390],
  [7.950, 98.388], [7.960, 98.392], [7.970, 98.398],
  [7.980, 98.405], [7.990, 98.410], [8.000, 98.412],
  [8.015, 98.410], [8.030, 98.405], [8.045, 98.400],
  [8.060, 98.395], [8.075, 98.390], [8.090, 98.385],
  [8.100, 98.378], [8.110, 98.370], [8.120, 98.365],
  [8.130, 98.355], [8.140, 98.345], [8.145, 98.335],
  [8.150, 98.325], [8.155, 98.315], [8.165, 98.305]
];

/* ===== Main road paths (GPS coords for key roads) ===== */
var ROAD_402 = [ // Main north-south highway
  [8.15, 98.305], [8.10, 98.300], [8.05, 98.295],
  [8.00, 98.300], [7.95, 98.305], [7.90, 98.310],
  [7.88, 98.320], [7.86, 98.340], [7.84, 98.345],
  [7.82, 98.340], [7.80, 98.330], [7.78, 98.320],
  [7.77, 98.315]
];

var ROAD_WEST = [ // West coast road
  [8.04, 98.278], [8.00, 98.280], [7.97, 98.276],
  [7.94, 98.280], [7.90, 98.290], [7.87, 98.285],
  [7.84, 98.290], [7.82, 98.293], [7.80, 98.295],
  [7.78, 98.300]
];

var ROAD_EAST = [ // East coast road
  [8.00, 98.400], [7.97, 98.395], [7.94, 98.390],
  [7.91, 98.395], [7.88, 98.400], [7.86, 98.390],
  [7.84, 98.375], [7.82, 98.360]
];

/* ===== District area bubbles ===== */
var AREAS = [
  { lat: 8.14, lng: 98.295, rx: 30, ry: 22, name: 'Mai Khao' },
  { lat: 8.01, lng: 98.287, rx: 28, ry: 20, name: 'Bang Tao' },
  { lat: 7.97, lng: 98.277, rx: 22, ry: 16, name: 'Surin' },
  { lat: 7.94, lng: 98.280, rx: 24, ry: 18, name: 'Kamala' },
  { lat: 7.895, lng: 98.293, rx: 30, ry: 22, name: 'Patong' },
  { lat: 7.845, lng: 98.295, rx: 26, ry: 18, name: 'Karon' },
  { lat: 7.818, lng: 98.298, rx: 22, ry: 16, name: 'Kata' },
  { lat: 7.785, lng: 98.330, rx: 25, ry: 18, name: 'Rawai' },
  { lat: 7.845, lng: 98.370, rx: 28, ry: 20, name: 'Chalong' },
  { lat: 7.885, lng: 98.395, rx: 32, ry: 24, name: 'Phuket Town' },
  { lat: 7.765, lng: 98.310, rx: 18, ry: 14, name: 'Promthep' }
];

/* ===== POI color map by category ===== */
var CAT_COLORS = {
  beach:  '#ff5a5a',
  view:   '#44dd66',
  temple: '#ffaa33',
  nature: '#33cc88',
  market: '#ffd34a',
  food:   '#ff7744',
  photo:  '#55bbff',
  office: '#BBFF46'
};

function getCatColor(place) {
  var cat = getDisplayCat(place);
  return CAT_COLORS[cat] || '#ffffff';
}

/* ===== SVG element helpers ===== */
function svgEl(tag, attrs) {
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in attrs) {
    el.setAttribute(k, attrs[k]);
  }
  return el;
}

/* Convert array of [lat,lng] to SVG path "d" attribute */
function coordsToPath(coords, closed) {
  var parts = coords.map(function(c, i) {
    var p = gpsToSvg(c[0], c[1]);
    return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
  });
  if (closed) parts.push('Z');
  return parts.join(' ');
}

/* ===== Popup state ===== */
var activePopup = null;

function closePopup() {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
}

function showPopup(place) {
  closePopup();
  var pos = gpsToSvg(place.lat, place.lng);
  var mapEl = document.getElementById('map');
  var svg = document.getElementById('map-svg');
  var svgRect = svg.getBoundingClientRect();

  // Convert SVG coords to screen coords
  var scaleX = svgRect.width / mapViewBox.w;
  var scaleY = svgRect.height / mapViewBox.h;
  var screenX = (pos.x - mapViewBox.x) * scaleX + svgRect.left - mapEl.getBoundingClientRect().left;
  var screenY = (pos.y - mapViewBox.y) * scaleY + svgRect.top - mapEl.getBoundingClientRect().top;

  var inRoute = Route.has(place.id);
  var btnClass = inRoute ? 'popup-add-btn in-route' : 'popup-add-btn';
  var btnText = inRoute ? '✓ В маршруте — убрать' : '+ Добавить в маршрут';
  var catLabel = CAT_LABELS[getDisplayCat(place)] || getDisplayCat(place);
  var fuelCost = Math.round(place.km_from_patong / 100 * FUEL_L_PER_100KM * FUEL_PRICE_THB);
  var driveMin = Math.round(place.km_from_patong * SPEED_MIN_PER_KM);
  var isTop = place.cat.includes('top');
  var topBadge = isTop ? '<span class="popup-top-badge">⭐ TOP</span>' : '';
  var tipLine = place.tips ? '<div class="popup-tip">💡 ' + place.tips + '</div>' : '';
  var imgBlock = place.img ? '<div class="popup-img"><img src="' + place.img + '" alt="' + place.name + '" loading="lazy"></div>' : '';

  var popup = document.createElement('div');
  popup.className = 'svg-popup';
  popup.innerHTML =
    '<div class="svg-popup-arrow"></div>' +
    '<button class="svg-popup-close" onclick="closePopup()">&times;</button>' +
    '<div class="place-popup">' +
      imgBlock +
      '<div class="popup-header">' +
        '<span class="popup-icon">' + place.icon + '</span>' +
        '<div class="popup-header-text">' +
          '<div class="popup-name-row">' +
            '<span class="popup-name">' + place.name + '</span>' +
            topBadge +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="popup-cat">' + catLabel + '</div>' +
      '<div class="popup-desc">' + place.desc + '</div>' +
      tipLine +
      '<div class="popup-meta">' +
        '<span class="popup-meta-item">📍 ' + place.km_from_patong + ' <small>км</small></span>' +
        (fuelCost > 0 ? '<span class="popup-meta-item">⛽ ~' + fuelCost + ' <small>฿</small></span>' : '') +
        (driveMin > 0 ? '<span class="popup-meta-item">🕐 ~' + formatTimeShort(driveMin) + '</span>' : '') +
      '</div>' +
      '<button class="' + btnClass + '" onclick="togglePlaceFromMap(\'' + place.id + '\')">' +
        btnText +
      '</button>' +
    '</div>';

  popup.style.left = screenX + 'px';
  popup.style.top = (screenY - 10) + 'px';
  mapEl.appendChild(popup);
  activePopup = popup;

  // Keep popup inside map container
  var pRect = popup.getBoundingClientRect();
  var mRect = mapEl.getBoundingClientRect();
  if (pRect.right > mRect.right - 10) {
    popup.style.left = (screenX - pRect.width) + 'px';
  }
  if (pRect.top < mRect.top + 10) {
    popup.style.top = (screenY + 20) + 'px';
  }
}

function togglePlaceFromMap(id) {
  var place = PLACES.find(function(p) { return p.id === id; });
  if (!place) return;
  Route.toggle(place);
  showPopup(place); // refresh popup
}

/* ===== Map markers (SVG) ===== */
var mapMarkerEls = {};

function createPlaceMarkers() {
  var layer = document.getElementById('poi-layer');
  layer.innerHTML = '';
  mapMarkerEls = {};

  PLACES.forEach(function(place) {
    var pos = gpsToSvg(place.lat, place.lng);
    var color = getCatColor(place);
    var isOffice = place.cat.includes('office');
    var r = isOffice ? 10 : 6;

    var g = svgEl('g', {
      'class': 'poi-marker',
      'data-id': place.id,
      'transform': 'translate(' + pos.x.toFixed(1) + ',' + pos.y.toFixed(1) + ')',
      'cursor': 'pointer'
    });

    // Glow circle
    g.appendChild(svgEl('circle', {
      r: r * 2,
      fill: color,
      opacity: '0.15',
      'class': 'poi-glow'
    }));

    // Main dot
    g.appendChild(svgEl('circle', {
      r: r,
      fill: color,
      opacity: isOffice ? '0.9' : '0.75',
      stroke: isOffice ? '#BBFF46' : 'rgba(255,255,255,0.3)',
      'stroke-width': isOffice ? '2' : '1',
      'class': 'poi-dot'
    }));

    // Inner bright dot
    g.appendChild(svgEl('circle', {
      r: r * 0.4,
      fill: '#fff',
      opacity: '0.8'
    }));

    // Office pulse ring
    if (isOffice) {
      var pulse = svgEl('circle', {
        r: r + 4,
        fill: 'none',
        stroke: '#BBFF46',
        'stroke-width': '1.5',
        opacity: '0',
        'class': 'office-pulse-svg'
      });
      g.appendChild(pulse);
    }

    g.addEventListener('click', function(e) {
      e.stopPropagation();
      showPopup(place);
    });

    layer.appendChild(g);
    mapMarkerEls[place.id] = g;
  });
}

/* ===== Draw island shape ===== */
function drawIsland() {
  var layer = document.getElementById('island-layer');
  var path = coordsToPath(ISLAND_COORDS, true);

  // Island fill
  layer.appendChild(svgEl('path', {
    d: path,
    fill: 'rgba(10,60,80,0.5)',
    stroke: '#22cc66',
    'stroke-width': '2',
    'stroke-opacity': '0.4'
  }));

  // Inner glow
  layer.appendChild(svgEl('path', {
    d: path,
    fill: 'rgba(15,80,90,0.2)',
    stroke: 'none'
  }));
}

/* ===== Draw area bubbles ===== */
function drawAreas() {
  var layer = document.getElementById('areas-layer');
  AREAS.forEach(function(area) {
    var pos = gpsToSvg(area.lat, area.lng);

    layer.appendChild(svgEl('ellipse', {
      cx: pos.x.toFixed(1),
      cy: pos.y.toFixed(1),
      rx: area.rx,
      ry: area.ry,
      fill: 'rgba(30,140,80,0.15)',
      stroke: 'rgba(50,200,100,0.08)',
      'stroke-width': '1'
    }));
  });
}

/* ===== Draw district labels ===== */
function drawLabels() {
  var layer = document.getElementById('labels-layer');
  AREAS.forEach(function(area) {
    var pos = gpsToSvg(area.lat, area.lng);
    var isMain = ['Patong', 'Phuket Town', 'Chalong'].indexOf(area.name) >= 0;
    var text = svgEl('text', {
      x: pos.x.toFixed(1),
      y: (pos.y - area.ry - 5).toFixed(1),
      'text-anchor': 'middle',
      'font-family': 'Inter Tight, sans-serif',
      'font-size': isMain ? '13' : '10',
      'font-weight': isMain ? '700' : '600',
      fill: 'rgba(255,255,255,' + (isMain ? '0.5' : '0.3') + ')',
      'letter-spacing': '2'
    });
    text.textContent = area.name.toUpperCase();
    layer.appendChild(text);
  });
}

/* ===== Draw roads ===== */
function drawRoads() {
  var layer = document.getElementById('roads-layer');

  // Main highway
  layer.appendChild(svgEl('path', {
    d: coordsToPath(ROAD_402, false),
    fill: 'none',
    stroke: '#BBFF46',
    'stroke-width': '2.5',
    'stroke-opacity': '0.35',
    'stroke-dasharray': '6,4',
    'stroke-linecap': 'round'
  }));

  // West coast road
  layer.appendChild(svgEl('path', {
    d: coordsToPath(ROAD_WEST, false),
    fill: 'none',
    stroke: 'rgba(255,255,255,0.15)',
    'stroke-width': '1.5',
    'stroke-dasharray': '4,4',
    'stroke-linecap': 'round'
  }));

  // East coast road
  layer.appendChild(svgEl('path', {
    d: coordsToPath(ROAD_EAST, false),
    fill: 'none',
    stroke: 'rgba(255,255,255,0.15)',
    'stroke-width': '1.5',
    'stroke-dasharray': '4,4',
    'stroke-linecap': 'round'
  }));
}

/* ===== Route line ===== */
function updateRouteLine(places) {
  var layer = document.getElementById('route-layer');
  layer.innerHTML = '';
  if (places.length < 2) return;

  var coords = places.map(function(p) { return [p.lat, p.lng]; });
  layer.appendChild(svgEl('path', {
    d: coordsToPath(coords, false),
    fill: 'none',
    stroke: '#BBFF46',
    'stroke-width': '3',
    'stroke-opacity': '0.8',
    'stroke-dasharray': '8,6',
    'stroke-linecap': 'round',
    'class': 'route-line'
  }));
}

/* ===== Update marker visual states ===== */
function updateMarkerStates(routePlaces) {
  var rPlaces = routePlaces || Route.places;

  PLACES.forEach(function(place) {
    var g = mapMarkerEls[place.id];
    if (!g) return;

    var inRoute = Route.has(place.id);
    var dot = g.querySelector('.poi-dot');
    var glow = g.querySelector('.poi-glow');

    // Remove old badges
    var oldBadge = g.querySelector('.route-badge');
    if (oldBadge) oldBadge.remove();
    var oldLabel = g.querySelector('.route-label-svg');
    if (oldLabel) oldLabel.remove();

    if (inRoute) {
      dot.setAttribute('stroke', '#BBFF46');
      dot.setAttribute('stroke-width', '2.5');
      dot.setAttribute('opacity', '1');
      glow.setAttribute('opacity', '0.35');

      var idx = Route.indexOf(place.id) + 1;
      var badge = svgEl('text', {
        x: '8', y: '-8',
        'font-size': '10',
        'font-weight': '900',
        'font-family': 'Inter Tight, sans-serif',
        fill: '#000',
        'text-anchor': 'middle',
        'class': 'route-badge'
      });
      // Badge background circle
      var bgCircle = svgEl('circle', {
        cx: '8', cy: '-11', r: '8',
        fill: '#BBFF46',
        'class': 'route-badge'
      });
      g.appendChild(bgCircle);
      badge.textContent = idx;
      g.appendChild(badge);

      // Start/Finish label
      if (idx === 1 || (idx === rPlaces.length && rPlaces.length > 1)) {
        var labelText = idx === 1 ? 'START' : '🏁';
        var label = svgEl('text', {
          x: '0', y: '18',
          'font-size': '8',
          'font-weight': '800',
          'font-family': 'Inter Tight, sans-serif',
          fill: idx === 1 ? '#BBFF46' : '#fff',
          'text-anchor': 'middle',
          'class': 'route-label-svg'
        });
        label.textContent = labelText;
        g.appendChild(label);
      }
    } else {
      var color = getCatColor(place);
      var isOffice = place.cat.includes('office');
      dot.setAttribute('stroke', isOffice ? '#BBFF46' : 'rgba(255,255,255,0.3)');
      dot.setAttribute('stroke-width', isOffice ? '2' : '1');
      dot.setAttribute('opacity', isOffice ? '0.9' : '0.75');
      glow.setAttribute('opacity', '0.15');
    }
  });
}

/* ===== Filter markers by category ===== */
function filterMapMarkers(cat) {
  PLACES.forEach(function(place) {
    var g = mapMarkerEls[place.id];
    if (!g) return;
    var isOffice = place.cat.includes('office');
    var inRoute = Route.has(place.id);
    var matches = placeMatchesCat(place, cat);
    g.style.display = (isOffice || inRoute || matches) ? '' : 'none';
  });
}

/* ===== Pan & Zoom ===== */
function applyViewBox() {
  var svg = document.getElementById('map-svg');
  if (!svg) return;
  svg.setAttribute('viewBox',
    mapViewBox.x + ' ' + mapViewBox.y + ' ' + mapViewBox.w + ' ' + mapViewBox.h
  );
}

function svgMapZoom(dir) {
  var factor = dir > 0 ? 0.8 : 1.25;
  var newW = mapViewBox.w * factor;
  var newH = mapViewBox.h * factor;
  // Limit zoom
  if (newW < 100 || newW > SVG_W * 1.5) return;
  var cx = mapViewBox.x + mapViewBox.w / 2;
  var cy = mapViewBox.y + mapViewBox.h / 2;
  mapViewBox.x = cx - newW / 2;
  mapViewBox.y = cy - newH / 2;
  mapViewBox.w = newW;
  mapViewBox.h = newH;
  applyViewBox();
}

function initMapDrag() {
  var svg = document.getElementById('map-svg');
  if (!svg) return;

  svg.addEventListener('mousedown', function(e) {
    if (e.target.closest('.poi-marker')) return;
    mapDragging = true;
    mapDragStart = { x: e.clientX, y: e.clientY, vx: mapViewBox.x, vy: mapViewBox.y };
    closePopup();
  });

  svg.addEventListener('mousemove', function(e) {
    if (!mapDragging) return;
    var rect = svg.getBoundingClientRect();
    var scaleX = mapViewBox.w / rect.width;
    var scaleY = mapViewBox.h / rect.height;
    mapViewBox.x = mapDragStart.vx - (e.clientX - mapDragStart.x) * scaleX;
    mapViewBox.y = mapDragStart.vy - (e.clientY - mapDragStart.y) * scaleY;
    applyViewBox();
  });

  document.addEventListener('mouseup', function() { mapDragging = false; });

  // Touch support
  svg.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    if (e.target.closest('.poi-marker')) return;
    mapDragging = true;
    var t = e.touches[0];
    mapDragStart = { x: t.clientX, y: t.clientY, vx: mapViewBox.x, vy: mapViewBox.y };
    closePopup();
  });

  svg.addEventListener('touchmove', function(e) {
    if (!mapDragging || e.touches.length !== 1) return;
    e.preventDefault();
    var t = e.touches[0];
    var rect = svg.getBoundingClientRect();
    var scaleX = mapViewBox.w / rect.width;
    var scaleY = mapViewBox.h / rect.height;
    mapViewBox.x = mapDragStart.vx - (t.clientX - mapDragStart.x) * scaleX;
    mapViewBox.y = mapDragStart.vy - (t.clientY - mapDragStart.y) * scaleY;
    applyViewBox();
  }, { passive: false });

  svg.addEventListener('touchend', function() { mapDragging = false; });

  // Wheel zoom
  svg.addEventListener('wheel', function(e) {
    e.preventDefault();
    svgMapZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
}

/* ===== Auto-zoom to fit route ===== */
function autoZoomRoute(places) {
  if (places.length === 0) return;
  if (places.length === 1) {
    var p = gpsToSvg(places[0].lat, places[0].lng);
    mapViewBox.x = p.x - 150;
    mapViewBox.y = p.y - 200;
    mapViewBox.w = 300;
    mapViewBox.h = 400;
    applyViewBox();
    return;
  }
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  places.forEach(function(pl) {
    var pt = gpsToSvg(pl.lat, pl.lng);
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  });
  var pad = 60;
  mapViewBox.x = minX - pad;
  mapViewBox.y = minY - pad;
  mapViewBox.w = (maxX - minX) + pad * 2;
  mapViewBox.h = (maxY - minY) + pad * 2;
  // Maintain aspect ratio
  if (mapViewBox.w / mapViewBox.h < SVG_W / SVG_H) {
    var newW = mapViewBox.h * (SVG_W / SVG_H);
    mapViewBox.x -= (newW - mapViewBox.w) / 2;
    mapViewBox.w = newW;
  } else {
    var newH = mapViewBox.w * (SVG_H / SVG_W);
    mapViewBox.y -= (newH - mapViewBox.h) / 2;
    mapViewBox.h = newH;
  }
  applyViewBox();
}

/* ===== Fly to place (from card click) ===== */
function flyToPlace(id) {
  var place = PLACES.find(function(p) { return p.id === id; });
  if (!place) return;
  var p = gpsToSvg(place.lat, place.lng);
  mapViewBox.x = p.x - 150;
  mapViewBox.y = p.y - 200;
  mapViewBox.w = 300;
  mapViewBox.h = 400;
  applyViewBox();
  showPopup(place);
}

/* ===== Init ===== */
function initMap() {
  drawIsland();
  drawAreas();
  drawRoads();
  drawLabels();
  createPlaceMarkers();
  initMapDrag();
  applyViewBox();

  // Subscribe to route changes
  Route.onChange(function(data) {
    updateRouteLine(data.places);
    updateMarkerStates(data.places);
    autoZoomRoute(data.places);
  });
}
