import { TileArcGISRest } from "ol/source";
import TileLayer from "ol/layer/Tile";
export const layer_arcgis_rest:TileLayer<TileArcGISRest> = new TileLayer({
    visible:false,
    source:new TileArcGISRest({})
});