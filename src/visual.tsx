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

import {iterate_rows_as_dict} from './dataview_table_helpers'
import {batch_requests} from './linref'

export class Visual implements IVisual {
    private react_root: HTMLElement;
    private formattingSettings: NickMapBIFormattingSettings;
    private formattingSettingsService: FormattingSettingsService;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private host: powerbi.extensibility.visual.IVisualHost;
    private pending_settings_changes:{path:string,new_value:any}[];

    constructor(options: VisualConstructorOptions) {
        this.pending_settings_changes = []
        if (!document || !options.element){
            throw new Error("Visual constructed without DOM???")
        }
        this.host = options.host;
        this.react_root = options.element;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(options.host.tooltipService, options.element);
        this.formattingSettingsService = new FormattingSettingsService();
    }

    public update(options: VisualUpdateOptions) {
        //console.log('Visual update', options);
        
        // Check dataview is present
        if (options.dataViews.length==0 || !options.dataViews[0].table) return;

        // Extract settings from dataview
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(NickMapBIFormattingSettings, options.dataViews);

        // Apply pending settings changes;
        this.apply_async_setting_changes();
        this.pending_settings_changes = [];
        
        // Extract table Data View
        let dataview_table = options.dataViews[0].table;
        
        // this.nickmap.set_arcgis_rest_layer(
        //     this.formattingSettings.map_background_settings.url_tile_arcgis.value,
        //     this.formattingSettings.map_background_settings.url_tile_arcgis_show.value
        // );
        // this.nickmap.set_wmts_layer(
        //     this.formattingSettings.map_background_settings.url_wmts.value,
        //     this.formattingSettings.map_background_settings.url_wmts_show.value,
        // )
        
        // try{
        //     batch_requests(iterate_rows_as_dict(dataview_table)).then(
        //         (result)=>{
        //             let colours = []
        //             for(let item of iterate_rows_as_dict(dataview_table)){
        //                 colours.push(item.colour);
        //             }
        //             this.nickmap.replace_features(result, colours)
        //         }
        //     )
        // }catch(e){
        //     // TODO: any error will cause total failure without message to user
        //     this.nickmap.replace_features({ type: "FeatureCollection", features: [] },[]);
        // }
        
        
        ReactDOM.render(
            <NickMap
                host={this.host}
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
            >
                
            </NickMap>,
            this.react_root
        )
    }

    public async_setting_change(path:string, new_value:any){
        this.pending_settings_changes.push({path, new_value});
        this.host.refreshHostData();
    }
    public apply_async_setting_changes(){
        console.log("applying")
        console.log(JSON.stringify(this.pending_settings_changes,null,3))
        for(let pending_settings_change of this.pending_settings_changes){
            let path = pending_settings_change.path.split(".");
            let pointer = this.formattingSettings;
            for(let attribute of path.slice(0,-1)){
                pointer = pointer[attribute];
            }
            pointer[path.at(-1)] = pending_settings_change.new_value
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        // I think this makes it so that if you change `this.formattingSettings` then the results are returned to the UI? I will test.
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
