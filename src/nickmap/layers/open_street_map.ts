import TileLayer from "ol/layer/Tile";
import XYZ from 'ol/source/XYZ';
import {monkey_patch_brightness_greyscale_layer} from './TileLayerMonkeyPatchedBrightnessGreyscale';

export const layer_open_street_map = monkey_patch_brightness_greyscale_layer(new TileLayer({
    source: new XYZ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        //crossOrigin: "anonymous",
    })
}));
