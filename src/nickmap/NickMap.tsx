/* eslint-disable no-case-declarations */
import { Feature, MapBrowserEvent, Map as OpenLayersMap } from 'ol';
import { Rotate, ScaleLine } from 'ol/control';
import { platformModifierKeyOnly } from 'ol/events/condition';
import GeoJSON from 'ol/format/GeoJSON';
import { DragBox, Select, defaults as default_interactions} from 'ol/interaction';
import { Group as LayerGroup } from 'ol/layer';
import { Vector as VectorLayer} from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import View from 'ol/View';
import {point_request} from '../linref'

import powerbi from "powerbi-visuals-api";

import { useEffect, useRef, useState } from 'react';
import {useRefFactory} from './hooks/useRefFactory'

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
import { FeatureTooltipItem } from "../data_types/FeatureTooltipItems";
import { road_network_styles } from './layers/road_network';
import { Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import { FeatureLike } from 'ol/Feature';
import { Geometry } from 'ol/geom';
import { NonMappableRow } from '../data_types/NonMappableRow';

type NickMapProps = {
    
    host:IVisualHost // good change to try context provider
    version_node:React.ReactNode

    layer_arcgis_rest_url:string
    layer_arcgis_rest_show_initial:boolean
    
    layer_wmts_url:string
    layer_wmts_show_initial:boolean

    layer_road_network_show_initial:boolean
    layer_road_network_ticks_show_initial:boolean
    layer_road_network_state_color:string
    layer_road_network_psp_color:string

    layer_raster_brightness:number
    layer_raster_contrast:number
    layer_raster_saturation:number

    auto_zoom_initial:boolean
    controls_size:number
    controls_mode:"Collapsed"|"Expanded"|"Disabled"

    show_non_mappable_rows:boolean
    show_result_count:boolean

    allow_drag_box_selection:boolean
    backend_url:string

    feature_collection:NickmapFeatureCollection
    feature_collection_request_count:number
    feature_loading_state:Fetch_Data_State
    non_mappable_rows:NonMappableRow[]




    selection_manager:powerbi.extensibility.ISelectionManager
    
    tooltip_service:powerbi.extensibility.ITooltipService
    tooltip_service_wrapper: ITooltipServiceWrapper

    color_palette_service:powerbi.extensibility.IColorPalette

}

const western_australia_centroid:Coordinate = fromLonLat([122.18175, -25.46653])
const western_australia_extent:Extent = [
    ...fromLonLat([112.921125, -35.191995]),
    ...fromLonLat([129.001928,-13.68869])
]

// I don't know why this is needed. I think typescript was not compiling properly. It was telling me it was undefined.
const local_platformModifierKeyOnly = platformModifierKeyOnly; 

export function NickMap(props:NickMapProps){
    const [auto_zoom                    , set_auto_zoom                    ] = useState(props.auto_zoom_initial);
    const [layer_arcgis_rest_show       , set_layer_arcgis_rest_show       ] = useState(props.layer_arcgis_rest_show_initial);
    const [layer_wmts_show              , set_layer_wmts_show              ] = useState(props.layer_wmts_show_initial);
    const [layer_road_network_show      , set_layer_road_network_show      ] = useState(props.layer_road_network_show_initial);
    const [layer_road_network_ticks_show, set_layer_road_network_ticks_show] = useState(props.layer_road_network_ticks_show_initial);
    const [zoom_to_road_slk_state       , set_zoom_to_road_slk_state       ] = useState<Fetch_Data_State>({type:"IDLE"});
    const [show_explanation, set_show_explanation]                           = useState({show:false, explanation:<></>});
    const select_status_display_ref  = useRef<HTMLDivElement | null>(null);
    const map_root_ref               = useRef<HTMLDivElement | null>(null);
    
    
    
    // =================================================
    // VECTOR DATA DISPLAY LAYER
    // This is the canvas on which user data is rendered
    // =================================================

    const vector_source_data_ref     = useRef<VectorSource>(new VectorSource({}))
    const vector_layer_data_ref      = useRef(new VectorLayer({
        source:vector_source_data_ref.current,
        style:(item) => new Style({
            stroke:new Stroke({
                width:item.getProperties()["line_width"],
                color:item.getProperties()["color"]
            })
        })
    }))

    // ================
    // DRAG INTERACTION
    // ================
    const drag_interaction_ref       = useRefFactory<DragBox>(()=>{
        const drag_interaction = new DragBox({
            condition:local_platformModifierKeyOnly,
        })
        drag_interaction.setActive(props.allow_drag_box_selection); // not available as a constructor option
        drag_interaction.on('boxend', _event => {
            const extent = drag_interaction_ref.current.getGeometry().getExtent();
            let features_within_dragged_box_extent = vector_source_data_ref.current
                .getFeaturesInExtent(extent)
                .filter((feature) => feature.getGeometry()?.intersectsExtent(extent));
            
            // compensate for view rotation
            const map_rotation = map_ref.current.getView().getRotation();
            if (map_rotation % (Math.PI / 2) !== 0) {
                const anchor = [0, 0];
                const drag_box_geometry_rotated = drag_interaction_ref.current.getGeometry().clone();
                drag_box_geometry_rotated.rotate(-map_rotation, anchor);
                const drag_box_geometry_rotated_extent = drag_box_geometry_rotated.getExtent();
                features_within_dragged_box_extent = features_within_dragged_box_extent.filter(feature => {
                    const feature_geometry_rotated = feature.getGeometry()?.clone();
                    if(feature_geometry_rotated===undefined) return false;
                    feature_geometry_rotated.rotate(-map_rotation, anchor);
                    return feature_geometry_rotated.intersectsExtent(drag_box_geometry_rotated_extent);
                });
            }
            // Don't add features which are already selected
            features_within_dragged_box_extent = features_within_dragged_box_extent.filter(item=>select_interaction_ref.current.getFeatures().getArray().findIndex(selected_item=>selected_item===item)===-1)
            select_interaction_ref.current.getFeatures().extend(features_within_dragged_box_extent);
            props.selection_manager.select(select_interaction_ref.current.getFeatures().getArray().map(item=>item.get("selection_id")))
            update_status_selection_count_helper(select_interaction_ref.current.getFeatures().getLength(), select_status_display_ref)
        })
        return drag_interaction;
    })

    useEffect(()=>{
        drag_interaction_ref.current.setActive(props.allow_drag_box_selection)
    },[props.allow_drag_box_selection])

    

    // ==================
    // SELECT INTERACTION
    // ==================
    const select_interaction_ref     = useRefFactory<Select>(()=>{
        const select_interaction = new Select({
            layers:[vector_layer_data_ref.current],
            hitTolerance:4,
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
                        color:item.getProperties()["color"]
                    })
                })
            ]
        })
        select_interaction.on("select", _e => {
            // console.log(`Select Interaction on select_interaction_ref.current.on("select",({selected.length:${e.selected.length}, deselected.length:${e.deselected.length}})=>{})`)
            // NOTE: the event only gives the diff. For the complete list of
            //       selections we need to refer to the feature collection:
            const selected_items = select_interaction_ref.current.getFeatures().getArray()
            props.selection_manager
            .clear()
            .then(()=>{
                update_status_selection_count_helper(selected_items.length, select_status_display_ref)
                if(selected_items.length>0){
                    return props.selection_manager.select(selected_items.map(item=>item.get("selection_id")))
                }
            })
        });
        return select_interaction
    })

    
    // ========================
    // ROAD NETWORK LAYER GROUP
    // ========================

    const road_network_layers_ref = useRef(new LayerGroup({
        layers:[
            layer_state_road,
        ]
    }))


    // ==========
    // MAP OBJECT
    // ==========
    const map_ref = useRefFactory<OpenLayersMap>(()=>{
        const map = new OpenLayersMap({
            // target:map_root_ref.current,
            controls:[
                new Rotate(),
                new ScaleLine()
            ],
            view:new View({
                zoom:5,
                center:western_australia_centroid
            }),
            interactions:default_interactions().extend([
                drag_interaction_ref.current,
                select_interaction_ref.current
            ]),
            layers:[
                new LayerGroup({
                    layers:[
                        layer_open_street_map,
                        layer_arcgis_rest,
                        layer_wmts,
                    ]
                }),
                road_network_layers_ref.current,
                vector_layer_data_ref.current,
            ]
        })
        map.getViewport().addEventListener("dragenter",function(event){
            if (event.dataTransfer){
                event.dataTransfer.dropEffect = "move";
            }
        })
        map.getViewport().addEventListener("dragover",function(event){
            event.preventDefault();
        })
        map.getViewport().addEventListener("drop", function(event){
            const target:HTMLDivElement = event.target as HTMLDivElement;
            if (event.dataTransfer?.getData("Text")==="the pegman commeth!"){
                const rec = target.getBoundingClientRect();
                const px = [
                    event.clientX - rec.left,
                    event.clientY - rec.top
                ];
                const loc = map.getCoordinateFromPixel(px) as [number,number]
                goto_google_street_view(loc, props.host);
            }
        });
        map.on("movestart", _event=>{
            props.tooltip_service.hide({immediately:true, isTouchEvent:false});
        })
        // ========== HOVER TOOLTIP ============
        const show_tooltip = (selected_item:Feature, clientX:number, clientY:number, is_touch:boolean) => {
            const tooltips:FeatureTooltipItem[] = selected_item.get("tooltips")
            const selection_id:powerbi.extensibility.ISelectionId = selected_item.get("selection_id")
            if(!(tooltips===undefined || tooltips.length===0)){
                props.tooltip_service.show({
                    coordinates:[
                        clientX,
                        clientY
                    ],
                    dataItems:tooltips.map(item=>({
                        displayName: item.column_name,
                        value: String(item.value),
                        color: "",
                        header: ""
                    })),
                    isTouchEvent:is_touch,
                    identities:[selection_id]
                })
            }
        };

        let pointer_hover_feature:FeatureLike|undefined = undefined;
        map.on('pointermove', (event:MapBrowserEvent<any>) => {
            let found = false;
            map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
                if(layer===vector_layer_data_ref.current){
                    found = true;
                    if(pointer_hover_feature!==feature){
                        pointer_hover_feature = feature;
                        show_tooltip(
                            feature as any,
                            event.originalEvent?.clientX ?? 0,
                            event.originalEvent?.clientY ?? 0,
                            event.originalEvent?.pointerType==="touch" ?? false
                        )
                    }
                    return;
                }
            });
            if(!found){
                pointer_hover_feature = undefined;
                props.tooltip_service.hide({immediately:true, isTouchEvent:false});
            }
        });
        return map
    });
    useEffect(()=>{
        // Mount Map
        if(map_root_ref.current === null){
            console.log("FAILED TO MOUNT MAP: map_root_ref.current === null")
            // TODO: not sure how to handle this. It would be nice if we could
            //       be sure it would not happen
        }else{
            map_ref.current.setTarget(map_root_ref.current)
        }
    },[])

    // =====================================================
    // SLK TICKS LAYER
    // Must be created after map due to annoying API problem
    // =====================================================
    const layer_state_road_ticks_ref = useRefFactory<VectorLayer<any>>(()=>{
        const layer_state_road_ticks = get_layer_state_road_ticks(map_ref.current);
        road_network_layers_ref.current.getLayers().push(layer_state_road_ticks)
        return layer_state_road_ticks
    });
    

    // =============================
    // OPEN STREET MAP LAYER EFFECTS
    // =============================
    useEffect(()=>{
        for (const layer of [layer_open_street_map, layer_wmts, layer_arcgis_rest]){
            layer.__BRIGHTNESS = props.layer_raster_brightness;
            layer.__CONTRAST   = props.layer_raster_contrast;
            layer.__SATURATION  = props.layer_raster_saturation;
        }
    },[props.layer_raster_saturation, props.layer_raster_brightness, props.layer_raster_contrast])
    

    // ===============================
    // ROAD NETWORK STYLE & VISIBILITY
    // ===============================
    useEffect(()=>{
        road_network_styles["State Road"].getStroke()!.setColor(props.layer_road_network_state_color)
        layer_state_road.changed()
    },[props.layer_road_network_state_color])

    useEffect(()=>{
        road_network_styles["Main Roads Controlled Path"].getStroke()!.setColor(props.layer_road_network_psp_color)
        layer_state_road.changed()
    },[props.layer_road_network_psp_color])

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

    

    // ============================
    // WMTS RASTER LAYER VISIBILITY
    // ============================
    useEffect(()=>{
        if (props.layer_wmts_url && layer_wmts_show){
            layer_wmts.getSource()?.setUrl(props.layer_wmts_url)
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
            layer_arcgis_rest.getSource()?.setUrl(props.layer_arcgis_rest_url)
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
            layer_wmts.getSource()?.setUrl(props.layer_wmts_url)
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
            props.selection_manager,
            select_interaction_ref.current,
            select_status_display_ref,
            auto_zoom
        );
    },[props.feature_collection])


    // ==================
    // ZOOM TO ROAD / SLK
    // ==================
    const zoom_to_road_slk = React.useCallback(async (road_number:string, slk:number)=>{
        road_number = road_number.toUpperCase();
        console.log(`Zoom to ${road_number} ${slk}`)
        set_zoom_to_road_slk_state({"type":"PENDING"})
        const response = await point_request(road_number, slk, props.backend_url);
        if(response.ok){
            const response_text = await response.text();
            const [lat,lon] = response_text.split(",");
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
                        const center = map_ref.current.getView().getCenter();
                        const zoom = map_ref.current.getView().getZoom();
                        if(center===undefined || zoom===undefined) return;
                        // TODO: silent failure here is not ok, but seems
                        //       unlikely to happen without lots of other things
                        //       going wrong before
                        goto_google_maps(center, zoom, props.host);
                    }}

                    layer_wmts_available        = {props.layer_wmts_url!==""}
                    layer_wmts_show             = {layer_wmts_show}
                    set_layer_wmts_show         = {set_layer_wmts_show}

                    layer_arcgis_rest_available = {props.layer_arcgis_rest_url!==""}
                    layer_arcgis_rest_show      = {layer_arcgis_rest_show}
                    set_layer_arcgis_rest_show  = {set_layer_arcgis_rest_show}


                    layer_road_network_show           = {layer_road_network_show}
                    set_layer_road_network_show       = {set_layer_road_network_show}
                    layer_road_network_ticks_show     = {layer_road_network_ticks_show}
                    set_layer_road_network_ticks_show = {set_layer_road_network_ticks_show}
                    
                    on_zoom_to_extent           = {()=>do_auto_zoom(map_ref.current, vector_source_data_ref.current)}
                    on_zoom_to_road_slk         = {zoom_to_road_slk}
                    zoom_to_road_slk_state      = {zoom_to_road_slk_state}
                    auto_zoom                   = {auto_zoom}
                    set_auto_zoom               = {set_auto_zoom}

                    hidden_initial              = {props.controls_mode === 'Collapsed'}
                />
            }
            <div className="nickmap-status-version-display">
                <div>
                    {/* Grid Placeholder */}
                </div>
                <div className="nickmap-status-box">{
                    build_status_display(props, ()=>set_show_explanation({
                        show:true,
                        explanation:<>
                            The following rows could not be mapped:
                            <table className='nickmap-non-mappable'>
                                <thead>
                                    <th>row</th>
                                    <th>reason</th>
                                    <th>road</th>
                                    <th>cwy</th>
                                    <th>slk_from</th>
                                    <th>slk_to</th>
                                    <th colSpan={99}>tooltips</th>
                                </thead>
                                <tbody>
                                    {props.non_mappable_rows.slice(0,10).map(item=><tr>{[
                                        <td>{item.row_number}</td>,
                                        <td>{item.reason}</td>,
                                        <td>{item.query.road}</td>,
                                        <td>{item.query.cwy}</td>,
                                        <td>{item.query.slk_from.toFixed(3)}</td>,
                                        <td>{item.query.slk_to.toFixed(3)}</td>,
                                        ...item.tooltips.map(column=><td>{column.value.toString()}</td>)
                                    ]}</tr>)}
                                </tbody>
                            </table>
                            {props.non_mappable_rows.length > 10 && `... ${props.non_mappable_rows.length-10} other rows not shown`}
                            <button
                                title='Select the offending rows in all other visuals on this page'
                                onClick={()=>{
                                    set_show_explanation({show:false, explanation:<></>});
                                    props.selection_manager.clear();
                                    props.selection_manager.select(props.non_mappable_rows.map(item=>item.selection_id));
                                }}>Highlight these rows in other visuals</button>
                        </>
                    }))
                }</div>
                <div ref={select_status_display_ref} className="nickmap-status-box">{`Selected: ${props.selection_manager.getSelectionIds().length}`}</div>
                <div className="nickmap-version-text">{props.version_node}</div>
            </div>
            <div 
                className='nickmap-modal-explanation'
                style={{display:show_explanation.show?undefined:"none"}}
                onClick={()=>set_show_explanation({show:false, explanation:<></>})}>{
                show_explanation.explanation
            }<button>OK</button></div>
        </div>
        <div ref={map_root_ref} className="nickmap-map-host"></div>
    </div>
}


function build_status_display(props:NickMapProps, show_why_cant_map_some_features:()=>void) : React.ReactNode{
    switch(props.feature_loading_state.type){
        case "SUCCESS":
            
            let message_hit_max_result_count:React.ReactNode = null;
            if(props.feature_collection_request_count===30_000){
                if(props.show_result_count){
                    message_hit_max_result_count = <span className="nickmap-status-text-error">Limited to 30,000 rows!</span>;
                }else{
                    message_hit_max_result_count = <span className="nickmap-status-text-error">Too many rows to map, please add more filters!</span>;
                }
            }

            let message_count_missing_rows:React.ReactNode = null;
            if(props.feature_collection_request_count !== props.feature_collection.features.length){
                const count_missing_rows = props.feature_collection_request_count-props.feature_collection.features.length;
                if (count_missing_rows<=0){
                    // show no message, something went badly wrong
                }else{
                    if(props.show_non_mappable_rows){
                        message_count_missing_rows = <span className='nickmap-status-text-warning'>
                            <a href="#" style={{pointerEvents:"all"}} onClick={()=>show_why_cant_map_some_features()}>{
                                `${count_missing_rows.toFixed(0)} rows could not be mapped`
                            }</a>
                        </span>;
                    }
                }
            }

            let message_count_rows_mapped_or_done:React.ReactNode = null;
            if(props.feature_collection.features.length>0){
                if(props.show_result_count){
                    message_count_rows_mapped_or_done = `Showing ${props.feature_collection.features.length}`;
                }else{
                    message_count_rows_mapped_or_done = "Done";
                }
            }
            return [
                message_hit_max_result_count," ",
                message_count_missing_rows," ",
                message_count_rows_mapped_or_done,
            ]

        case "FAILED":
            if(props.show_result_count){
                return <span className='nickmap-status-text-error'>
                    {`Failed to load ${props.feature_collection_request_count} rows`}
                    <br/>{`(${props.feature_loading_state.reason})`}
                </span>
            }else{
                return <span className='nickmap-status-text-error'>
                {`Failed to load results`}
                <br/>{`(${props.feature_loading_state.reason})`}
                </span>
            }

        case "IDLE":
            return "Starting up"

        case "PENDING":
            if(props.show_result_count){
                return `Loading ${props.feature_collection_request_count}`
            }else{
                return `Loading...`
            }

        case "MISSING INPUT":
            return <span className='nickmap-status-text-warning'>
                <>Missing columns;</>
                <br/>
                <>{props.feature_loading_state.reason}</>
            </span>
    }
}


/**
 * This function is used because `map.getView().setProperties()` does not work as expected
 * it is pretty annoying
 */
function set_view_properties(map:OpenLayersMap, zoom:number, center:number[]){
    const view = map.getView();
    view.setZoom(zoom);
    view.setCenter(center);
}

/**
*  Make a Map either zoom to the extent of a vector source, or to a default extent (Show all of Western Australia)
*/
function do_auto_zoom(map:OpenLayersMap,vector_source:VectorSource){
    if (vector_source.isEmpty()){
        map.getView().fit(western_australia_extent);
    }else{
        map.getView().fit(vector_source.getExtent());
    }
}

function render_features_helper(
    vector_source_data:VectorSource,
    feature_collection:NickmapFeatureCollection,
    map:OpenLayersMap,
    selection_manager  : powerbi.extensibility.ISelectionManager,
    select_interaction : Select,
    select_status_display_ref:React.MutableRefObject<HTMLDivElement | null>,
    zoom_to_extent = true
){
    vector_source_data.clear()
    if (feature_collection.features.length > 0){
        const features = new GeoJSON().readFeatures(feature_collection, {
            featureProjection:"EPSG:3857", // target: openlayers default projection
            dataProjection:"EPSG:4326", // source: geojson exclusively uses WGS84 which is known as 4326 in the EPSG system
        })
        vector_source_data.addFeatures(features)
        if(zoom_to_extent){
            do_auto_zoom(map, vector_source_data);
        }
    }
    ///////////////////////
    // SYNCHRONIZE SELECTION
    ///////////////////////
    const select_interaction_features = select_interaction.getFeatures()
    select_interaction_features.clear()
    if(selection_manager.hasSelection()){
        const features = vector_source_data.getFeatures()
        const selected_features:Feature<Geometry>[] = [];
        const valid_selection_ids:powerbi.extensibility.ISelectionId[] = [];
        selection_manager.getSelectionIds().forEach(selection_id=>{
            const found_feature = features.find(feature=>feature.get("selection_id").equals(selection_id));
            if (found_feature){
                valid_selection_ids.push(selection_id)
                selected_features.push(found_feature)
            }
        })
        //debugger
        select_interaction_features.extend(selected_features)
        selection_manager.clear()
        selection_manager.select(valid_selection_ids)
    }
    update_status_selection_count_helper(select_interaction_features.getLength(), select_status_display_ref)
}

function update_status_selection_count_helper(count:number, select_status_display_ref:React.MutableRefObject<HTMLDivElement|null>){
    if(select_status_display_ref.current){
        select_status_display_ref.current.innerText = `Selected: ${count}`;
    }
}