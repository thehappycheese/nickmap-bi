"use strict";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import powerbi from "powerbi-visuals-api";


class LineFormatSettings extends formattingSettings.Card {
    name = "line_format";
    displayName = "Line Format";
    default_line_colour = new formattingSettings.ColorPicker({
        displayName: "Default Line Colour",
        description: "This is the colour that will be used when the Colour field well is not populated",
        name: "default_line_colour",
        value: { value: "red" },
    });
    default_line_width = new formattingSettings.NumUpDown({
        displayName: "Line Width (pixels)",
        name: "default_line_width",
        options:{
            unitSymbol:"px",
            unitSymbolAfterInput:true,
            minValue:{type:powerbi.visuals.ValidatorType.Min, value:0.1},
            maxValue:{type:powerbi.visuals.ValidatorType.Max, value:100},
            required:{type:powerbi.visuals.ValidatorType.Required}
        },
        value:5
    });
    offset_multiplier = new formattingSettings.Slider({
        displayName: "Offset Multiplier",
        name: "offset_multiplier",
        options:{
            minValue:{type:powerbi.visuals.ValidatorType.Min, value:0},
            maxValue:{type:powerbi.visuals.ValidatorType.Max, value:5},

        },
        value: 1
    });
    slices = [
        this.default_line_colour,
        this.default_line_width,
        this.offset_multiplier,
    ]
}

class RoadNetworkSettings extends formattingSettings.Card {
    name = "road_network";
    displayName = "Road Network";
    show = new formattingSettings.ToggleSwitch({
        displayName: "Show (startup)",
        description: "Controls the default visibility of this layer when the report is opened.",
        name: "show",
        value: true
    });
    show_ticks = new formattingSettings.ToggleSwitch({
        displayName: "Show SLK Tick Marks (startup)",
        description: "Controls the default visibility of this layer when the report is opened.",
        name: "show_ticks",
        value: true
    });
    state_road_color = new formattingSettings.ColorPicker({
        displayName: "State Road Colour",
        name: "State Road Colour",
        description: "The colour to use for lines representing a State Owned Road",
        value: { value: "rgb(50, 100, 100)" },
    });
    psp_colour = new formattingSettings.ColorPicker({
        displayName: "Principal Shared Path Colour",
        name: "Principal Shared Path Colour",
        description: "The colour to use for lines representing a State Owned Shared Path",
        value: { value: "rgb(50, 100, 100)" },
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
        displayName: "WMTS Url",
        name: "url_wmts",
        value: "",
        placeholder: "https://.../{z}/{y}/{x}.jpgpng"
    })
    url_wmts_show = new formattingSettings.ToggleSwitch({
        displayName: "Show WMTS (startup)",
        description: "Controls the default visibility of this layer when the report is opened.",
        name: "url_wmts_show",
        value: true,
    })
    url_tile_arcgis = new formattingSettings.TextInput({
        displayName: "Tile ArcGIS Url",
        name: "url_tile_arcgis",
        value: "",
        placeholder: "https://.../rest/services/service_name/ImageServer"
    })
    url_tile_arcgis_show = new formattingSettings.ToggleSwitch({
        displayName: "Show Tile ArcGIS",
        name: "url_tile_arcgis_show",
        value: true,
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
        displayName: "Auto Zoom (startup)",
        description:"Controls the default behaviour when the report is first opened; Auto zoom to the extent of loaded features when slicers change.",
        name: "auto_zoom",
        value: false,
    })

    controls_mode = new formattingSettings.ItemDropdown({
        displayName: "Controls (startup)",
        name: "controls_mode",
        value: {value:"Expanded", displayName:"Expanded"},
        items: controls_mode_enum_options
    })

    controls_size = new formattingSettings.Slider({
        displayName:"Controls Scale (%)",
        name:"controls_size",
        description:"Size of the map controls that appear in the top right hand side of the map. Select 0% to follow the default device font size.",
        options:{
            minValue:{type:powerbi.visuals.ValidatorType.Min, value:0},
            maxValue:{type:powerbi.visuals.ValidatorType.Max, value:200},
        },
        value: 0
    });

    slices = [
        this.auto_zoom,
        this.controls_mode,
        this.controls_size
    ]
}


export class NickMapBIFormattingSettings extends formattingSettings.Model {
    line_format_settings = new LineFormatSettings()
    road_network_settings = new RoadNetworkSettings()
    map_background_settings = new MapBackgroundSettings()
    map_behaviour_settings = new MapBehaviourSettings()
    cards = [
        this.line_format_settings,
        this.road_network_settings,
        this.map_background_settings,
        this.map_behaviour_settings,
    ]
}
