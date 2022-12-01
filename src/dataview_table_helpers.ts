import powerbi from "powerbi-visuals-api";


export function dataview_table_role_column_indices(data_view_table:powerbi.DataViewTable) {
    let roles:string[] = Array.from(new Set(data_view_table.columns.reduce((acc,cur)=>[...Object.keys(cur.roles),...acc],[])));
    let role_column:[string, number][] = roles.map(
        role_name=> [role_name, data_view_table.columns.findIndex(column=>role_name in column.roles)]
    )
    return Object.fromEntries(role_column)
}

export function * iterate_rows_as_dict(data_view_table:powerbi.DataViewTable):Generator<{
    road_number:string,
    slk_from:number,
    slk_to:number,
    offset:number,
    cwy:string,
    colour:string
}>{
    let role_columns = dataview_table_role_column_indices(data_view_table);
    for (let row of data_view_table.rows){
        yield {
            road_number:     row[role_columns["road_number"]].toString(),
            slk_from: parseFloat(row[role_columns["slk_from"]] as any),
            slk_to:   parseFloat(row[role_columns["slk_to"  ]] as any),
            offset:   parseFloat(row[role_columns["offset"  ]] as any ?? "0"),
            cwy:      row[role_columns["cwy"]] as any ?? "LRS",
            colour:      row[role_columns["colour"]] as any ?? "red",
        };
    }
}