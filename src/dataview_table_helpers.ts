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
export function dataview_table_role_column_indices(data_view_table:powerbi.DataViewTable) {
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

export function * iterate_rows_as_dict(
    data_view_table:powerbi.DataViewTable,
    host:powerbi.extensibility.visual.IVisualHost

):Generator<{
    road_number:string,
    slk_from:number,
    slk_to:number,
    offset:number,
    cwy:string,
    colour:string,
    selection_id:powerbi.visuals.ISelectionId
}>{
    
    let role_columns = dataview_table_role_column_indices(data_view_table);
    for (let row_index=0;row_index<data_view_table.rows.length;row_index++){
        let row = data_view_table.rows[row_index];
        yield {
            road_number  : row[role_columns["road_number"]]?.toString() ?? "",
            slk_from     : parseFloat(row[role_columns["slk_from"]] as any),
            slk_to       : parseFloat(row[role_columns["slk_to"  ]] as any),
            offset       : parseFloat(row[role_columns["offset"  ]] as any ?? "0"),
            cwy          : row[role_columns["cwy"]] as any ?? "LRS",
            colour       : row[role_columns["colour"]] as any ?? "red",
            selection_id : host.createSelectionIdBuilder().withTable(data_view_table, row_index).createSelectionId(),
        };
    }
}