import TileLayer from "ol/layer/Tile";
import XYZ from 'ol/source/XYZ';
import { monkey_patch_brightness_greyscale_layer } from "./TileLayerMonkeyPatchedBrightnessGreyscale";

export const layer_wmts = monkey_patch_brightness_greyscale_layer(new TileLayer({
    visible:false,
    source: new XYZ({})
}));