import 'ol/ol.css';
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import "./../style/visual.less";
import { NickMap } from "./nickmap/NickMap";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import * as React from "react";
import * as ReactDOM from "react-dom";


import { ControlsMode, NickMapBIFormattingSettings } from "./settings";

import { dataview_table_role_column_indices__all, transform_data_view } from './dataview_table_helpers';
import { batch_requests, BatchRequestAbortedError, BatchRequestOutdatedAfterFetchError, BatchRequestRequestIDMismatchError } from './linref';
import { Fetch_Data_State } from "./nickmap/Fetch_Data_Sate";
import { NickmapFeatureCollection } from "./NickmapFeatures";
import { zip_arrays } from './util/itertools';
import { NonMappableRow } from "./data_types/NonMappableRow";


export class Visual implements IVisual {
    private react_root: HTMLElement;
    private formattingSettings?: NickMapBIFormattingSettings;
    private formattingSettingsService: FormattingSettingsService;
    private host: powerbi.extensibility.visual.IVisualHost;
    private non_mappable_rows: NonMappableRow[] = [];
    private feature_collection: NickmapFeatureCollection;
    private features_requested_count: number = 0;
    private feature_loading_state:Fetch_Data_State = {type:"IDLE"};
    private selection_manager: powerbi.extensibility.ISelectionManager;
    // private storage: powerbi.extensibility.ILocalVisualStorageService; // Cant use this without verifying the visual
    
    private tooltip_service: powerbi.extensibility.ITooltipService;
    private tooltip_service_wrapper: ITooltipServiceWrapper;

    private colour_palette_service: powerbi.extensibility.IColorPalette;

    constructor(options?: VisualConstructorOptions) {
        
        if (!document || options===undefined || !options.element){
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
        this.colour_palette_service = options.host.colorPalette;
        this.formattingSettingsService = new FormattingSettingsService();
        // attempt to set default settings?
        this.feature_collection = {type:"FeatureCollection", features:[]};
    }

    public update(options: VisualUpdateOptions) {
        console.log('Visual update', options);
        
        // Extract settings from dataview
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(NickMapBIFormattingSettings, options.dataViews[0]);

        // Check dataview is present
        if (options.dataViews.length==0 || !options.dataViews[0].table) {
            // if not, still do render, then exit early
            this.react_render_call()
            return;
        }

        // Extract table Data View
        let dataview_table = options.dataViews[0].table;
        
        // TODO: allow transform_data_view to return array
        // TODO: allow transform_data_view to filter
        // TODO: also record the number of rows in the input dataframe to count transform failures

        // =============================================
        // VERIFY INPUT TABLE HAS BASIC COLUMNS REQUIRED
        // =============================================
        
        
        const mandatory_columns = {
            "road_number":"Road Number",
            "slk_from"   :"SLK From",
            "slk_to"     :"SLK To", 
        } as const;
        // TODO: dataview_table_role_column_indices__all is called again 
        //       internally in transform_data_view which is a waste.
        //       Can it be changed to a parameter?
        const role_column_indices = dataview_table_role_column_indices__all(dataview_table);
        const columns_present = (
            new Set([...Object.keys(mandatory_columns)]
            .filter(item=>item in role_column_indices))
        );
        const columns_missing = (
            [...Object.keys(mandatory_columns)]
            .filter(item=>
                !columns_present.has(item)
            )
        ) as (keyof typeof mandatory_columns)[];

        if(columns_missing.length > 0){
            const missing_column_names = (
                [...columns_missing]
                .map(role_name=>mandatory_columns[role_name])
            );
            this.feature_loading_state = {
                type:"MISSING INPUT",
                reason:`${missing_column_names.join(', ')}`
            }
            this.feature_collection = { type: "FeatureCollection", features: [] };
            this.react_render_call();
            return
        }

        // =====================================
        // BUILD DATA STRUCTURE FOR BATCH REQUEST
        // =====================================
        
        let input_properties: ReturnType<typeof transform_data_view> = [];
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
            // TODO: we need to do better error messages here
            this.feature_loading_state = {type:"FAILED", reason:"Failed to interpret input data"}
            // clear features and render to show error status and empty map
            this.feature_collection = { type: "FeatureCollection", features: [] };
            this.react_render_call();
            return
        }

        // ===============================================
        // RUN BATCH REQUEST
        // Note that `batch_requests` is an async function
        // ===============================================
        this.features_requested_count = dataview_table.rows?.length ?? 0;
        this.feature_loading_state = {type:"PENDING"};
        if(input_properties.length===0){
            // batch_requests will return (almost) immediately,
            // the promise chain will automatically clear features,
            // and set status to SUCCESS if there are zero inputs
        }else{
            // batch_requests will take some time to complete
            // we need to do a render in the meantime to show "loading" status
            this.react_render_call();
        }
        batch_requests(
            input_properties,
            this.formattingSettings.advanced_settings.offset_multiplier.value
        ).then(
            (returned_features)=>{
                let non_mappable_rows:NonMappableRow[] = []
                let features_filtered_and_coloured:NickmapFeatureCollection = {
                    type     : "FeatureCollection",
                    features : []
                }
                
                zip_arrays(input_properties, returned_features.features).forEach(
                    ([input_row, feature], row_index)=>{
                        if (feature && feature?.geometry?.coordinates && feature?.geometry?.coordinates.length !== 0){
                            let selection_key = input_row.selection_id.getKey();
                            features_filtered_and_coloured.features.push(
                                {
                                    ...feature,
                                    id : selection_key,
                                    properties:{
                                        colour       : input_row.colour,//this.colour_palette_service.getColor(input_row.colour).value,//input_row.colour,
                                        line_width   : input_row.line_width,
                                        selection_id : input_row.selection_id,
                                        tooltips     : input_row.tooltips,
                                    }
                                }
                            )
                        }else{
                            let non_mappable_row:NonMappableRow = {
                                row_number:row_index+1,
                                selection_id:input_row.selection_id,
                                reason:"unknown",
                                query:{
                                    road:input_row.road_number,
                                    cwy:input_row.cwy,
                                    slk_from:input_row.slk_from,
                                    slk_to:input_row.slk_to,
                                },
                                tooltips:input_row.tooltips
                            };
                            if(feature===null || feature===undefined){
                                non_mappable_row.reason = "invalid road or cwy";
                            }else if(feature?.geometry?.coordinates && feature?.geometry?.coordinates.length === 0){
                                if(input_row.slk_from === input_row.slk_to){
                                    non_mappable_row.reason = "slk_from = slk_to";
                                }
                                non_mappable_row.reason = "slk outside valid range(s)";
                            }
                            non_mappable_rows.push(non_mappable_row);
                        }
                    }
                );
                this.non_mappable_rows = non_mappable_rows;
                this.feature_loading_state = {type:"SUCCESS"}
                this.feature_collection = features_filtered_and_coloured;
            }
        ).catch(
            failure=>{
                if(failure instanceof BatchRequestAbortedError){
                    this.feature_loading_state = {type:"PENDING"}
                }else if(failure instanceof BatchRequestOutdatedAfterFetchError){
                    // leave the state as it was before?
                    //this.feature_loading_state = {type:"UNKNOWN"}
                }else if(failure instanceof BatchRequestRequestIDMismatchError){
                    console.log(failure)
                    this.feature_loading_state = {type:"FAILED", reason:"Server Error"}
                }else{
                    console.log(failure)
                    this.feature_loading_state = {type:"FAILED", reason:failure.message}
                }
            }
        ).finally(()=>this.react_render_call())
    }

    
    public react_render_call(){
        if(!this.formattingSettings) return;

        let map_background_settings = this.formattingSettings.map_background_settings
        let road_network_settings   = this.formattingSettings.road_network_settings
        let map_behavior_settings = this.formattingSettings.map_behavior_settings
        let map_status_bar_settings = this.formattingSettings.map_status_bar_settings;
        let advanced_settings      = this.formattingSettings.advanced_settings
        
        ReactDOM.render(
            <NickMap
                host={this.host}
                version_node                          = {<>v4.2.3<br/>NickMapBI</>}

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

                auto_zoom_initial                     = {map_behavior_settings.auto_zoom.value}
                controls_size                         = {map_behavior_settings.controls_size.value}
                controls_mode                         = {(map_behavior_settings.controls_mode.value as ControlsMode).value}

                show_non_mappable_rows                = {map_status_bar_settings.show_non_mappable_rows.value}
                show_result_count                     = {map_status_bar_settings.show_result_count.value}

                allow_drag_box_selection              = {advanced_settings.allow_drag_box_selection.value}

                feature_collection                    = {this.feature_collection}
                feature_collection_request_count      = {this.features_requested_count}
                feature_loading_state                 = {this.feature_loading_state}
                non_mappable_rows                     = {this.non_mappable_rows}
                
                selection_manager                     = {this.selection_manager}

                tooltip_service                       = {this.tooltip_service}
                tooltip_service_wrapper               = {this.tooltip_service_wrapper}

                colour_palette_service                 = {this.colour_palette_service}
            />,
            this.react_root
        )
    }


    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings as any);
    }
}
