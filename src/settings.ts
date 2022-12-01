"use strict";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

class MapBackgroundSettings extends formattingSettings.Card {
    name: string = "map_background";
    displayName:string = "Map Background";

    url = new formattingSettings.TextInput({
        displayName:"Url",
        name: "url",
        value: "",
        placeholder: "https://"
    });

    colour = new formattingSettings.ColorPicker({
        displayName:"Colour",
        name: "colour",
        value:null
    });
    slices: Array<formattingSettings.Slice>;

    constructor(){
        super()
        this.slices = [this.url, this.colour]
    }
}

export class NickMapBIFormattingSettings extends formattingSettings.Model {
    // Create formatting settings model formatting cards
    map_background_card = new MapBackgroundSettings();
    constructor(){
        super()
        this.cards = [this.map_background_card];
    }
}
