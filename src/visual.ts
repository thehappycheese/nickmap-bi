"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import 'ol/ol.css';
import NickMap from "./nickmap/NickMap";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { NickMapBIFormattingSettings } from "./settings";

import {iterate_rows_as_dict} from './dataview_table_helpers'
import {batch_requests} from './linref'

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: NickMapBIFormattingSettings;
    private formattingSettingsService: FormattingSettingsService;
    private nickmap:NickMap;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        if (document){
            this.nickmap = new NickMap(this.target);
        }else{
            console.log("Why construct without document???")
        }
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(NickMapBIFormattingSettings, options.dataViews);
        console.log('Visual update', options);
        if (options.dataViews.length==0 || !options.dataViews[0].table) return;
        let dataview_table = options.dataViews[0].table;
        this.nickmap.set_arcgis_rest_layer(
            this.formattingSettings.map_background_settings.url_tile_arcgis.value,
            this.formattingSettings.map_background_settings.url_tile_arcgis_show.value
        );
        this.nickmap.set_wmts_layer(
            this.formattingSettings.map_background_settings.url_wmts.value,
            this.formattingSettings.map_background_settings.url_wmts_show.value,
        )
        
        try{
            batch_requests(iterate_rows_as_dict(dataview_table)).then(
                (result)=>{
                    let colours = []
                    for(let item of iterate_rows_as_dict(dataview_table)){
                        colours.push(item.colour);
                    }

                    this.nickmap.replace_features(result, colours)
                }
            )
        }catch(e){
            // TODO: any error will cause total failure without message to user
            this.nickmap.replace_features({ type: "FeatureCollection", features: [] },[]);
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
