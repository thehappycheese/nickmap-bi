export interface NickmapFeatureCollection {
    type: "FeatureCollection";
    features: {
        type: "Feature";
        id:string,
        geometry: {
            type: "MultiLineString";
            coordinates: [number, number][][];
        };
        properties?: {};
    }[];
}

export interface NickmapFeatureCollection_ServerResponse {
    type: "FeatureCollection";
    features: (
        {
            type: "Feature";
            geometry: {
                type: "MultiLineString";
                coordinates: [number, number][][];
            };
        }
        | null
        | undefined
    )[];
}
