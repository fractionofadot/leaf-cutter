// by Robert Parker, John Hayes

function gtiles(host, gcat, gitem, gwidth, gheight) {

   var num = 0;

   var w = gwidth;
   var h = gheight;
   var levels = findLev(w, h);

   var baseurl = "http://" + host + "/lizardtech/iserv/getimage?";
   var url = baseurl + "cat=" + gcat + "&item=" + gitem + "&wid=256&hei=256&oif=jpeg&lev={l}&cp={c}";


  var GetImageLayer = L.TileLayer.extend({
      getTileUrl: function (tilePoint) {
          this._adjustTilePoint(tilePoint);

          //var levels = findLev(w, h);
          var x = tilePoint.x;
          var y = tilePoint.y;
          var z = this._getZoomForUrl();

          if (z < levels.length) {
            var info = levels[z];

            var cpx =   ((x + .5) * 256) / info.width - info.dx;
            var cpy =   ((y + .5) * 256) / info.height - info.dy;
            var level = info.level;

             return L.Util.template(this._url, {
              l: info.level,
              c: cpx + "," + cpy
            });

          }
          else
          {
            return null;
          }
      },
  });

  var layer = new GetImageLayer(url, {
    noWrap: true,
    maxZoom: findLev(w,h).length - 1,
    minZoom: 0
  });

  var map = new L.Map('map', {
      layers: [layer],
      center: new L.LatLng(0.0, 0.0),
      zoom: 0
  });

  for (i=levels.length - 1; levels[i].width > map.getSize().x; i--) {
  }
  map.setZoom(i);


  // Initialise the FeatureGroup to store editable layers
  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Initialise the draw control and pass it the FeatureGroup of editable layers
  var drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        marker: false,
        circle: false,
        polygon: false,
        rectangle: {
          shapeOptions: {
            color: '#FF0000',
            weight: 2
          }
        }
      },
      edit: {
          featureGroup: drawnItems,
          edit: false,
          remove: true
      }
  });
  map.addControl(drawControl);

  map.on('draw:created', function (e) {
      var type = e.layerType,
          layer = e.layer;

      drawnItems.addLayer(layer);
      var nw = map.project(layer.getBounds().getNorthWest());
      var ne = map.project(layer.getBounds().getNorthEast());
      var sw = map.project(layer.getBounds().getSouthWest());

      var center = map.project(layer.getBounds().getCenter());

      // convert rect center to getimage cp
      // first convert map coordinates to item coords
      var mapSize =  256 * Math.pow(2,map.getZoom());
      var item = levels[map.getZoom()];
      var xdif = (mapSize - item.width) / 2;
      var ydif = (mapSize - item.height) / 2;
      var cp1 = (center.x - xdif) / item.width;
      var cp2 = (center.y - ydif) / item.height;

      // convert rect w&h to w&h @ getimage level 0 

      var rw = nw.distanceTo(ne);
      var rh = nw.distanceTo(sw);

      var exportWidth = rw; //map.project(layer.getBounds().getNorthWest()).distanceTo(map.project(layer.getBounds().getNorthEast()));
      var exportHeight = rh; //map.project(layer.getBounds().getNorthWest()).distanceTo(map.project(layer.getBounds().getSouthWest()));;

      for (i = map.getZoom(); i < map.getMaxZoom(); i++) {
        exportWidth = exportWidth * 2;
        exportHeight = exportHeight * 2;
      }

      var thumb = getThumb(exportWidth,exportHeight);

      var thumbsrc = baseurl + "cat=" + gcat + "&item=" + gitem + "&wid=" + thumb.width + "&hei=" + thumb.height + "&lev=" + thumb.level + "&cp=" + cp1 + "," + cp2 + "&oif=jpg";

      var nominalSizeInBytes = (exportWidth * exportHeight * 24) / 8;
      var compressedSize = nominalSizeInBytes / 2;
      var exportURL = baseurl + "cat=" + gcat + "&item=" + gitem + "&wid=" + Math.ceil(exportWidth) + "&hei=" + Math.ceil(exportHeight) + "&lev=0&cp=" + cp1 + "," + cp2 + "&oif=sid";
      document.getElementById('items').innerHTML += "<div id='item'><b>" + Math.ceil(exportWidth) + " x " + Math.ceil(exportHeight) + ", raw: " + bytesToSize(nominalSizeInBytes) + "</b><a href=\"" + exportURL + "\" target=\"export\"><img src='" + thumbsrc + "' alt='" + Math.ceil(exportWidth) + " x " + Math.ceil(exportHeight) + ", " + bytesToSize(nominalSizeInBytes) + "'></a></div>";
      document.getElementById("extract").style.display = "block";
      map.removeLayer(drawnItems);
      console.log(exportURL);
      console.log(bytesToSize(nominalSizeInBytes));
      //http://localhost/lizardtech/iserv/getimage?cat=MODIS&item=iserv-catalog-index&oif=jpeg&lev=0&wid=544&hei=576&cp=0.5914814814814815,0.5059236677834232

  });
}

function closeExportWindow() {
  document.getElementById("extract").style.display = "none";
}

function getThumb(w,h) {
  l = 0;

  while (Math.max(w,h) > 200) {
    w = Math.ceil(w / 2);
    h = Math.ceil(h / 2);
    l = l + 1;
  }

  var thumb = {width: w, height: h, level: l};

  return thumb;
}

function bytesToSize(bytes) {
   var sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Bytes';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

function findLev(w, h) {
  var levels = new Array;


  levels[0] = { width: w, height: h, level:0, dx:0, dy:0 };
  var i = 0;

  while (Math.max(w, h) > 256) {
    w = Math.ceil( w / 2 ); 
    h = Math.ceil( h / 2 );

    i += 1;
    levels[i] = { width: w, height: h, level:i, dx:0, dy:0 };
  }

  levels.reverse();

  for (var z = 0; z < levels.length; z += 1) {
    var size = 256 *  Math.pow(2, z);
    levels[z].dx = (size - levels[z].width) / (2 * levels[z].width);
    levels[z].dy = (size - levels[z].height) / (2 * levels[z].height);
  }

  return levels;

}