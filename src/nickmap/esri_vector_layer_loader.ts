
// NOTES:
// the {"exceededTransferLimit"...} property means there are more records that can be paged through
// the default limit is 1000
// {"resultOffset":..., "resultRecordCount":...} are used to make repeated requests. resultRecordCount is omitted and the server default is used.


// from https://developers.arcgis.com/documentation/common-data-types/geometry-objects.htm
// The well-known ID (WKID) for a given spatial reference can occasionally change. 
// For example, the WGS 1984 Web Mercator (Auxiliary Sphere) projection was originally assigned WKID 102100 but was later changed to 3857.
// To ensure backward compatibility with older spatial data servers, the JSON wkid property will always be the value that was originally assigned to an SR when it was created
import { EsriJSON } from 'ol/format'
import { Vector as VectorSource } from 'ol/source';
import { Options as VectorSourceConstructorOptions } from 'ol/source/Vector';
import { bbox, tile } from 'ol/loadingstrategy';
import { createXYZ } from 'ol/tilegrid';
import urljoin from 'url-join';



export class esri_vector_source extends VectorSource {

	static esri_json_format = new EsriJSON();
	field_metas;
	field_aliases;
	true_meta_fields;
	fixed_url_component;
	fetch_args = {};


	constructor({ service_url, layer_number, sql_filter, fetch_args = {}, url_params = {}, tile_size = 256, ...args }: {
		service_url: string;
		layer_number: string | number;
		sql_filter: string;
		fetch_args?: RequestInit;
		url_params?: Record<string, string>;
		tile_size?: number;
		args?: VectorSourceConstructorOptions;
	}) {
		super({
			format: esri_vector_source.esri_json_format,
			strategy: (tile_size == 0) ? bbox : tile(createXYZ({ tileSize: tile_size })),
			...args
		});
		this.fetch_args = fetch_args;
		if (service_url === undefined) {
			throw new Error("service_url not provided.")
		}
		this.setLoader(this.esri_vector_loader.bind(this));
		let params = new URLSearchParams({
			f: "json",
			returnGeometry: "true",
			outFields: "*",
			inSR: "102100",
			outSR: "102100",
			spatialRel: "esriSpatialRelIntersects",
			geometryType: "esriGeometryEnvelope",
			where: sql_filter,
			...url_params,
			orderByFields: "OBJECTID", // results are paged in some garbage random order without this
		})
		this.fixed_url_component = urljoin(service_url, layer_number.toString(), "query", "?" + params.toString());
		this.get_layer_metadata(urljoin(service_url, layer_number.toString(), "?f=json"));
	}

	esri_vector_loader(arg_extent, resolution, projection) {
		var url =
			this.fixed_url_component + '&' + new URLSearchParams({
				geometry: JSON.stringify({
					xmin: arg_extent[0],
					ymin: arg_extent[1],
					xmax: arg_extent[2],
					ymax: arg_extent[3]
				})
			});
		this.esri_vector_load_part(url, projection, 0);
	}

	transfrom_feature_properties(feature_properties: { [key: string]: any }) {
		let new_attributes = {};
		for (let [key, value] of Object.entries(feature_properties)) {
			//let value = feature_properties[key];
			if (key === "geometry") continue;
			if (value === null) continue;
			let column_meta = this?.true_meta_fields?.find(cd => cd.name == key) ?? this?.field_metas?.find(cd => cd.name == key) ?? {};
			let column_alias = column_meta?.alias ?? this?.field_aliases?.[key] ?? key;
			if (column_meta.type === "esriFieldTypeOID" || column_meta.name === "GEOLOC.STLength()") {
				continue
			}
			if (column_meta.type === "esriFieldTypeDate") {
				value = new Date(value).toISOString().split("T")[0];
			}
			if (column_meta?.domain?.type === "codedValue") {
				value = column_meta.domain.codedValues.find(cv => cv.code == value).name;
			}
			new_attributes[column_alias] = value;
		}
		return new_attributes;
	}

	esri_vector_load_part(url, projection, offset) {
		let complete_url = url + "&resultOffset=" + offset
		fetch(complete_url,
			{
				method: "GET",
				mode: 'cors',
				...this.fetch_args
			}
		).then(resp => {
			if (!resp.ok) {
				console.log("Failed to fetch. ", url, resp.status);
				return;
			} else {
				return resp.json()
			}
		}).then(json => {
			if (json.error) {
				console.log("query failed!", complete_url, json.error)
				return;
			}

			if (json.exceededTransferLimit) {
				this.esri_vector_load_part(url, projection, offset + json.features.length);
			}

			if (json?.features?.length > 0) {
				if (this.field_aliases === undefined) {
					this.field_aliases = json.field_aliases;
				}
				if (this.field_metas === undefined) {
					this.field_metas = json.fields;
				}
				let features = esri_vector_source.esri_json_format.readFeatures(json, { featureProjection: projection });
				features.forEach((item => {
					item.set("get_nice_properties", () => this.transfrom_feature_properties(item.getProperties()));
					item.setId(item.getProperties()["OBJECTID"])
				}))
				this.addFeatures(features);
			}
		}).catch(err => {
			console.log("Unable to load layer data;", err);
		});
	}

	get_layer_metadata(meta_url) {
		fetch(
			meta_url,
			{ method: "GET", mode: 'cors', ...this.fetch_args }
		)
		.then(response=>{
			if (!response.ok) {
				console.log("Failed to fetch.")
				return
			}else{
				return response.json()
			}
		})
		.then(json=>this.true_meta_fields = json.fields)
		.catch(err=>console.log("unable to retrieve layer metadata;", err))
	}
}