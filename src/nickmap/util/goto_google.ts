import { Map as OpenLayersMap } from "ol";
import {toLonLat} from "ol/proj"
import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export function goto_google_maps(map:OpenLayersMap, host:IVisualHost){
    let center = map.getView().getCenter();
    let zoom = map.getView().getZoom();
    if (center===undefined){
        // TODO: fail silently, like a fish
        return
    }
    if(zoom ===undefined){
        zoom=18;
    }
	let [lon, lat] = toLonLat(center);
	let z = zoom+1;
	host.launchUrl(`https://www.google.com.au/maps/@${lat.toFixed(8)},${lon.toFixed(8)},${z.toFixed(2)}z`);
}

export function goto_google_street_view(coord_xy:[number, number], host:IVisualHost){
	let [lon, lat] = toLonLat(coord_xy);
	host.launchUrl(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(8)},${lon.toFixed(8)}`);
}