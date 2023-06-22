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
    data_view.setFloat32(0, Math.min(slk_from, slk_to), true) // LITTLE ENDIAN
    data_view.setFloat32(4, Math.max(slk_from, slk_to), true) // LITTLE ENDIAN
    data_view.setFloat32(8, offset, true) // LITTLE ENDIAN
    data_view.setUint8(12, cwy_encoded);

    return new Uint8Array(buffer);
}

interface Response_Feature_Type {
    type: "Feature",
    geometry: {
        type: "MultiLineString",
        coordinates: [number, number][][]
    }
}

export class BatchRequestBinaryEncodingError extends Error { }
export class BatchRequestFetchError extends Error { }
export class BatchRequestAbortedError extends Error { }
export class BatchRequestResponseError extends Error { }
export class BatchRequestJSONDeserializeError extends Error { }
export class BatchRequestOutdatedBeforeFetchError extends Error { }
export class BatchRequestOutdatedAfterFetchError extends Error { }
export class BatchRequestRequestIDMismatchError extends Error { }


let x_request_id_global_latest: number = 0;

export async function batch_requests(
    road_segments: {
        road_number: string,
        slk_from: number,
        slk_to: number,
        offset?: number,
        cwy?: string
    }[],
    offset_multiplier: number
): Promise<NickmapFeatureCollection_ServerResponse> {
    if (road_segments.length === 0) {
        return {
            type: "FeatureCollection",
            features: []
        }
    }
    let request_body_parts: Uint8Array[] = [];
    let request_body_byte_length = 0;
    let request_feature_length = 0;
    try {
        for (let { road_number: road, slk_from, slk_to, offset = 0, cwy = "LRS" } of road_segments) {
            let request_bytes = binary_encode_request(road, slk_from, slk_to, offset * offset_multiplier, cwy);
            request_body_byte_length += request_bytes.byteLength;
            request_body_parts.push(request_bytes);
            request_feature_length += 1;
        }
    } catch (e) {
        throw new BatchRequestBinaryEncodingError()
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
    let x_request_id_request: number = (new Date()).getTime()
    if (x_request_id_request < x_request_id_global_latest) {
        throw new BatchRequestOutdatedBeforeFetchError()
    }
    // set the latest request
    x_request_id_global_latest = x_request_id_request;

    let response: Response;
    try {
        let fetch_promise = fetch_with_abort(
            //"https://linref.thehappycheese.com/batch/",
            "https://nicklinref-dev-mrwauedevnmbascr.australiaeast.azurecontainer.io/batch/",
            {
                method: "POST",
                body: request_body,
                headers: {
                    "x-request-id": x_request_id_request.toFixed(0),
                }
            }
        );

        response = await fetch_promise;
    } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
            throw new BatchRequestAbortedError(`BatchRequestAbortedError`)
        } else {
            throw new BatchRequestFetchError(`BatchRequestFetchError(${e.message})`, { cause: e })
        }
    }
    if (!response.ok) {
        throw new BatchRequestResponseError(`BatchRequestResponseError(${response.status.toString()},${response.statusText})`, { cause: response })
    }

    // retrieve x-request-id header from response
    let x_request_id_response: number | undefined = undefined;
    if (response.headers.has("x-request-id")) {
        x_request_id_response = parseInt(response.headers.get("x-request-id"));
        if (x_request_id_response !== x_request_id_request) {
            // This seems very unlikely, it would indicate a deeply concerning
            // error in the server code, or a botched hack attempt
            throw new BatchRequestRequestIDMismatchError(`BatchRequestRequestIDMismatchError`, { cause: response })
        }
        if (x_request_id_response < x_request_id_global_latest) {
            throw new BatchRequestOutdatedAfterFetchError()
        }
    }


    // decode response
    let response_json: any;
    try {
        response_json = await response.json();
    } catch (e) {
        throw new BatchRequestJSONDeserializeError(`BatchRequestJSONDeserializeError(${e.message.slice(0, 20)})`, { cause: e })
    }

    // TODO: lift the next step so we can combine it with the tep where we append the feature properties?
    let features: Response_Feature_Type[] = [];
    for (let multi_line_string_coordinates of response_json) {
        features.push(multi_line_string_coordinates ? {
            type: "Feature",
            geometry: {
                type: "MultiLineString",
                coordinates: multi_line_string_coordinates
            }
        } : null);
    }
    let result: {
        type: "FeatureCollection",
        features: Response_Feature_Type[]
    } = {
        type: "FeatureCollection",
        features
    }
    return result;
}


let fetch_with_abort_controller = null;
async function fetch_with_abort(url: RequestInfo, parameters: RequestInit = {}) {
    // Abort the previous fetch request if there is one still in flight
    if (fetch_with_abort_controller) {
        fetch_with_abort_controller.abort();
    }

    // Create a new AbortController for the current fetch request
    fetch_with_abort_controller = new AbortController();

    try {
        return await fetch(url, { ...parameters, signal: fetch_with_abort_controller.signal });
    } finally {
        // Reset the controller after a successful, aborted or failed fetch
        fetch_with_abort_controller = null;
    }
}