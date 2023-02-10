import TileLayer from "ol/layer/Tile";
import XYZ from 'ol/source/XYZ';

export const layer_open_street_map = new TileLayer({
    source: new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        crossOrigin: "anonymous",
    }),
});