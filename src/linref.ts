import { NickmapFeatureCollection_ServerResponse } from "./NickmapFeatures";

// =========== Helper functions: ===========
let CWY_LOOKUP = {
    L: 0b0000_0100,
    R: 0b0000_0001,
    S: 0b0000_0010,
    LR: 0b0000_0101,
    LS: 0b0000_0110,
    RS: 0b0000_0011,
    LRS: 0b0000_0111
}
function binary_encode_request(road: string, slk_from: number, slk_to: number, offset: number, cwy: string) {
    let cwy_sorted = Array.from(cwy.toUpperCase()).sort().join("")
    let cwy_encoded = (cwy_sorted in CWY_LOOKUP) ? CWY_LOOKUP[cwy_sorted] : CWY_LOOKUP["LRS"];

    let text_encoder = new TextEncoder();
    let road_bytes = text_encoder.encode(road);

    let buffer = new ArrayBuffer(1 + road_bytes.length + 4 + 4 + 4 + 1);

    let road_name_chunk = new Uint8Array(buffer, 0, 1 + road_bytes.length);
    road_name_chunk[0] = road_bytes.length;
    road_name_chunk.set(road_bytes, 1);

    let data_view = new DataView(buffer, 1 + road_bytes.length);
    data_view.setFloat32(0, slk_from, true) // LITTLE ENDIAN
    data_view.setFloat32(4, slk_to, true) // LITTLE ENDIAN
    data_view.setFloat32(8, offset, true) // LITTLE ENDIAN
    data_view.setUint8(12, cwy_encoded);

    return new Uint8Array(buffer);
}

interface Response_Feature_Type {
    type:"Feature",
    geometry:{
        type:"MultiLineString",
        coordinates:[number, number][][]
    }
}


export async function batch_requests(iter:Iterable<{
    road_number: string,
    slk_from: number,
    slk_to: number,
    offset?: number,
    cwy?: string
}>): Promise<NickmapFeatureCollection_ServerResponse> {
    
    let request_body_parts: Uint8Array[] = [];
    let request_body_byte_length = 0;
    let request_feature_length = 0;

    for(let {road_number: road, slk_from, slk_to, offset=0, cwy="LRS"} of iter){
        let request_bytes = binary_encode_request(road, slk_from, slk_to, offset, cwy);
        request_body_byte_length+=request_bytes.byteLength;
        request_body_parts.push(request_bytes);
        request_feature_length+=1;
    }
    // Pack all queries into a single byte array:
    let request_body = new Uint8Array(request_body_byte_length);
    request_body_parts.reduce((offset, byte_array) => {
        request_body.set(byte_array, offset);
        return offset + byte_array.byteLength;
    },
        0 // initial offset
    )

    // Send the request to the server
    let response = await fetch(
        "https://linref.thehappycheese.com/batch/", 
        {
            method: "POST",
            body: request_body
        });
    if (!response.ok) return {
        type:"FeatureCollection",
        features:new Array(request_feature_length).fill(null)
    };
    let response_json:any;
    try{
        response_json = await response.json();
    }catch(e){
        return {
            type:"FeatureCollection",
            features:new Array(request_feature_length).fill(null)
        };
    }
    
    let features:Response_Feature_Type[] = [];
    for (let multi_line_string_coordinates of response_json) {
        
        features.push(multi_line_string_coordinates ? {
            type: "Feature",
            geometry: {
                type: "MultiLineString",
                coordinates: multi_line_string_coordinates
            }
        }: null);
        
    }
    let result:{
        type:"FeatureCollection",
        features:Response_Feature_Type[]
    } = {
        type: "FeatureCollection",
        features
    }
    return result;
}