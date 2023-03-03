import { Map as OpenLayersMap } from 'ol';
import Collection from 'ol/Collection';
import { Rotate, ScaleLine } from 'ol/control';
import { platformModifierKeyOnly } from 'ol/events/condition';
import GeoJSON from 'ol/format/GeoJSON';
import { DragBox, Select } from 'ol/interaction';
import { Group as LayerGroup } from 'ol/layer';
import { Vector as VectorLayer} from 'ol/layer';
import { clearUserProjection, fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import View from 'ol/View';

import powerbi from "powerbi-visuals-api";

import { useEffect, useRef, useState } from 'react';

import {
    get_layer_state_road_ticks,
    layer_arcgis_rest,
    layer_open_street_map,
    layer_state_road,
    layer_wmts
} from './layers';

import "./nickmap.css";
import { NickMapControls } from './NickMapControls';
import { goto_google_maps, goto_google_street_view } from './util/goto_google';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as React from "react";
import { NickmapFeatureCollection } from '../NickmapFeatures';
import { Fetch_Data_State } from './Fetch_Data_Sate';
import { ITooltipServiceWrapper } from 'powerbi-visuals-utils-tooltiputils';
import { feature_tooltip_items } from '../dataview_table_helpers';
import { road_network_styles } from './layers/road_network';
import { active } from 'd3';

type NickMapProps = {
    
    host:IVisualHost // good change to try context provider
    version_text:string

    layer_arcgis_rest_url:string
    layer_arcgis_rest_show_initial:boolean
    
    layer_wmts_url:string
    layer_wmts_show_initial:boolean

    layer_road_network_show_initial:boolean
    layer_road_network_ticks_show_initial:boolean
    layer_road_network_state_colour:string
    layer_road_network_psp_colour:string

    auto_zoom_initial:boolean
    controls_size:number
    controls_mode:"Collapsed"|"Expanded"|"Disabled"

    allow_drag_box_selection:boolean

    feature_collection:NickmapFeatureCollection
    feature_collection_request_count:number
    feature_loading_state:Fetch_Data_State


    selection_manager:powerbi.extensibility.ISelectionManager
    
    tooltip_service:powerbi.extensibility.ITooltipService
    tooltip_service_wrapper: ITooltipServiceWrapper

}

const default_map_view_settings = {
    zoom: 8,
    center: [12900824.756597541, -3758196.7323907884],
};

// I don't know why this is needed. I think typescript was not compiling properly. It was telling me it was undefined.
const local_platformModifierKeyOnly = platformModifierKeyOnly; 

export function NickMap(props:NickMapProps){
    const [auto_zoom                    , set_auto_zoom                    ] = useState(props.auto_zoom_initial);
    const [layer_arcgis_rest_show       , set_layer_arcgis_rest_show       ] = useState(props.layer_arcgis_rest_show_initial);
    const [layer_wmts_show              , set_layer_wmts_show              ] = useState(props.layer_wmts_show_initial);
    const [layer_road_network_show      , set_layer_road_network_show      ] = useState(props.layer_road_network_show_initial);
    const [layer_road_network_ticks_show, set_layer_road_network_ticks_show] = useState(props.layer_road_network_ticks_show_initial);
    const [zoom_to_road_slk_state       , set_zoom_to_road_slk_state       ] = React.useState<Fetch_Data_State>({type:"IDLE"})
    const vector_source_data_ref     = useRef<VectorSource>(new VectorSource({}))
    const map_root_ref               = useRef<HTMLDivElement>();
    const layer_state_road_ticks_ref = useRef<VectorLayer<VectorSource> | null>(null);

    const drag_interaction_ref       = useRef<DragBox>((()=>{
        let result = new DragBox({
            condition:local_platformModifierKeyOnly,
        })
        result.setActive(props.allow_drag_box_selection); // not available as a constructor option
        return result;
    })())

    useEffect(()=>{
        drag_interaction_ref.current.setActive(props.allow_drag_box_selection)
    },[props.allow_drag_box_selection])
    
    const select_interaction_ref     = useRef<Select>(null)
    const map_ref = useRef(new OpenLayersMap({
        controls:[
            new Rotate(),
            new ScaleLine()
        ],
        view:new View(default_map_view_settings)
    }))

    // ===============================
    // CLEAR SELECTION ON EVERY UPDATE
    // ===============================
    if(select_interaction_ref.current){
        select_interaction_ref.current.getFeatures().clear();
    }
    // =====
    // MOUNT
    // =====
    useEffect(()=>{
        let map = map_ref.current;
        map.setTarget(map_root_ref.current);
        let vector_layer_data = new VectorLayer({
            source:vector_source_data_ref.current,
            style:(item) => new Style({
                stroke:new Stroke({
                    width:item.getProperties()["line_width"],
                    color:item.getProperties()["colour"]
                })
            })
        })
        select_interaction_ref.current = new Select({
            layers:[vector_layer_data],
            style:item => [
                new Style({
                    stroke:new Stroke({
                        width:8,
                        color:"white"
                    })
                }),
                new Style({
                    stroke:new Stroke({
                        width:2.5,
                        color:item.getProperties()["colour"]
                    })
                })
            ]
        });
        map.addInteraction(select_interaction_ref.current);
        map.addInteraction(drag_interaction_ref.current);
        drag_interaction_ref.current.on('boxend', (event) => {
            const extent = drag_interaction_ref.current.getGeometry().getExtent();
            const boxFeatures = vector_source_data_ref.current
                .getFeaturesInExtent(extent)
                .filter((feature) => feature.getGeometry().intersectsExtent(extent));
            // features that intersect the box geometry are added to the
            // collection of selected features

            // if the view is not obliquely rotated the box geometry and
            // its extent are equivalent so intersecting features can
            // be added directly to the collection
            
            const rotation = map.getView().getRotation();
            const oblique = rotation % (Math.PI / 2) !== 0;

            // when the view is obliquely rotated the box extent will
            // exceed its geometry so both the box and the candidate
            // feature geometries are rotated around a common anchor
            // to confirm that, with the box geometry aligned with its
            // extent, the geometries intersect
            if (oblique) {
                const anchor = [0, 0];
                const geometry = drag_interaction_ref.current.getGeometry().clone();
                geometry.rotate(-rotation, anchor);
                const extent = geometry.getExtent();
                const selection_list = [];
                boxFeatures.forEach(function (feature) {
                    const geometry = feature.getGeometry().clone();
                    geometry.rotate(-rotation, anchor);
                    if (geometry.intersectsExtent(extent)) {
                        select_interaction_ref.current.getFeatures().push(feature);
                        selection_list.push(...select_interaction_ref.current.getFeatures().getArray().map(item=>item.get("selection_id")))
                    }
                });
                props.selection_manager.select(selection_list)
            } else {
                select_interaction_ref.current.getFeatures().extend(boxFeatures);
                props.selection_manager.select(select_interaction_ref.current.getFeatures().getArray().map(item=>item.get("selection_id")))
            }
        })
        
        select_interaction_ref.current.on("select", e => {
            //if((e.mapBrowserEvent.originalEvent as MouseEvent).isTrusted) // TODO: is this check needed?
            //console.log("TODO MOUNT - Select Interaction on Select")
            props.selection_manager
                .clear()
                .then(
                    ()=>props.selection_manager.select(e.selected.map(item=>item.get("selection_id")))
                ).then(()=>{
                    let selected_item_tooltips:feature_tooltip_items[] = e.selected.map(item=>item.get("tooltips"))
                    if(selected_item_tooltips.length===1){
                        props.tooltip_service.show({
                            coordinates:[
                                e.mapBrowserEvent.originalEvent.clientX,
                                e.mapBrowserEvent.originalEvent.clientY
                            ],
                            dataItems:selected_item_tooltips[0].map(item=>({
                                displayName: item.column_name,
                                value: String(item.value),
                                color: "",
                                header: ""
                            })),
                            isTouchEvent:e.mapBrowserEvent.originalEvent?.pointerType==="touch",
                            identities:e.selected.map(item=>item.get("selection_id"))
                        })
                    }
                });
        })
        
        // Set up road network layer group
        layer_state_road_ticks_ref.current = get_layer_state_road_ticks(map)
        let road_network_layer_group = new LayerGroup({
            layers:[
                layer_state_road,
                layer_state_road_ticks_ref.current,
            ]
        });

        // Build map
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
        render_features_helper(vector_source_data_ref.current, props.feature_collection, map_ref.current);
    },[]);


    // ===============================
    // ROAD NETWORK STYLE & VISIBILITY
    // ===============================
    useEffect(()=>{
        road_network_styles["State Road"].getStroke().setColor(props.layer_road_network_state_colour)
        layer_state_road.changed()
    },[props.layer_road_network_state_colour])

    useEffect(()=>{
        road_network_styles["Main Roads Controlled Path"].getStroke().setColor(props.layer_road_network_psp_colour)
        layer_state_road.changed()
    },[props.layer_road_network_psp_colour])

    useEffect(()=>{
        layer_state_road.setVisible(layer_road_network_show);
    },[layer_road_network_show])

    useEffect(()=>{
        if(layer_state_road_ticks_ref.current){
            layer_state_road_ticks_ref.current.setVisible(
                layer_road_network_ticks_show &&
                layer_road_network_show
            );
        }
    },[layer_road_network_show, layer_road_network_ticks_show, layer_state_road_ticks_ref.current]);

    // =====================
    // SYNCHRONIZE SELECTION
    // =====================
    //useEffect(()=>{
        // if(!select_interaction_ref.current) return;
        // let selected_features = select_interaction_ref.current.getFeatures()
        // selected_features.clear()
        // for(let feature_selection_id of props.selection){
        //     // TODO: this is probably slow
        //     const found_feature = vector_source_data_ref.current.getFeatures().find(feature=>feature.get("selection_id").equals(feature_selection_id));
        //     if (found_feature){
        //         selected_features.push(found_feature)
        //     }
        // }
    //},[(), props.set_selection, select_interaction_ref.current,vector_source_data_ref.current])

    if(props.selection_manager.hasSelection()){
        if(!select_interaction_ref.current) return;
        let selected_features = select_interaction_ref.current.getFeatures()
        selected_features.clear()
        for(let feature_selection_id of props.selection_manager.getSelectionIds()){
            // TODO: this is probably slow
            const found_feature = vector_source_data_ref.current.getFeatures().find(feature=>feature.get("selection_id").equals(feature_selection_id));
            if (found_feature){
                selected_features.push(found_feature)
            }
        }
    }


    // ============================
    // WMTS RASTER LAYER VISIBILITY
    // ============================
    useEffect(()=>{
        if (props.layer_wmts_url && layer_wmts_show){
            layer_wmts.getSource().setUrl(props.layer_wmts_url)
            layer_wmts.setVisible(true)
        }else{
            layer_wmts.setVisible(false)
        }
    },[props.layer_wmts_url, layer_wmts_show])

    // ==============================
    // ARCGIS RASTER LAYER VISIBILITY
    // ==============================
    useEffect(()=>{
        if (props.layer_arcgis_rest_url && layer_arcgis_rest_show){
            layer_arcgis_rest.getSource().setUrl(props.layer_arcgis_rest_url)
            layer_arcgis_rest.setVisible(true)
        }else{
            layer_arcgis_rest.setVisible(false)
        }
    },[props.layer_arcgis_rest_url, layer_arcgis_rest_show])

    // ============================
    // ROAD NETWORK LAYER VISIBILITY
    // ============================
    useEffect(()=>{
        if (props.layer_wmts_url && layer_wmts_show){
            layer_wmts.getSource().setUrl(props.layer_wmts_url)
            layer_wmts.setVisible(true)
        }else{
            layer_wmts.setVisible(false)
        }
    },[props.layer_wmts_url, layer_wmts_show])

    // =======================
    // UPDATE VISIBLE FEATURES
    // =======================
    useEffect(()=>{
        render_features_helper(
            vector_source_data_ref.current,
            props.feature_collection,
            map_ref.current,
            props.auto_zoom_initial
        );
    },[props.feature_collection])


    // ==============
    // ZOOM TO EXTENT
    // ==============
    const zoom_to_extent = React.useCallback(()=>{
        if(vector_source_data_ref.current.getFeatures().length===0){
            set_view_properties(
                map_ref.current,
                default_map_view_settings.zoom,
                default_map_view_settings.center
            )
        }else{
            map_ref.current.getView().fit(vector_source_data_ref.current.getExtent())
        }
    },[map_ref.current, vector_source_data_ref.current])

    // ==================
    // ZOOM TO ROAD / SLK
    // ==================
    const zoom_to_road_slk = React.useCallback(async (road_number:string, slk:number)=>{
        console.log(`Zoom to ${road_number} ${slk}`)
        set_zoom_to_road_slk_state({"type":"PENDING"})
        let response = await fetch(
            `https://linref.thehappycheese.com/?road=${road_number}&slk=${slk}&f=latlon`,
            {
                mode:"cors"
            }
        );
        if(response.ok){
            let response_text = await response.text();
            let [lat,lon] = response_text.split(",");
            set_view_properties(
                map_ref.current,
                18,//props.auto_zoom ? 18 : map_ref.current.getView().getZoom(),
                fromLonLat([parseFloat(lon),parseFloat(lat)])
            )
            set_zoom_to_road_slk_state({type:"SUCCESS"})
        }else{
            console.log(`FAILED: Zoom to ${road_number} ${slk}; Server responded ${response.status} ${response.statusText}`)
            set_zoom_to_road_slk_state({type:"FAILED", reason:`${road_number} ${slk.toFixed(3)} not found.`})
            // TODO: notify user
        }
    },[map_ref.current, set_zoom_to_road_slk_state])

    // ======
    // RENDER
    // ======
    return <div className="nickmap-controls-map-container">
        <div className="nickmap-controls-overlay" style={{fontSize:`${props.controls_size || 100}%`}}>
            {
                props.controls_mode !== "Disabled" &&
                <NickMapControls
                    on_go_to_google_maps={()=>{
                        let center = map_ref.current.getView().getCenter();
                        let zoom = map_ref.current.getView().getZoom();
                        goto_google_maps(center, zoom, props.host)
                    }}

                    layer_wmts_available        = {props.layer_wmts_url!==""}
                    layer_wmts_show             = {layer_wmts_show}
                    set_layer_wmts_show         = {set_layer_wmts_show}

                    layer_arcgis_rest_available = {props.layer_arcgis_rest_url!==""}
                    layer_arcgis_rest_show      = {layer_arcgis_rest_show}
                    set_layer_arcgis_rest_show  = {set_layer_arcgis_rest_show}


                    layer_road_network_show     = {layer_road_network_show}
                    set_layer_road_network_show = {set_layer_road_network_show}
                    layer_road_network_ticks_show     = {layer_road_network_ticks_show}
                    set_layer_road_network_ticks_show = {set_layer_road_network_ticks_show}
                    
                    on_zoom_to_extent           = {zoom_to_extent}
                    on_zoom_to_road_slk         = {zoom_to_road_slk}
                    zoom_to_road_slk_state      = {zoom_to_road_slk_state}
                    auto_zoom                   = {auto_zoom}
                    set_auto_zoom               = {set_auto_zoom}

                    hidden_initial            = {props.controls_mode === 'Collapsed'}
                />
            }
            <div className="nickmap-status-version-display">
                <div className="nickmap-status-text">{
                    build_status_display(props)
                }</div>
                <div className="nickmap-version-text" title={props.version_text}>{props.version_text}</div>
            </div>
        </div>
        <div ref={map_root_ref} className="nickmap-map-host"></div>
    </div>
}



function build_status_display(props:NickMapProps){
    switch(props.feature_loading_state.type){
        case "SUCCESS":
            return <>
                <>{
                    props.feature_collection_request_count===30_000 &&
                    <span className="nickmap-status-text-error">LIMITED TO FIRST 30,000 ROWS! </span>
                }</>
                <>{
                    props.feature_collection_request_count !== props.feature_collection.features.length &&
                    <span className='nickmap-status-text-warning'>{`NOT SHOWING ${props.feature_collection_request_count-props.feature_collection.features.length} INVALID ROWS. `}</span>
                }</>
                <>{`Showing ${props.feature_collection.features.length} feature${props.feature_collection.features.length===1?"":"s"}`}</>
            </>
        case "FAILED":
            return <span className='nickmap-status-text-error'>
                <>{`FAILED TO LOAD ${props.feature_collection_request_count} FEATURE${props.feature_collection_request_count===1?"":"S"}`}</>
                <br/>
                <>{`(${props.feature_loading_state.reason})`}</>
            </span>
        case "IDLE":
            return <>Waiting for input</>
        case "PENDING":
            return <>{`Loading ${props.feature_collection_request_count} feature${props.feature_collection_request_count===1?"":"s"}`}</>
    }
}


/**
 * This function is used because `map.getView().setProperties()` does not work as expected
 * it is pretty annoying
 */
function set_view_properties(map:OpenLayersMap, zoom:number, center:number[]){
    let view = map.getView();
    view.setZoom(zoom);
    view.setCenter(center);
}

function render_features_helper(
    vector_source_data:VectorSource,
    feature_collection:NickmapFeatureCollection,
    map:OpenLayersMap,
    zoom_to_extent = true
){
    vector_source_data.clear()
    if (feature_collection.features.length > 0){
        let features = new GeoJSON().readFeatures(feature_collection, {
            featureProjection:"EPSG:3857", // target: openlayers default projection
            dataProjection:"EPSG:4326", // source: geojson exclusively uses WGS84 which is known as 4326 in the EPSG system
        })
        vector_source_data.addFeatures(features)
        if(zoom_to_extent){
            map.getView().fit(vector_source_data.getExtent())
        }
    }
}