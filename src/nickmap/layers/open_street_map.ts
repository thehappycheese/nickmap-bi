import TileLayer from "ol/layer/Tile";
import XYZ from 'ol/source/XYZ';

export const layer_open_street_map = new TileLayer({
    source: new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        crossOrigin: "anonymous",
    }),
});

layer_open_street_map.on('prerender', function (evt) {
    (evt.context as CanvasRenderingContext2D).filter
        = "brightness(90%) grayscale(30%)";
});
layer_open_street_map.on('postrender', function (evt) {
    (evt.context as CanvasRenderingContext2D).filter
        = "none";
});