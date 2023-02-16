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
import {Control, defaults as get_default_controls, Rotate, ScaleLine} from 'ol/control';
import { NickMapControls } from './NickMapControls';
import {get_NickMapControls} from './NickMapControlsReact'
import "./nickmap_style.css";
import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export default class NickMap{
    vector_source_data:VectorSource;
    vector_layer_data:VectorLayer<VectorSource>;
    road_network_layer_group:LayerGroup;
    map:Map;
    controls:any;
    
    constructor(dom_target:string|HTMLElement, host:IVisualHost){
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
        this.map = new Map({
            target:dom_target,
            controls:[new Rotate(), new ScaleLine()]
        });
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
            zoom: 8,
        }))

        //this.controls = new NickMapControls(this.map, host)
        this.controls = get_NickMapControls(this.map, host);
        this.map.addControl(this.controls)

        this.map.getViewport().addEventListener("dragenter",function(event){
            event.dataTransfer.dropEffect = "move";
        })
        this.map.getViewport().addEventListener("dragover",function(event){
            event.preventDefault();
        })
        this.map.getViewport().addEventListener("drop", function(event){
            if (event.dataTransfer.getData("Text")==="the pegman commeth!"){
                // TODO:
                // let rec = event.target.getBoundingClientRect();
                // let px = [
                //     event.clientX - rec.left,
                //     event.clientY - rec.top
                // ];
                // let loc = map.getCoordinateFromPixel(px)
                // goto_google_street_view(loc);
            }
        });//,{capture:true})

        this.controls.set_version_display("v2022.12.02 (3.0.1) NickMap BI (TEST VERSION - Some Features not working)")
    }
    set_dom_target(dom_target:string|HTMLElement){
        this.map.setTarget(dom_target)
    }
    update_render_count(count_features:number, count_null:number){
        if(count_null){
            this.controls.set_status(`Showing ${count_features-count_null} of ${count_features}. <span style="color:#822;">Some rows were not rendered due to invalid road_number, slk_from or slk_to.</span>`)
        }else{
            this.controls.set_status(`Showing ${count_features} features`)
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