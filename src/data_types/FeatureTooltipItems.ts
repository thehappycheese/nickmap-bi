import powerbi from "powerbi-visuals-api";



export type FeatureTooltipItem = {
    column_name: string;
    value: powerbi.PrimitiveValue;
};
