import powerbi from "powerbi-visuals-api";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as React from "react";
import { Fetch_Data_State } from './Fetch_Data_Sate';
import "./nickmap-controls.css";
const pegman_drag_image = document.createElement("img")
pegman_drag_image.setAttribute("src", "data:image/png;charset=utf-8;base64,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");


type NickMapControlsComponentProps = {
    on_go_to_google_maps:()=>void
    
    layer_arcgis_rest_available       : boolean
    layer_arcgis_rest_show            : boolean
    set_layer_arcgis_rest_show        : (new_value:boolean)=>void
    
    layer_wmts_available              : boolean
    layer_wmts_show                   : boolean
    set_layer_wmts_show               : (new_value:boolean)=>void

    layer_road_network_show           : boolean
    set_layer_road_network_show       : (new_value:boolean)=>void
    layer_road_network_ticks_show     : boolean
    set_layer_road_network_ticks_show : (new_value:boolean)=>void

    on_zoom_to_extent                 : ()=>void
    on_zoom_to_road_slk               : (road:string, slk:number)=>void
    zoom_to_road_slk_state            : Fetch_Data_State

    auto_zoom                         : boolean
    set_auto_zoom                     : (new_value:boolean)=>void
    
    hidden_initial                  : boolean
}

export function NickMapControls (props:NickMapControlsComponentProps){
    let [hidden, set_hidden] = React.useState(props.hidden_initial)
    const [zoom_to_road, set_zoom_to_road] = React.useState<string>("")
    const [show_zoomto_fail_explanation, set_show_zoomto_fail_explanation] = React.useState(false);
    const [zoom_to_slk, set_zoom_to_slk] = React.useState<number>(0)
    const zoom_to_road_input_ref = React.useRef<HTMLInputElement>()
    return <div className="nickmap-controls">
        
        { (hidden)?
            <div className="nickmap-controls-container-title">
                <button onClick={()=>set_hidden(false)}>⏷</button>
            </div>
            : 
            <div className="nickmap-controls-collapsible-body">
                <div className="nickmap-controls-other-map-button-container">
                    <button
                        onClick={()=>set_hidden(true)}
                    >
                        ⏶
                    </button>
                    <button
                        className="nickmap-controls-open-in-google-button"
                        title="Open current view in google maps"
                        onClick={()=>props.on_go_to_google_maps()}
                    ></button>
                    <div
                        className="nickmap-controls-pegman"
                        title="Drag and drop me to open google streetview"
                        draggable
                        onDragStart={event=>{
                            event.dataTransfer.effectAllowed="move"
                            event.dataTransfer.setDragImage(pegman_drag_image,5,16)
                            event.dataTransfer.setData("Text","the pegman commeth!");
                        }}
                    ></div>
                </div>
                <div className="nickmap-controls-input-grid">
                    <label>
                        <input
                            type     = "checkbox"
                            checked  = {props.layer_road_network_show}
                            onChange = {event=>props.set_layer_road_network_show(!props.layer_road_network_show)}
                        />
                        <div>Show Road Network</div>
                    </label>
                    <label>
                        <input
                            disabled = {!props.layer_road_network_show}
                            type     = "checkbox"
                            checked  = {props.layer_road_network_ticks_show}
                            onChange = {event=>props.set_layer_road_network_ticks_show(!props.layer_road_network_ticks_show)}
                        />
                        <div>Show SLK Markings</div>
                    </label>
                    {
                        props.layer_wmts_available &&
                        <label>
                            <input
                                type="checkbox"
                                checked={props.layer_wmts_show}
                                onChange={event=>props.set_layer_wmts_show(!props.layer_wmts_show)}
                            />
                            <div>Show WMTS Layer</div>
                        </label>
                    }
                    {
                        props.layer_arcgis_rest_available &&
                        <label>
                            <input
                                type="checkbox"
                                checked={props.layer_arcgis_rest_show}
                                onChange={event=>props.set_layer_arcgis_rest_show(!props.layer_arcgis_rest_show)}
                            />
                            <div>Show ArcGIS Rest Layer</div>
                        </label>
                    }
                    
                    <label title="Automatically zoom to exent of filtered features when slicers change">
                        <input
                            type="checkbox"
                            checked={props.auto_zoom}
                            onChange={event=>props.set_auto_zoom(!props.auto_zoom)}
                        />
                        <div>
                            Auto Zoom
                            <button onClick={props.on_zoom_to_extent} title="Zoom to the extent of loaded features" style={{marginLeft:"1em"}}>Reset</button>
                        </div>
                    </label>
                </div>
                
                <div className="nickmap-controls-zoomto-container">
                    <div className="nickmap-controls-zoomto-inputs">
                        <label htmlFor="nickmap-controls-zoomto-road">
                            Road
                        </label>
                        <input
                            id="nickmap-controls-zoomto-road"
                            ref={zoom_to_road_input_ref}
                            value={zoom_to_road}
                            onChange={event=>set_zoom_to_road(event.target.value)}
                            type="text"
                            required placeholder='eg. H001'
                            disabled={props.zoom_to_road_slk_state.type==="PENDING"}
                        />
                        <label htmlFor="nickmap-controls-zoomto-slk">
                            SLK
                        </label>
                        <input
                            id="nickmap-controls-zoomto-slk"
                            value={zoom_to_slk}
                            onChange={event=>set_zoom_to_slk(parseFloat(event.target.value))}
                            type="number"
                            required placeholder="eg. 0.00"
                            min="0"
                            max="20000"
                            step="0.001"
                            disabled={props.zoom_to_road_slk_state.type==="PENDING"}
                        />
                    </div>
                    <button
                        disabled={zoom_to_road==="" || props.zoom_to_road_slk_state.type==="PENDING"}
                        onClick={()=>{
                            set_show_zoomto_fail_explanation(false)
                            props.on_zoom_to_road_slk(zoom_to_road_input_ref.current.value, zoom_to_slk)
                            zoom_to_road_input_ref.current.reportValidity()
                        }}
                    >
                        Pan To
                    </button>
                    {
                        props.zoom_to_road_slk_state.type==="FAILED" &&
                        <div className="nickmap-controls-zoomto-status failed">{
                            [
                                `${props.zoom_to_road_slk_state.reason} `,
                                <a  href="#why" onClick={event=>{
                                    event.preventDefault();
                                    set_show_zoomto_fail_explanation(true)
                                }}>Why?</a>,
                                <>{
                                    show_zoomto_fail_explanation &&
                                    <div className="nickmap-controls-zoomto-status-fail-explanation" onClick={event=>set_show_zoomto_fail_explanation(false)}>
                                        <p>The specified road/slk combination was not found by the server. This can happen for many reasons:</p>
                                        <ul>
                                            <li>There may be an SLK 'Gap' or 'Point of Equation' at this location.</li>
                                            <li>The SLK of this road may not begin at zero</li>
                                            <li>the SLK chosen may be after the end of this road's length</li>
                                            <li>The server may be using out-of-date network model</li>
                                            <li>May refer to a historic location which no longer exists on current network model</li>
                                            <li>The road number may be invalid</li>
                                        </ul>
                                    </div>
                                    
                                }</>
                            ]
                        }</div>
                    }
                    
                    
                </div>
            </div>
        }
    </div>;
}