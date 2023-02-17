import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';

import VectorSource from 'ol/source/Vector';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import View from 'ol/View';

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
import {goto_google_maps, goto_google_street_view} from './util/goto_google'
import "./nickmap_style.css";
import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { useEffect, useRef } from 'react';

import * as React from "react";
import * as ReactDOM from "react-dom";

type NickMapProps = {
    host:IVisualHost,
    children:any[],
    layer_wmts_url:string,
    layer_wmts_show:boolean,
    set_layer_wmts_show:(new_value:boolean)=>void,

    layer_arcgis_rest_url:string,
    layer_arcgis_rest_show:boolean,
    set_layer_arcgis_rest_show:(new_value:boolean)=>void,
}

export function NickMap(props:NickMapProps){

    const map_root_ref = useRef<HTMLDivElement>();
    const map_ref = useRef(new Map({
        controls:[
            new Rotate(),
            new ScaleLine()
        ],
        view:new View({
            center: [12900824.756597541, -3758196.7323907884],
            zoom: 8,
        })
    }))
    
    
    useEffect(()=>{ // Mount
        let map = map_ref.current;
        map.setTarget(map_root_ref.current);
        let vector_source_data = new VectorSource({});
        let vector_layer_data = new VectorLayer({
            source:vector_source_data,
            style:(item) => new Style({
                stroke:new Stroke({
                    width:2.5,
                    color:item.getProperties()["colour"]
                })
            })
        })
        // Build map
        let road_network_layer_group = new LayerGroup({
            layers:[
                layer_state_road,
                get_layer_state_road_ticks(map),
            ]
        });
        map.setLayers(new Collection([
            new LayerGroup({
                layers:[
                    layer_open_street_map,
                    layer_arcgis_rest,
                    layer_wmts,
                ]
            }),
            road_network_layer_group,
            vector_layer_data,
        ]))

        map.getViewport().addEventListener("dragenter",function(event){
            event.dataTransfer.dropEffect = "move";
        })
        map.getViewport().addEventListener("dragover",function(event){
            event.preventDefault();
        })
        map.getViewport().addEventListener("drop", function(event){
            let target:HTMLDivElement = event.target as HTMLDivElement;
            if (event.dataTransfer.getData("Text")==="the pegman commeth!"){
                let rec = target.getBoundingClientRect();
                let px = [
                    event.clientX - rec.left,
                    event.clientY - rec.top
                ];
                let loc = map.getCoordinateFromPixel(px) as [number,number]
                goto_google_street_view(loc, props.host);
            }
        });
    },[]);// End Mount


    useEffect(()=>{
        if (props.layer_wmts_url && props.layer_wmts_show){
            layer_wmts.getSource().setUrl(props.layer_wmts_url)
            layer_wmts.setVisible(true)
        }else{
            layer_wmts.setVisible(false)
        }
    },[props.layer_wmts_url, props.layer_wmts_show])

    useEffect(()=>{
        if (props.layer_arcgis_rest_url && props.layer_arcgis_rest_show){
            layer_arcgis_rest.getSource().setUrl(props.layer_arcgis_rest_url)
            layer_arcgis_rest.setVisible(true)
        }else{
            layer_arcgis_rest.setVisible(false)
        }
    },[props.layer_arcgis_rest_url, props.layer_arcgis_rest_show])

    

    return <div id="nickmap-controls-map-container">
        <NickMapControls
            status_text="status"
            version_display="version"
            on_go_to_google_maps={()=>{
                let center = map_ref.current.getView().getCenter();
                let zoom = map_ref.current.getView().getZoom();
                goto_google_maps(center, zoom, props.host)
            }}

            layer_wmts_url={props.layer_wmts_url}
            layer_wmts_show={props.layer_wmts_show}
            set_layer_wmts_show={props.set_layer_wmts_show}

            layer_arcgis_rest_url={props.layer_arcgis_rest_url}
            layer_arcgis_rest_show={props.layer_arcgis_rest_show}
            set_layer_arcgis_rest_show={props.set_layer_arcgis_rest_show}

        />
        <div ref={map_root_ref} id="nickmap-map-host"></div>
    </div>
}
// class defunct{
//     set_dom_target(dom_target:string|HTMLElement){
//         this.map.setTarget(dom_target)
//     }
//     update_render_count(count_features:number, count_null:number){
//         if(count_null){
//             this.controls.set_status(`Showing ${count_features-count_null} of ${count_features}. <span style="color:#822;">Some rows were not rendered due to invalid road_number, slk_from or slk_to.</span>`)
//         }else{
//             this.controls.set_status(`Showing ${count_features} features`)
//         }
//     }
//     replace_features(geojson:{type:"FeatureCollection", features:any[]}, colours:string[]){
//         if(colours.length!==geojson.features.length){
//             throw `Length mismatch :( ${colours.length} - ${geojson.features.length}`
//         }
//         let null_count = 0;
//         for(let i=0;i<geojson.features.length;i++){
//             if(geojson.features[i]){
//                 geojson.features[i].properties = {colour:colours[i]}
//             }else{
//                 null_count++;
//             }
//         }
//         this.update_render_count(geojson.features.length, null_count);
//         geojson.features = geojson.features.filter(item=>item)
//         this.vector_source_data.clear();
//         if (geojson.features.length>0){
//             let features = new GeoJSON().readFeatures(geojson,{
//                 featureProjection:"EPSG:3857", // target: openlayers default projection
//                 dataProjection:"EPSG:4326", // source: geojson exclusively uses WGS84 which is known as 4326 in the EPSG system
//             })
//             this.vector_source_data.addFeatures(features)
//             this.map.getView().fit(this.vector_source_data.getExtent())
//         }
//     }
//     set_wmts_layer(url:string, show:boolean){
//         if (url && show){
//             layer_wmts.getSource().setUrl(url)
//             layer_wmts.setVisible(true)
//         }else{
//             layer_wmts.setVisible(false)
//         }
//     }
//     set_arcgis_rest_layer(url:string, show:boolean){
//         if (url && show){
//             layer_arcgis_rest.getSource().setUrl(url)
//             layer_arcgis_rest.setVisible(true)
//         }else{
//             layer_arcgis_rest.setVisible(false)
//         }
//     }
// }