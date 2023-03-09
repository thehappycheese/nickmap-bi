import { TileArcGISRest } from "ol/source";
import TileLayer from "ol/layer/Tile";
import { monkey_patch_brightness_greyscale_layer } from "./TileLayerMonkeyPatchedBrightnessGreyscale";

export const layer_arcgis_rest = monkey_patch_brightness_greyscale_layer(new TileLayer({
    visible:false,
    source:new TileArcGISRest({})
}));