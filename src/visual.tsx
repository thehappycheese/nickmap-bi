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


import { NickMapBIFormattingSettings } from "./settings";

import {dataview_table_role_column_indices__first, transform_data_view} from './dataview_table_helpers'
import {batch_requests} from './linref'
import { zip_arrays} from './util/itertools'
import { NickmapFeatureCollection } from "./NickmapFeatures";

export class Visual implements IVisual {
    private react_root: HTMLElement;
    private formattingSettings: NickMapBIFormattingSettings;
    private formattingSettingsService: FormattingSettingsService;
    private host: powerbi.extensibility.visual.IVisualHost;
    private pending_settings_changes:{path:string,new_value:any}[];
    private feature_collection: NickmapFeatureCollection;
    private features_requested_count: number;
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
        this.features_requested_count = 0;
    }

    public update(options: VisualUpdateOptions) {
        console.log('Visual update', options);
        
        

        // Extract settings from dataview
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(NickMapBIFormattingSettings, options.dataViews);

        // Apply pending settings changes;
        try{
            this.apply_async_setting_changes();
        }catch(e){
            //TODO Fails quietly?
        }
        

        // Check dataview is present
        if (options.dataViews.length==0 || !options.dataViews[0].table) {
            // if not, still do render, then exit early
            this.react_render_call()
            return;
        }

        
        
        // Extract table Data View
        let dataview_table = options.dataViews[0].table;

        try{
            let input_properties = [...transform_data_view(dataview_table, this.host)]
            batch_requests(input_properties.values()).then(
                (returned_features)=>{
                    let features_filtered_and_coloured:NickmapFeatureCollection = {
                        type     : "FeatureCollection",
                        features : []
                    }
                    for(let [data_row, feature] of zip_arrays(input_properties, returned_features.features)){
                        if (feature){
                            features_filtered_and_coloured.features.push(
                                {
                                    ...feature,
                                    id : data_row.selection_id.getKey(),
                                    properties:{
                                        colour       : data_row.colour,
                                        selection_id : data_row.selection_id,
                                        tooltips     : data_row.tooltips,
                                    }
                                }
                            )
                        }
                    }
                    this.features_requested_count = returned_features.features.length;
                    this.feature_collection = features_filtered_and_coloured;
                    this.react_render_call()
                }
            )
        }catch(e){
            // TODO: any error will cause total failure without message to user
            this.feature_collection = { type: "FeatureCollection", features: [] };
        }
        
        
        this.react_render_call()
    }

    
    public react_render_call(){
        // console.log(`RENDERED VALUE: map_background_settings.url_wmts_show.value: ${this.formattingSettings.map_background_settings.url_wmts_show.value}`)
        // console.log(`RENDERED VALUE: map_background_settings.url_tile_arcgis_show.value: ${this.formattingSettings.map_background_settings.url_tile_arcgis_show.value}`)
        // console.log(`RENDERED VALUE: map_behaviour_settings.auto_zoom.value: ${this.formattingSettings.map_behaviour_settings.auto_zoom.value}`)
        ReactDOM.render(
            <NickMap
                host={this.host}
                version_text = "NickMapBI v2023-02-20 - TEST VERSION"

                layer_arcgis_rest_url={this.formattingSettings.map_background_settings.url_tile_arcgis.value}
                layer_arcgis_rest_show={this.formattingSettings.map_background_settings.url_tile_arcgis_show.value}
                set_layer_arcgis_rest_show={
                    (new_value:boolean)=>this.async_setting_change("map_background_settings.url_tile_arcgis_show.value", new_value)
                }
                layer_wmts_url={this.formattingSettings.map_background_settings.url_wmts.value}
                layer_wmts_show={this.formattingSettings.map_background_settings.url_wmts_show.value}
                set_layer_wmts_show={
                    (new_value:boolean)=>this.async_setting_change("map_background_settings.url_wmts_show.value", new_value)
                }
                feature_collection={this.feature_collection}
                feature_collection_request_count={this.features_requested_count}

                auto_zoom={this.formattingSettings.map_behaviour_settings.auto_zoom.value}
                set_auto_zoom={(new_value:boolean)=>this.async_setting_change("map_behaviour_settings.auto_zoom.value", new_value)}

                selection={this.selection_manager.getSelectionIds()}
                set_selection={new_selection_ids=>this.selection_manager.select(new_selection_ids)}

                tooltip_service={this.tooltip_service}
                tooltip_service_wrapper={this.tooltip_service_wrapper}
            >
                
            </NickMap>,
            this.react_root
        )
    }

    public async_setting_change(path:string, new_value:any){
        //console.log(`PENDING ADD  : '${path}' '${new_value}'`)
        let index = this.pending_settings_changes.findIndex(item=>item.path===path);
        if(index > -1){
            this.pending_settings_changes[index].new_value = new_value;
        }else{
            this.pending_settings_changes.push({path, new_value});
        }
        this.host.refreshHostData();
    }
    public apply_async_setting_changes() {
        
        for(let pending_settings_change of this.pending_settings_changes){
            //console.log(`PENDING APPLY: '${pending_settings_change.path}' '${pending_settings_change.new_value}'`)
            let path = pending_settings_change.path.split(".");
            let pointer = this.formattingSettings;
            for(let attribute of path.slice(0,-1)){
                pointer = pointer[attribute];
            }
            pointer[path.at(-1)] = pending_settings_change.new_value
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        //this.pending_settings_changes = [];
        console.log("getFormattingModel")
        // I think this makes it so that if you change `this.formattingSettings` then the results are returned to the UI? I will test.
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
