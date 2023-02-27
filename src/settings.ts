"use strict";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import powerbi from "powerbi-visuals-api";


class LineFormatSettings extends formattingSettings.Card {
    name        = "line_format";
    displayName = "Line Format";

    default_line_colour = new formattingSettings.ColorPicker({
        name        : "default_line_colour",
        displayName : "Default Line Colour",
        description : "This is the colour that will be used when the Colour field well is not populated",
        value       : { value: "red" },
    });
    default_line_width = new formattingSettings.NumUpDown({
        name        : "default_line_width",
        displayName : "Line Width (pixels)",
        options     :{
            unitSymbol           : "px",
            unitSymbolAfterInput : true,
            minValue             : {type:powerbi.visuals.ValidatorType.Min, value:0.1},
            maxValue             : {type:powerbi.visuals.ValidatorType.Max, value:100},
            required             : {type:powerbi.visuals.ValidatorType.Required}
        },
        value       :5
    });
    
    slices = [
        this.default_line_colour,
        this.default_line_width,
    ]
}

class RoadNetworkSettings extends formattingSettings.Card {
    name = "road_network";
    displayName = "Road Network";
    show = new formattingSettings.ToggleSwitch({
        name        : "show",
        displayName : "Show (startup)",
        description : "Controls the default visibility of this layer when the report is opened.",
        value       : true
    });
    show_ticks = new formattingSettings.ToggleSwitch({
        name        : "show_ticks",
        displayName : "Show SLK Tick Marks (startup)",
        description : "Controls the default visibility of this layer when the report is opened.",
        value       : true
    });
    state_road_color = new formattingSettings.ColorPicker({
        name        : "State Road Colour",
        displayName : "State Road Colour",
        description : "The colour to use for lines representing a State Owned Road",
        value       : { value: "rgb(50, 100, 100)" },
    });
    psp_colour = new formattingSettings.ColorPicker({
        name        : "Principal Shared Path Colour",
        displayName : "Principal Shared Path Colour",
        description : "The colour to use for lines representing a State Owned Shared Path",
        value       : { value: "rgb(50, 100, 100)" },
    });
    slices = [
        this.show,
        this.show_ticks,
        this.state_road_color,
        this.psp_colour
    ]
}


class MapBackgroundSettings extends formattingSettings.Card {
    name = "map_background";
    displayName = "Map Background";
    url_wmts = new formattingSettings.TextInput({
        name        : "url_wmts",
        displayName : "WMTS Url",
        value       : "",
        placeholder : "https://.../{z}/{y}/{x}.jpgpng"
    })
    url_wmts_show = new formattingSettings.ToggleSwitch({
        name        : "url_wmts_show",
        displayName : "Show WMTS (startup)",
        description : "Controls the default visibility of this layer when the report is opened.",
        value       : true,
    })
    url_tile_arcgis = new formattingSettings.TextInput({
        name        : "url_tile_arcgis",
        displayName : "Tile ArcGIS Url",
        value       : "",
        placeholder : "https://.../rest/services/service_name/ImageServer"
    })
    url_tile_arcgis_show = new formattingSettings.ToggleSwitch({
        name        : "url_tile_arcgis_show",
        displayName : "Show Tile ArcGIS",
        value       : true,
    })
    slices = [
        this.url_wmts,
        this.url_wmts_show,
        this.url_tile_arcgis,
        this.url_tile_arcgis_show
    ]
}

export interface ControlsMode extends powerbi.IEnumMember{
    value: "Expanded" | "Collapsed" | "Disabled";
}

const controls_mode_enum_options:ControlsMode[] = [
    {"displayName": "Disabled",  "value": "Disabled" },
    {"displayName": "Collapsed", "value": "Collapsed"},
    {"displayName": "Expanded",  "value": "Expanded" }
]

class MapBehaviourSettings extends formattingSettings.Card {
    name = "map_behaviour";
    displayName = "Map Behaviour";

    auto_zoom = new formattingSettings.ToggleSwitch({
        name        : "auto_zoom",
        displayName : "Auto Zoom (startup)",
        description :"Controls the default behaviour when the report is first opened; Auto zoom to the extent of loaded features when slicers change.",
        value       : false,
    })

    controls_mode = new formattingSettings.ItemDropdown({
        name        : "controls_mode",
        displayName : "Controls (startup)",
        value       : {value:"Expanded", displayName:"Expanded"},
        items       : controls_mode_enum_options
    })

    controls_size = new formattingSettings.Slider({
        name        :"controls_size",
        displayName :"Controls Scale (%)",
        description :"Size of the map controls that appear in the top right hand side of the map. Select 0% to follow the default device font size.",
        options     :{
            minValue:{type:powerbi.visuals.ValidatorType.Min, value:0},
            maxValue:{type:powerbi.visuals.ValidatorType.Max, value:200},
        },
        value       : 0
    });

    slices = [
        this.auto_zoom,
        this.controls_mode,
        this.controls_size
    ]
}

export class AdvancedSettings extends formattingSettings.Card {
    name        = "advanced_settings";
    displayName = "Advanced Settings";

    warning_note = new formattingSettings.ReadOnlyText({
        displayName:"WARNING:",
        name:"warning_note",
        "value":"These options can degrade performance or cause confusion for viewers."
    });

    offset_multiplier = new formattingSettings.Slider({
        name        : "offset_multiplier",
        displayName : "Offset Multiplier",
        description : "Multiplies the 'offset' value before generating geometry. WARNING: Offsets should be kept as small as possible to avoid distorted or invisible features.",
        options     :{
            minValue:{type:powerbi.visuals.ValidatorType.Min, value:0},
            maxValue:{type:powerbi.visuals.ValidatorType.Max, value:10},
        },
        value: 1
    });

    allow_drag_box_selection = new formattingSettings.ToggleSwitch({
        name        : "allow_drag_box_selection",
        displayName : "Box Selection (Ctrl+Drag)",
        description : "Allow user to select multiple features using `ctrl + left_click + drag`. WARNING: Selecting a large number of features will cause the map to lag or become unresponsive! This is ok to use for sparse features.",
        value       : false,
    });

    slices = [
        this.warning_note,
        this.allow_drag_box_selection,
        this.offset_multiplier,
    ]
}


export class NickMapBIFormattingSettings extends formattingSettings.Model {
    line_format_settings = new LineFormatSettings();
    road_network_settings = new RoadNetworkSettings();
    map_background_settings = new MapBackgroundSettings();
    map_behaviour_settings = new MapBehaviourSettings();
    advanced_settings = new AdvancedSettings();
    cards = [
        this.line_format_settings,
        this.road_network_settings,
        this.map_background_settings,
        this.map_behaviour_settings,
        this.advanced_settings
    ]
}
