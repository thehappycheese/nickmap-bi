import powerbi from "powerbi-visuals-api";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { IValueFormatter } from "powerbi-visuals-utils-formattingutils/lib/src/valueFormatter";
import { FeatureTooltipItem } from "./data_types/FeatureTooltipItems";

/**
 * Unless restricted by capabilities.json,
 * The user is able to drag multiple columns into a field well.
 * This means that the DataViewTable is set up to accommodate multiple columns with the
 * same role. For example there may be more than one column with the `road_number` role.
 * 
 * This behavior is undesirable for this visual, and it makes it pretty
 * frustrating to extract rows of data.
 * 
 * returns: A mapping between <key:role_name --> value:column_number>
 * 
 */

export function dataview_table_role_column_indices__all(data_view_table:powerbi.DataViewTable) {
    // Get unique list of roles from the list of columns.
    // A reduce  is used to extract every column's list of roles,
    // then Set is used to remove duplicates.
    let role_names:string[] = Array.from(
        new Set(
            data_view_table.columns
            .reduce<string[]>(
                (acc, cur)=>[...Object.keys(cur.roles ?? {}),...acc],
                []
            )
        )
    );
    // Map the name of each role to the indices of the columns that have that
    // role.
    let role_column:[string, number[]][] = role_names.map(
        role_name=> [
            role_name,
            data_view_table.columns.reduce<number[]>(
                (acc, column, column_index)=>(column.roles && role_name in column.roles)? [...acc, column_index]:acc,
                []
            )
        ]
    )
    
    return Object.fromEntries(role_column)
}


/**
 * Transforms a given PowerBI DataViewTable into an array of objects suitable for georeferencing.
 *
 * This function iterates over the rows of the input DataViewTable, converting each row 
 * into an object with properties for road number, start and end SLK, offset, carriageway, colour,
 * line width, selection_id, and tooltips. These objects can be used as input for the 
 * batch_requests function, which georeferences these road segments into a FeatureCollection 
 * suitable for display in OpenLayers.
 *
 * @param data_view_table - The DataViewTable from PowerBI that contains the input data.
 * @param host - The PowerBI visual host, used for creating selection IDs.
 * @param default_line_width - The default line width to use for road segments.
 * @param default_line_color - The default line colour to use for road segments.
 *
 * @returns An array of objects representing road segments, suitable for input to the 
 *          batch_requests function for georeferencing.
 */
export function transform_data_view(
    data_view_table:powerbi.DataViewTable,
    host:powerbi.extensibility.visual.IVisualHost,
    default_line_width:number,
    default_line_color:string,
):{
    road_number  : string,
    slk_from     : number,
    slk_to       : number,
    offset       : number,
    cwy          : string,
    colour       : string,
    line_width   : number,
    selection_id : powerbi.visuals.ISelectionId
    tooltips     : FeatureTooltipItem[]
}[]{
    if (data_view_table.rows === undefined){
        return [];
    }
    let result = [];
    let role_columns = dataview_table_role_column_indices__all(data_view_table);

    // Create value formatters for each tooltip column
    let tooltipFormatters: IValueFormatter[] = role_columns["tooltips"]?.map(tooltip_column_index => {
        let column = data_view_table.columns[tooltip_column_index];
        return valueFormatter.create({ format: column.format });
    }) ?? [];

    for (let row_index=0;row_index<data_view_table.rows.length;row_index++){
        let row = data_view_table.rows[row_index];
        let slk_from = parseFloat(row[role_columns["slk_from"   ]?.[0]] as any);
        let slk_to   = parseFloat(row[role_columns["slk_to"     ]?.[0]] as any);
        if(slk_to<slk_from){
            let temp = slk_to;
            slk_to = slk_from;
            slk_from = temp;
        }
        if(Math.abs(slk_to-slk_from)<0.001){
            // for zero length slk segments we will pad to a length of 10 metres
            slk_from-=0.005;
            slk_to+=0.005;
        }
        result.push({
            road_number  :            row[role_columns["road_number"]?.[0]]?.toString() ?? "",
            slk_from     : slk_from,
            slk_to       : slk_to,
            offset       : parseFloat(row[role_columns["offset"     ]?.[0]] as any ?? "0"),
            cwy          :            row[role_columns["cwy"        ]?.[0]] as any ?? "LRS",
            colour       :            row[role_columns["colour"     ]?.[0]] as any ?? default_line_color,
            line_width   : default_line_width,
            selection_id : host.createSelectionIdBuilder().withTable(data_view_table, row_index).createSelectionId(),
            tooltips     : role_columns["tooltips"  ]?.map((tooltip_column_index, index)=>({
                column_name: data_view_table.columns[tooltip_column_index].displayName,
                value:tooltipFormatters[index].format(row[tooltip_column_index])
            })) ?? []
        });
    }
    return result
}