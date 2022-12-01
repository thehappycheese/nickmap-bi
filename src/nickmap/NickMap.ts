import Map from 'ol/Map';
import View from 'ol/View';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';

import Style from 'ol/style/Style';

import Stroke from 'ol/style/Stroke';
import { Color } from 'ol/color';



export default class NickMap{ 
    map:Map;
    vector_source:VectorSource;
    constructor(dom_target?:string|HTMLElement|undefined){
        this.vector_source = new VectorSource();
        this.map = new Map({
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        crossOrigin: "anonymous",
                    }),
                    
                }),
                new VectorLayer({
                    source:this.vector_source,
                    style:(item) => new Style({
                        stroke:new Stroke({
                            width:2,
                            color:item.getProperties()["colour"]
                        })
                    })
                })
            ],
            view: new View({
                center: [0, 0],
                zoom: 2
            })
        });
        if(dom_target){
            this.map.setTarget(dom_target)
        }
    }
    set_dom_target(dom_target:string|HTMLElement){
        this.map.setTarget(dom_target)
    }
    replace_features(geojson:{type:"FeatureCollection", features:any[]}, colours:string[]){
        if(colours.length!==geojson.features.length){
            throw `Length mismatch :( ${colours.length} - ${geojson.features.length}`
        }
        for(let i=0;i<geojson.features.length;i++){
            if(geojson.features[i]){
                geojson.features[i].properties = {colour:colours[i]}
            }
        }
        geojson.features = geojson.features.filter(item=>item)
        this.vector_source.clear();
        if (geojson.features.length>0){
            let features = new GeoJSON().readFeatures(geojson,{
                featureProjection:"EPSG:3857", // target: openlayers default projection
                dataProjection:"EPSG:4326", // source: geojson exclusively uses WGS84 which is known as 4326 in the EPSG system
            })
            this.vector_source.addFeatures(features)
            this.map.getView().fit(this.vector_source.getExtent())
        }
    }
}