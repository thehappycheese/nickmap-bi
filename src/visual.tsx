import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import 'ol/ol.css';
import {NickMap} from "./nickmap/NickMap";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import {createTooltipServiceWrapper, ITooltipServiceWrapper} from "powerbi-visuals-utils-tooltiputils";

import * as React from "react";
import * as ReactDOM from "react-dom";


import { ControlsMode, NickMapBIFormattingSettings } from "./settings";

import {transform_data_view} from './dataview_table_helpers'
import {batch_requests} from './linref'
import { zip_arrays} from './util/itertools'
import { NickmapFeatureCollection } from "./NickmapFeatures";
import { Fetch_Data_State } from "./nickmap/Fetch_Data_Sate";

export class Visual implements IVisual {
    private react_root: HTMLElement;
    private formattingSettings: NickMapBIFormattingSettings;
    private formattingSettingsService: FormattingSettingsService;
    private host: powerbi.extensibility.visual.IVisualHost;
    private pending_settings_changes:{path:string,new_value:any}[];
    private feature_collection: NickmapFeatureCollection;
    private features_requested_count: number = 0;
    private feature_loading_state:Fetch_Data_State = {type:"IDLE"};
    private selection_manager: powerbi.extensibility.ISelectionManager;
    // private storage: powerbi.extensibility.ILocalVisualStorageService; // Cant use this without verifying the visual
    
    private tooltip_service: powerbi.extensibility.ITooltipService;
    private tooltip_service_wrapper: ITooltipServiceWrapper;

    constructor(options: VisualConstructorOptions) {

        this.pending_settings_changes = []
        if (!document || !options.element){
            throw new Error("Visual constructed without DOM???")
        }
        this.host = options.host;
        this.react_root = options.element;
        this.selection_manager = this.host.createSelectionManager();
        this.tooltip_service = options.host.tooltipService
        this.tooltip_service_wrapper = createTooltipServiceWrapper(
            options.host.tooltipService,
            options.element
        );
        this.formattingSettingsService = new FormattingSettingsService();
        this.feature_collection = {type:"FeatureCollection", features:[]};
    }

    public update(options: VisualUpdateOptions) {
        console.log('Visual update', options);
        


        // Extract settings from dataview
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(NickMapBIFormattingSettings, options.dataViews);

        // Check dataview is present
        if (options.dataViews.length==0 || !options.dataViews[0].table) {
            // if not, still do render, then exit early
            this.react_render_call()
            return;
        }

        // Extract table Data View
        let dataview_table = options.dataViews[0].table;
        this.features_requested_count = dataview_table.rows.length;
        // TODO: allow transform_data_view to return array
        // TODO: allow transform_data_view to filter
        // TODO: also record the number of rows in the input dataframe to count transform failures

        
        let input_properties = [];
        try{
            input_properties = transform_data_view(
                dataview_table,
                this.host,
                this.formattingSettings.line_format_settings.default_line_width.value,
                this.formattingSettings.line_format_settings.default_line_colour.value.value,
            )
        }catch(e){
            console.log("Error transforming powerbi data into table")
            console.log(e)
            this.feature_loading_state = {type:"FAILED", reason:"Failed to interpret input data"}
            // clear features
            this.feature_collection = { type: "FeatureCollection", features: [] };
            this.react_render_call();
            return
        }
        this.feature_loading_state = {type:"PENDING"};
        if(input_properties.length!==0){
            // prevent double call in batch_requests.finally when there are no input properties
            this.react_render_call();
        }else{
            // clear features
            this.feature_collection = { type: "FeatureCollection", features: [] };
        }
        batch_requests(
            input_properties,
            this.formattingSettings.advanced_settings.offset_multiplier.value
        ).then(
            (returned_features)=>{
                let features_filtered_and_coloured:NickmapFeatureCollection = {
                    type     : "FeatureCollection",
                    features : []
                }
                for(let [data_row, feature] of zip_arrays(input_properties, returned_features.features)){
                    // feature may be null or have zero-sized coordinates array:
                    if (feature && feature?.geometry?.coordinates && feature?.geometry?.coordinates.length !== 0){
                        features_filtered_and_coloured.features.push(
                            {
                                ...feature,
                                id : data_row.selection_id.getKey(),
                                properties:{
                                    colour       : data_row.colour,
                                    line_width   : data_row.line_width,
                                    selection_id : data_row.selection_id,
                                    tooltips     : data_row.tooltips,
                                }
                            }
                        )
                    }
                }
                this.feature_loading_state = {type:"SUCCESS"}
                this.feature_collection = features_filtered_and_coloured;
            }
        ).catch(
            failure=>{
                console.log(failure)
                this.feature_loading_state = {type:"FAILED", reason:failure.message}
            }
        ).finally(()=>this.react_render_call())
    }

    
    public react_render_call(){
        
        let map_background_settings = this.formattingSettings.map_background_settings
        let road_network_settings   = this.formattingSettings.road_network_settings

        let map_behaviour_settings = this.formattingSettings.map_behaviour_settings
        let advanced_settings      = this.formattingSettings.advanced_settings
        
        ReactDOM.render(
            <NickMap
                host={this.host}
                version_text = "v4.1.4 NickMapBI"

                layer_arcgis_rest_url                 = {map_background_settings.url_tile_arcgis.value}
                layer_arcgis_rest_show_initial        = {map_background_settings.url_tile_arcgis_show.value}
                
                layer_wmts_url                        = {map_background_settings.url_wmts.value}
                layer_wmts_show_initial               = {map_background_settings.url_wmts_show.value}

                layer_road_network_show_initial       = {road_network_settings.show.value}
                layer_road_network_ticks_show_initial = {road_network_settings.show_ticks.value}
                layer_road_network_state_colour       = {road_network_settings.state_road_colour.value.value}
                layer_road_network_psp_colour         = {road_network_settings.psp_colour.value.value}

                layer_raster_brightness               = {map_background_settings.osm_brightness.value}
                layer_raster_contrast                 = {map_background_settings.osm_contrast.value}
                layer_raster_saturation               = {map_background_settings.osm_saturation.value}

                auto_zoom_initial                     = {map_behaviour_settings.auto_zoom.value}
                controls_size                         = {map_behaviour_settings.controls_size.value}
                controls_mode                         = {(map_behaviour_settings.controls_mode.value as ControlsMode).value}

                allow_drag_box_selection              = {advanced_settings.allow_drag_box_selection.value}

                feature_collection                    = {this.feature_collection}
                feature_collection_request_count      = {this.features_requested_count}
                feature_loading_state                 = {this.feature_loading_state}

                
                selection_manager                     = {this.selection_manager}

                tooltip_service                       = {this.tooltip_service}
                tooltip_service_wrapper               = {this.tooltip_service_wrapper}

            />,
            this.react_root
        )
    }


    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
