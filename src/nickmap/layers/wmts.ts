import TileLayer from "ol/layer/Tile";
import XYZ from 'ol/source/XYZ';

export const layer_wmts:TileLayer<XYZ> = new TileLayer({
    visible:false,
    source: new XYZ({})
});