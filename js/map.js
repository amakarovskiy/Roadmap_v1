/* ===== Leaflet map initialization ===== */

let leafletMap = null;
let mapMarkers = {};
let routeLine = null;

/* Safe area offsets for popup/zoom calculations
   Shell starts below header+hero, so these are just padding from map edges */
var MAP_SAFE_TOP = 20;
var MAP_SAFE_RIGHT = 20;
var MAP_SAFE_BOTTOM = 40;
var MAP_SAFE_LEFT = 20;

function initMap() {
  if (leafletMap) return; // prevent double init
  leafletMap = L.map('map', {
    center: [7.878, 98.392],
    zoom: 11,
    minZoom: 10,
    maxZoom: 15,
    zoomControl: false,
    attributionControl: false // disable default Leaflet prefix
  });

  // Custom clean attribution
  L.control.attribution({
    prefix: false,
    position: 'bottomright'
  }).addTo(leafletMap);

  // Dark tiles — Stadia Alidade Smooth Dark
  const stadiaLayer = L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 20,
      attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> • © <a href="https://openmaptiles.org/">OpenMapTiles</a> • © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );

  const osmLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );

  // Try Stadia, fallback to OSM
  stadiaLayer.on('tileerror', function () {
    leafletMap.removeLayer(stadiaLayer);
    osmLayer.addTo(leafletMap);
  });
  stadiaLayer.addTo(leafletMap);

  // Zoom control — bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

  // Create place markers
  createPlaceMarkers();

  // Subscribe to route changes
  Route.onChange(function (data) {
    updateRouteLine(data.places);
    updateMarkerStates(data.places);
    autoZoomRoute(data.places);
  });
}

function createPlaceMarkers() {
  PLACES.forEach(function (place) {
    var icon;
    if (place.cat.includes('office')) {
      icon = L.divIcon({
        html: '<div class="office-marker" data-id="' + place.id + '">' +
              '<img src="https://thaigo.rent/wp-content/themes/wordpress-theme/img/logo.svg" alt="ThaiGo" class="office-logo">' +
              '<div class="office-pulse"></div>' +
              '</div>',
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28]
      });
    } else {
      icon = L.divIcon({
        html: '<div class="map-dot cat-' + getDisplayCat(place) + '" data-id="' + place.id + '">' +
              '<span class="dot-icon">' + place.icon + '</span>' +
              '</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20]
      });
    }

    var markerOpts = { icon: icon };
    if (place.cat.includes('office')) {
      markerOpts.zIndexOffset = 1000;
    }
    const marker = L.marker([place.lat, place.lng], markerOpts);
    marker.bindPopup(function () { return buildPopup(place); }, {
      maxWidth: 300,
      autoPan: true,
      autoPanPadding: L.point(40, 40)
    });
    marker.on('click', function () {
      // Gently pan to show marker+popup without aggressive zoom
      var currentZoom = leafletMap.getZoom();
      var targetZoom = Math.max(currentZoom, 12); // don't zoom beyond 12 on click
      // Offset so popup (above marker) stays visible
      var px = leafletMap.project([place.lat, place.lng], targetZoom);
      px.y -= 80;
      var offsetLatLng = leafletMap.unproject(px, targetZoom);
      leafletMap.flyTo(offsetLatLng, targetZoom, { duration: 0.6 });
    });
    marker.addTo(leafletMap);
    mapMarkers[place.id] = marker;
  });
}

function buildPopup(place) {
  const inRoute = Route.has(place.id);
  const btnClass = inRoute ? 'popup-add-btn in-route' : 'popup-add-btn';
  const btnText = inRoute ? '✓ В маршруте — убрать' : '+ Добавить в маршрут';
  const catLabel = CAT_LABELS[getDisplayCat(place)] || getDisplayCat(place);
  const fuelCost = Math.round(place.km_from_patong / 100 * FUEL_L_PER_100KM * FUEL_PRICE_THB);
  const driveMin = Math.round(place.km_from_patong * SPEED_MIN_PER_KM);
  const isTop = place.cat.includes('top');
  const topBadge = isTop ? '<span class="popup-top-badge">⭐ TOP</span>' : '';
  const tipLine = place.tips ? '<div class="popup-tip">💡 ' + place.tips + '</div>' : '';
  const imgBlock = place.img ? '<div class="popup-img"><img src="' + place.img + '" alt="' + place.name + '" loading="lazy"></div>' : '';

  return '<div class="place-popup">' +
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
}

function togglePlaceFromMap(id) {
  const place = PLACES.find(function (p) { return p.id === id; });
  if (!place) return;
  Route.toggle(place);
  // Refresh popup
  const marker = mapMarkers[id];
  if (marker && marker.isPopupOpen()) {
    marker.setPopupContent(buildPopup(place));
  }
}

/* ===== Auto-zoom to fit route ===== */
function autoZoomRoute(places) {
  if (places.length === 0) return;
  if (places.length === 1) {
    leafletMap.flyTo([places[0].lat, places[0].lng], 13, { duration: 0.4 });
    return;
  }
  var bounds = L.latLngBounds(places.map(function (p) { return [p.lat, p.lng]; }));
  leafletMap.flyToBounds(bounds, {
    padding: [50, 50],
    maxZoom: 14,
    duration: 0.5
  });
}

/* ===== Route line ===== */
function updateRouteLine(places) {
  if (routeLine) {
    leafletMap.removeLayer(routeLine);
    routeLine = null;
  }
  if (places.length < 2) return;

  const latlngs = places.map(function (p) { return [p.lat, p.lng]; });
  routeLine = L.polyline(latlngs, {
    color: '#BBFF46',
    weight: 3,
    opacity: 0.7,
    dashArray: '8, 6'
  }).addTo(leafletMap);
}

/* ===== Marker states (numbers + start/finish badges) ===== */
function updateMarkerStates(routePlaces) {
  var rPlaces = routePlaces || Route.places;
  PLACES.forEach(function (place) {
    const marker = mapMarkers[place.id];
    if (!marker) return;
    const el = marker.getElement();
    if (!el) return;
    const dot = el.querySelector('.map-dot') || el.querySelector('.office-marker');
    if (!dot) return;

    const inRoute = Route.has(place.id);
    const existingBadge = dot.querySelector('.route-number');
    const existingLabel = dot.querySelector('.route-label');

    if (inRoute) {
      dot.classList.add('in-route');
      const idx = Route.indexOf(place.id) + 1;
      var isStart = (idx === 1);
      var isEnd = (idx === rPlaces.length && rPlaces.length > 1);

      // Number badge
      if (existingBadge) {
        existingBadge.textContent = idx;
      } else {
        const badge = document.createElement('span');
        badge.className = 'route-number';
        badge.textContent = idx;
        dot.appendChild(badge);
      }

      // Start/Finish label
      if (isStart || isEnd) {
        var labelText = isStart ? 'START' : '🏁';
        if (existingLabel) {
          existingLabel.textContent = labelText;
          existingLabel.className = 'route-label' + (isStart ? ' route-label-start' : ' route-label-end');
        } else {
          var label = document.createElement('span');
          label.className = 'route-label' + (isStart ? ' route-label-start' : ' route-label-end');
          label.textContent = labelText;
          dot.appendChild(label);
        }
      } else {
        if (existingLabel) existingLabel.remove();
      }
    } else {
      dot.classList.remove('in-route');
      if (existingBadge) existingBadge.remove();
      if (existingLabel) existingLabel.remove();
    }

    // Refresh popup if open
    if (marker.isPopupOpen()) {
      marker.setPopupContent(buildPopup(place));
    }
  });
}

function filterMapMarkers(cat) {
  var count = 0;
  PLACES.forEach(function (place) {
    var marker = mapMarkers[place.id];
    if (!marker) return;
    var isOffice = place.cat.includes('office');
    var inRoute = Route.has(place.id);
    var matches = placeMatchesCat(place, cat);
    // Route points and office always visible
    if (isOffice || inRoute || (matches && (cat !== 'all' || count < 80))) {
      if (!leafletMap.hasLayer(marker)) marker.addTo(leafletMap);
      if (!isOffice && !inRoute) count++;
    } else {
      if (leafletMap.hasLayer(marker)) leafletMap.removeLayer(marker);
    }
  });
}

function flyToPlace(id) {
  const place = PLACES.find(function (p) { return p.id === id; });
  if (!place) return;
  var currentZoom = leafletMap.getZoom();
  var targetZoom = Math.max(currentZoom, 12);
  var px = leafletMap.project([place.lat, place.lng], targetZoom);
  px.y -= 80;
  var offsetLatLng = leafletMap.unproject(px, targetZoom);
  leafletMap.flyTo(offsetLatLng, targetZoom, { duration: 0.6 });
  mapMarkers[id].openPopup();
}
