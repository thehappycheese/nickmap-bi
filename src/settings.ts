"use strict";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";


class LineFormatSettings extends formattingSettings.Card {
    name = "line_format";
    displayName = "Line Format";
    default_line_colour = new formattingSettings.ColorPicker({
        displayName: "Default Line Colour",
        name: "default_line_colour",
        value: { value: "red" },
    });
    slices = [this.default_line_colour]
}

class RoadNetworkSettings extends formattingSettings.Card {
    name = "road_network";
    displayName = "Road Network";
    show = new formattingSettings.ToggleSwitch({
        displayName: "Show",
        name: "show",
        value: true
    })
    url = new formattingSettings.TextInput({
        displayName: "Url (WFS?)",
        name: "url",
        value: "",
        placeholder: "https://..."
    })
    slices = [
        this.url,
        this.show
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
        displayName: "Show WMTS",
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


export class NickMapBIFormattingSettings extends formattingSettings.Model {
    line_format_settings = new LineFormatSettings()
    road_network_settings = new RoadNetworkSettings()
    map_background_settings = new MapBackgroundSettings()
    cards = [
        this.line_format_settings,
        this.road_network_settings,
        this.map_background_settings,
    ]
}
