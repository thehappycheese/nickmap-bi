import TileLayer from "ol/layer/Tile";
import TileSource from "ol/source/Tile";

export type TileLayerMonkeyPatchedBrightnessGreyscale<T extends TileSource> = TileLayer<T> & {
    __BRIGHTNESS: number;
    __CONTRAST:   number;
    __SATURATION: number;
};
export function monkey_patch_brightness_greyscale_layer<T extends TileSource>(layer: TileLayer<T>): TileLayerMonkeyPatchedBrightnessGreyscale<T> {
    (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>).__BRIGHTNESS = 100;
    (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>).__CONTRAST   = 100;
    (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>).__SATURATION = 100;

    layer.on('prerender', function (evt) {
        const self = (layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>);
        const brightness = self.__BRIGHTNESS;
        const contrast   = self.__CONTRAST;
        const saturation = self.__SATURATION;
        
        (evt.context as CanvasRenderingContext2D).filter =
            `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%)`;
    });
    layer.on('postrender', function (evt) {
        (evt.context as CanvasRenderingContext2D).filter
            = "none";
    });
    return layer as TileLayerMonkeyPatchedBrightnessGreyscale<T>;

}
