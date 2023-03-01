import powerbi from "powerbi-visuals-api";

/**
 * Unless restricted by capabilities.json,
 * The user is able to drag multiple columns into a field well.
 * This means that the DataViewTable is set up to accommodate multiple columns with the
 * same role. For example there may be more than one column with the `road_number` role.
 * 
 * For this visual, this is very annoying ant it makes it pretty frustrating to extract rows of data.
 * 
 * returns: A mapping between <key:role_name --> value:column_number>
 * 
 */
export function dataview_table_role_column_indices__first(data_view_table:powerbi.DataViewTable) {
    // Get unique list of roles
    let roles:string[] = Array.from(
        new Set(
            data_view_table
            .columns
            .reduce((acc,cur)=>[...Object.keys(cur.roles),...acc],[])
        )
    );
    // Find the first column in the data_view_table which is in each role
    let role_column:[string, number][] = roles.map(
        role_name=> [role_name, data_view_table.columns.findIndex(column=>role_name in column.roles)]
    )
    
    return Object.fromEntries(role_column)
}


export function dataview_table_role_column_indices__all(data_view_table:powerbi.DataViewTable) {
    // Get unique list of roles
    let roles:string[] = Array.from(
        new Set(
            data_view_table
            .columns
            .reduce((acc,cur)=>[...Object.keys(cur.roles),...acc],[])
        )
    );
    // Find the first column in the data_view_table which is in each role
    let role_column:[string, number[]][] = roles.map(
        role_name=> [role_name, data_view_table.columns.reduce(
            (acc, column, column_index)=>(role_name in column.roles)? [...acc, column_index]:acc,
            []
        )]
    )
    
    return Object.fromEntries(role_column)
}


export type feature_tooltip_items = {
    column_name:string,
    value:powerbi.PrimitiveValue
}[]

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
    tooltips     : feature_tooltip_items
}[]{
    let result = [];
    let role_columns = dataview_table_role_column_indices__all(data_view_table);
    for (let row_index=0;row_index<data_view_table.rows.length;row_index++){
        // TODO: Build data integrity report
        // if(role_columns["road_number"]===undefined || role_columns["road_number"][0]===undefined || !(typeof role_columns["road_number"][0] === "string")){
        //     continue
        // }
        // if(role_columns["road_number"]===undefined || role_columns["road_number"][0]===undefined || !(typeof role_columns["road_number"][0] === "string")){
        //     continue
        // }
        let row = data_view_table.rows[row_index];
        result.push({
            road_number  :            row[role_columns["road_number"]?.[0]]?.toString() ?? "",
            slk_from     : parseFloat(row[role_columns["slk_from"   ]?.[0]] as any),
            slk_to       : parseFloat(row[role_columns["slk_to"     ]?.[0]] as any),
            offset       : parseFloat(row[role_columns["offset"     ]?.[0]] as any ?? "0"),
            cwy          :            row[role_columns["cwy"        ]?.[0]] as any ?? "LRS",
            colour       :            row[role_columns["colour"     ]?.[0]] as any ?? default_line_color,
            line_width   : default_line_width,
            selection_id : host.createSelectionIdBuilder().withTable(data_view_table, row_index).createSelectionId(),
            tooltips     : role_columns["tooltips"  ]?.map(tooltip_column_index=>({
                column_name: data_view_table.columns[tooltip_column_index].displayName,
                value:row[tooltip_column_index]
            })) ?? []
        });
    }
    return result
}