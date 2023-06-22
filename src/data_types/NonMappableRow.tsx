import powerbi from "powerbi-visuals-api";
import { FeatureTooltipItem } from "./FeatureTooltipItems";

export interface NonMappableRow {
    row_number:number
    selection_id: powerbi.visuals.ISelectionId;
    reason: string;
    query:{
        road:string,
        cwy:string,
        slk_from:number,
        slk_to:number,
    }
    tooltips:FeatureTooltipItem[]
}
