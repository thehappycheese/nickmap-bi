import GeoJSON from 'ol/format/GeoJSON';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { TileArcGISRest } from "ol/source";
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import View from 'ol/View';
import { esri_vector_source } from './esri_vector_layer_loader';
import { get_road_network_layers } from './road_network';
import {Group as LayerGroup} from 'ol/layer';
import Collection from 'ol/Collection';
import Control from 'ol/control/Control';


export default class NickMap{ 
    feature_count_status:HTMLDivElement;

    layer_open_street_maps = new TileLayer({
        source: new XYZ({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            crossOrigin: "anonymous",
        }),
    });
    layer_wmts:TileLayer<XYZ> = new TileLayer({
        visible:false,
        source: new XYZ({})
    });
    layer_arcgis_rest:TileLayer<TileArcGISRest> = new TileLayer({
        visible:false,
        source:new TileArcGISRest({})
    });
    vector_source_data:VectorSource = new VectorSource();
    vector_layer_data = new VectorLayer({
        source:this.vector_source_data,
        style:(item) => new Style({
            stroke:new Stroke({
                width:2.5,
                color:item.getProperties()["colour"]
            })
        })
    })
    road_network_layer_group = new LayerGroup();
    map = new Map({
        layers: [
            new LayerGroup({
                layers:[
                    this.layer_open_street_maps,
                    this.layer_arcgis_rest,
                    this.layer_wmts,
                ]
            }),
            this.road_network_layer_group,
            this.vector_layer_data,
        ],
        view: new View({
            center: [0, 0],
            zoom: 2
        })
    });
    // Due to nasty circular dependency caused by OpenLayers lacklustre custom renderer api
    // the road network layer must be added to the map after the map is constructed
    layer_road_network:VectorLayer<esri_vector_source>;
    layer_road_network_ticks:VectorLayer<esri_vector_source>;
    
    constructor(dom_target?:string|HTMLElement|undefined){
        [this.layer_road_network, this.layer_road_network_ticks] = get_road_network_layers(this.map)
        this.road_network_layer_group.setLayers(new Collection([this.layer_road_network, this.layer_road_network_ticks]))
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
            this.layer_wmts.getSource().setUrl(url)
            this.layer_wmts.setVisible(true)
        }else{
            this.layer_wmts.setVisible(false)
        }
    }
    set_arcgis_rest_layer(url:string, show:boolean){
        if (url && show){
            this.layer_arcgis_rest.getSource().setUrl(url)
            this.layer_arcgis_rest.setVisible(true)
        }else{
            this.layer_arcgis_rest.setVisible(false)
        }
    }
}
