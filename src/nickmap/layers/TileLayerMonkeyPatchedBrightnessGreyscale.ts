import TileLayer from "ol/layer/Tile";
import TileSource from "ol/source/Tile";

export type TileLayerMonkeyPatchedBrightnessGreyscale<T extends TileSource> = TileLayer<T> & { __BRIGHTNESS: number; __GREYSCALE: number; };
export function monkey_patch_brightness_greyscale_layer<T extends TileSource>(layer: TileLayer<T>): TileLayerMonkeyPatchedBrightnessGreyscale<T> {
    (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>).__BRIGHTNESS = 60;
    (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>).__GREYSCALE = 80;
    layer.on('prerender', function (evt) {
        const self = (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>);
        const brightness = self.__BRIGHTNESS;
        const greyscale  = self.__GREYSCALE;
        
        (evt.context as CanvasRenderingContext2D).filter =
            `brightness(${brightness}%) grayscale(${greyscale})`;
    });
    layer.on('postrender', function (evt) {
        (evt.context as CanvasRenderingContext2D).filter
            = "none";
    });
    return layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>;

}
