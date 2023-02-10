import GeoJSON from 'ol/format/GeoJSON';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';

import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import View from 'ol/View';
import { esri_vector_source } from './esri_vector_layer_loader';

import {
    layer_state_road,
    get_layer_state_road_ticks,
    layer_open_street_map,
    layer_wmts,
    layer_arcgis_rest,
} from './layers'
import {Group as LayerGroup} from 'ol/layer';
import Collection from 'ol/Collection';
import {Control, defaults as get_default_controls} from 'ol/control';
import { build_nickmap_controls as build_nickmap_control } from './build_nickmap_controls';
import "./nickmap_style.css";


export default class NickMap{ 
    feature_count_status:HTMLDivElement;
    
    
    
    vector_source_data:VectorSource;
    vector_layer_data:VectorLayer<VectorSource>;
    road_network_layer_group:LayerGroup;
    map:Map;
    
    constructor(dom_target?:string|HTMLElement|undefined){
        // layers used to display PowerBI data
        this.vector_source_data = new VectorSource();
        this.vector_layer_data = new VectorLayer({
            source:this.vector_source_data,
            style:(item) => new Style({
                stroke:new Stroke({
                    width:2.5,
                    color:item.getProperties()["colour"]
                })
            })
        })
        // Build map
        this.map = new Map({});
        this.road_network_layer_group = new LayerGroup({
            layers:[
                layer_state_road,
                get_layer_state_road_ticks(this.map),
            ]
        });
        this.map.setLayers(new Collection([
            new LayerGroup({
                layers:[
                    layer_open_street_map,
                    layer_arcgis_rest,
                    layer_wmts,
                ]
            }),
            this.road_network_layer_group,
            this.vector_layer_data,
        ]))
        this.map.setView(new View({
            center: [12900824.756597541, -3758196.7323907884],
            zoom: 12,
        }))
        this.map.addControl(build_nickmap_control())
        
        if(dom_target){
            this.set_dom_target(dom_target)
        }
    }

    set_dom_target(dom_target:string|HTMLElement){
        this.map.setTarget(dom_target)
        let version_display_control = document.createElement("div");
		version_display_control.setAttribute("id","version_display_control")
		this.map.addControl(new Control({
			element: version_display_control,
		}));
        let version_text = document.createElement("div");
		version_text.setAttribute("id","version_text");
		version_text.innerHTML = "v2022.12.02 (3.0.1) NickMap BI (TEST VERSION - Some Features not working)"
		version_display_control.appendChild(version_text);
        this.feature_count_status = document.createElement("div");
		this.feature_count_status.setAttribute("id","null_text");
		this.feature_count_status.innerHTML = ""
		version_display_control.appendChild(this.feature_count_status);
    }
    update_render_count(count_features:number, count_null:number){
        if(count_null){
            this.feature_count_status.innerHTML = `Showing ${count_features-count_null} of ${count_features}. <span style="color:#822;">Some rows were not rendered due to invalid road_number, slk_from or slk_to.</span>`
        }else{
            this.feature_count_status.innerHTML = `Showing ${count_features} features`
        }
    }
    replace_features(geojson:{type:"FeatureCollection", features:any[]}, colours:string[]){
        if(colours.length!==geojson.features.length){
            throw `Length mismatch :( ${colours.length} - ${geojson.features.length}`
        }
        let null_count = 0;
        for(let i=0;i<geojson.features.length;i++){
            if(geojson.features[i]){
                geojson.features[i].properties = {colour:colours[i]}
            }else{
                null_count++;
            }
        }
        this.update_render_count(geojson.features.length, null_count);
        geojson.features = geojson.features.filter(item=>item)
        this.vector_source_data.clear();
        if (geojson.features.length>0){
            let features = new GeoJSON().readFeatures(geojson,{
                featureProjection:"EPSG:3857", // target: openlayers default projection
                dataProjection:"EPSG:4326", // source: geojson exclusively uses WGS84 which is known as 4326 in the EPSG system
            })
            this.vector_source_data.addFeatures(features)
            this.map.getView().fit(this.vector_source_data.getExtent())
        }
    }
    set_wmts_layer(url:string, show:boolean){
        if (url && show){
            layer_wmts.getSource().setUrl(url)
            layer_wmts.setVisible(true)
        }else{
            layer_wmts.setVisible(false)
        }
    }
    set_arcgis_rest_layer(url:string, show:boolean){
        if (url && show){
            layer_arcgis_rest.getSource().setUrl(url)
            layer_arcgis_rest.setVisible(true)
        }else{
            layer_arcgis_rest.setVisible(false)
        }
    }
}