
import { FeatureLike } from 'ol/Feature';
import OpenLayersMap from 'ol/Map';
import LineString from 'ol/geom/LineString';
import { Vector as VectorLayer } from 'ol/layer';
import { toContext } from 'ol/render';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { RenderFunction, StyleFunction } from 'ol/style/Style';
import Vector2 from '../Vector2';
import { esri_vector_source } from '../esri_vector_layer_loader';
import { linestring_measure, linestring_ticks } from '../nicks_line_tools';

// const NetworkTypeEnum = {
// 	'Main Roads Controlled Path': 0,
// 	'State Road':                 1,
// 	'Proposed Road':              2,
// 	'Local Road':                 3,
// 	'DEFAULT':                    4,
// }


export const road_network_styles:Readonly<Record<string, Style>> = {
	'Main Roads Controlled Path': new Style({
		stroke: new Stroke({
			color: 'rgba(100, 40, 100)',
			width: 1.5,
		}),
	}),
	'State Road': new Style({
		stroke: new Stroke({
			color: 'rgb(50, 100, 100)',
			width: 1.5,
		}),
	}),
	'Proposed Road': new Style({
		stroke: new Stroke({
			color: 'rgb(50, 100, 100)',
			width: 1.3,
			lineDash: [10, 10]
		}),
		//renderer: custom_renderer_with_SLK_ticks
	}),
	'Local Road': new Style({
		stroke: new Stroke({
			color: 'rgba(50, 50, 110, 255)',
			width: 1,
		}),
	}),
	'DEFAULT': new Style({
		stroke: new Stroke({
			color: 'rgba(40, 40, 80, 255)',
			width: 1,
		}),
	})
};




const road_name_text_style = new Text({
	font: "bold 13px sans-serif",
	placement: 'line',
	textBaseline: 'bottom',
	fill: new Fill({
		color: "#000"
	}),
	stroke: new Stroke({
		color: '#fff',
		width: 1,
	}),
});





const state_road_only_vector_source = new esri_vector_source({
	// This publicly a available endpoint;
	// For more information please see https://portal-mainroads.opendata.arcgis.com/datasets/082e88d12c894956945ef5bcee0b39e2_17/about
	service_url:"https://mrgis.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/",
	layer_number:"17",
	url_params:{
		"outFields":"ROAD,ROAD_NAME,COMMON_USAGE_NAME,START_SLK,END_SLK,CWY,NETWORK_TYPE,RA_NAME,OBJECTID"
	},
	sql_filter: "NETWORK_TYPE in ('Main Roads Controlled Path', 'State Road', 'Proposed Road')",
	tile_size: 256
});
/////////////////////////////////////////
// LAYER: State Road
////////////////////////////////////////


const state_road_vector_layer_style_function:StyleFunction = (feature:FeatureLike, resolution:number) =>{
	let result = road_network_styles[feature.get("NETWORK_TYPE")] ?? road_network_styles["DEFAULT"];
	if (resolution < 0.8) {
		const stl = road_name_text_style.clone();
		stl.setText(feature.get("ROAD") + " - " + feature.get("ROAD_NAME"));
		result = result.clone();
		result.setText(stl);
	} else if (resolution < 3) {
		const stl = road_name_text_style.clone();
		stl.setText(feature.get("ROAD"));
		result = result.clone();
		result.setText(stl);
	}
	return result;
}


// function other_road_vector_layer_style_function(feature, resolution) {
// 	let result =  road_network_styles[feature.get("NETWORK_TYPE")] ?? road_network_styles["DEFAULT"];
// 	if (resolution < 0.8) {
// 		let stl = road_name_text_style.clone();
// 		stl.setText(feature.get("ROAD_NAME"))
// 		result = result.clone()
// 		result.setText(stl)
// 	}
// 	return result;
// }





const custom_render_tick_text = new Text({
	text: "hey",
	font: "bold 16px sans-serif",
	textAlign: "left",
	fill: new Fill({
		color: "#000"
	}),
	stroke: new Stroke({
		color: '#fff',
		width: 1,
	}),
})

// Cannot use pixel coordinates; we need real distances and un-simplified geometry.
const custom_renderer_with_SLK_ticks:(_map: OpenLayersMap) => RenderFunction = (map:OpenLayersMap) => (_pixelCoordinates, state) => {
	// There are a lot of bugs when the pixel ratio is not 1
	// (had issues several versions of open layers ago... maybe no problems now)
	const pixel_ratio = window.devicePixelRatio ?? 1;
	const context = state.context;
	

	const canvas_size_x = context.canvas.width / pixel_ratio;
	const canvas_size_y = context.canvas.height / pixel_ratio;

	const coords = state.geometry.getCoordinates()?.map(item => map.getPixelFromCoordinateInternal(item)) ?? [];
	const network_type = state.feature.get("NETWORK_TYPE");


	const slk_from = state.feature.get('START_SLK');
	const slk_to = state.feature.get('END_SLK');
	const mls = linestring_measure(coords.map(item => new Vector2(...(item as [number, number]))));
	let ticks;
	let decimal_figures;

	if (network_type === "Main Roads Controlled Path" && state.resolution > 4) {
		return;
	}

	if (state.resolution < 0.3) {
		decimal_figures = 2
		//ticks = linestring_ticks(mls, slk_from, slk_to, 0.001, 10, canvas_size_x/pixel_ratio, canvas_size_y/pixel_ratio);
		ticks = linestring_ticks(mls, slk_from, slk_to, 0.001, 10, canvas_size_x, canvas_size_y, decimal_figures);
	} else if (state.resolution < 1.4) {
		decimal_figures = 1
		//ticks = linestring_ticks(mls, slk_from, slk_to, 0.01, 10, canvas_size_x/pixel_ratio, canvas_size_y/pixel_ratio);
		ticks = linestring_ticks(mls, slk_from, slk_to, 0.01, 10, canvas_size_x, canvas_size_y, decimal_figures);
	} else if (state.resolution < 4) {
		decimal_figures = 1
		//ticks = linestring_ticks(mls, slk_from, slk_to, 0.1, 10, canvas_size_x/pixel_ratio, canvas_size_y/pixel_ratio);
		ticks = linestring_ticks(mls, slk_from, slk_to, 0.1, 5, canvas_size_x, canvas_size_y, decimal_figures);
	} else if(state.resolution < 15 ) {
		decimal_figures = 0
		//ticks = linestring_ticks(mls, slk_from, slk_to, 0.1, 10, canvas_size_x/pixel_ratio, canvas_size_y/pixel_ratio);
		ticks = linestring_ticks(mls, slk_from, slk_to, 1, 1, canvas_size_x, canvas_size_y, decimal_figures);
	} else if(state.resolution < 80 ){
		decimal_figures = 0
		//ticks = linestring_ticks(mls, slk_from, slk_to, 0.1, 10, canvas_size_x/pixel_ratio, canvas_size_y/pixel_ratio);
		ticks = linestring_ticks(mls, slk_from, slk_to, 10, 1, canvas_size_x, canvas_size_y, decimal_figures);
	} else {
		decimal_figures = 0
		//ticks = linestring_ticks(mls, slk_from, slk_to, 0.1, 10, canvas_size_x/pixel_ratio, canvas_size_y/pixel_ratio);
		ticks = linestring_ticks(mls, slk_from, slk_to, 50, 1, canvas_size_x, canvas_size_y, decimal_figures);
	}
	const tick_marks = ticks.map(item => ({
		item:[
			[item[0][0].x, item[0][0].y],
			[item[0][1].x, item[0][1].y]
		],
		label:item[1],
		label_rotation:item[2]
    }));
	context.save();
	const renderContext = toContext(context);
	(renderContext as any).extent_ = [0, 0, canvas_size_x, canvas_size_y];  // manual override extent calculation to fix problems when devicePixelRatio is not == 1
	renderContext.setFillStrokeStyle(
		road_network_styles[network_type].getFill()!,
		road_network_styles[network_type].getStroke()!
	);
	const geometry: LineString = state.geometry.clone() as LineString;
	for (const {item, label, label_rotation} of tick_marks) {
		let label_rotation_inner = label_rotation + Math.PI / 2;
		geometry.setCoordinates(item)
		renderContext.drawGeometry(geometry);
		if (label && state.feature.get("CWY") != "Right") {
			const text_style = custom_render_tick_text.clone()
			text_style.setText(label)
			if (Math.abs(label_rotation_inner) > Math.PI / 2) {
				label_rotation_inner += Math.PI;
				text_style.setTextAlign("right");
			}
			text_style.setRotation(label_rotation_inner);
			renderContext.setTextStyle(text_style);
			(renderContext as any).drawText_(item[1], 0, 2, 2);
			renderContext.setTextStyle(null as any);
		}
	}
	context.restore();
}


export const layer_state_road = new VectorLayer({
	source: state_road_only_vector_source,
	style: state_road_vector_layer_style_function,
	minZoom: 6,
});
/**
 * Due to an irritating problem
 * @param map Due to an
 * @returns 
 */
export const get_layer_state_road_ticks = (map:OpenLayersMap) => new VectorLayer({
	source: state_road_only_vector_source,
	style: new Style({
		renderer:custom_renderer_with_SLK_ticks(map)
	}),
	minZoom: 8,
});
