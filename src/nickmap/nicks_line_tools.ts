import Vector2 from "./Vector2";



type NickLineString = Vector2[]
type NickMeasuredLineString = [[Vector2, number][], number]

//def linestring_measure(linestring: List[Vector2]) -> Tuple[List[Tuple[Vector2, float]], float]:
export function linestring_measure(line_string:NickLineString):NickMeasuredLineString {
	// """:returns: ([(point:vector, dist_to_next_point:float), ...], total_length:float)"""
	if (line_string.length===0){
		return [[],0];
	}else if(line_string.length===1){
		return [[[line_string[0],0]],0];
	}else{
		let result:[Vector2, number][] = [];
		let total_length = 0;
		let b:Vector2 = line_string.at(-1);
		for (let i = 0; i < line_string.length - 1; i++) {
			let a:Vector2 = line_string[i];
			b = line_string[i + 1];
			let ab = b.sub(a);
			let ab_len = ab.len();
			result.push([a, ab_len]);
			total_length += ab_len;
		}
		result.push([b, 0]);
		return [result, total_length];
	}
}

export function linestring_direction(measured_line_string:NickMeasuredLineString, normalised_distance_along:number) {
	// returns the direction (as a unit vector) of a linestring segment which contains the point
	let [points, total_length] = measured_line_string;
	let de_normalised_distance_along = total_length * normalised_distance_along;
	let len_so_far = 0;
	let ab_len;
	let ab;
	for (let i = 0; i < points.length - 1; i++) {
		let a;
		[a, ab_len] = points[i];
		let [b, _] = points[i + 1];
		ab = b.sub(a);
		len_so_far += ab_len;
		if (len_so_far >= de_normalised_distance_along) {
			return ab.copy().scalar_divide(ab_len);
		}
	}
	return ab.copy().scalar_divide(ab_len);
}

export function linestring_ticks(
	measured_line_string:NickMeasuredLineString,
	slk_from:number,
	slk_to:number,
	minor_interval_km:number,
	major_interval_count:number,
	x_px,
	y_px,
	decimal_figures:number
	) {

	// returns the direction (as a unit vector) of a linestring segment which contains the point

	let result:[[Vector2,Vector2],string|undefined,number][] = [];
	let [points, length_px] = measured_line_string;

	let length_km = slk_to - slk_from;

	let distance_from_start_to_next_tick = minor_interval_km - (slk_from % minor_interval_km);
	//let distance_from_start_to_last_tick = length_km - (slk_to % minor_interval_km);
	//let distance_from_first_tick_to_last_tick = distance_from_start_to_last_tick - distance_from_start_to_next_tick;

	let distance_from_start_to_next_major_tick = minor_interval_km * major_interval_count - (slk_from % (minor_interval_km * major_interval_count));
	let number_of_ticks_to_first_major_interval = Math.round((distance_from_start_to_next_major_tick - distance_from_start_to_next_tick) / minor_interval_km);

	//let num_ticks = Math.round(distance_from_first_tick_to_last_tick / minor_interval_km);

	let minor_interval_px = minor_interval_km / length_km * length_px;

	let initial_offset_px = distance_from_start_to_next_tick / length_km * length_px
	let offset_multiplier = 0;
	let len_so_far_px = 0;

	let current_offset_px = initial_offset_px;
	let ticks_to_major_interval = number_of_ticks_to_first_major_interval
	for (let i = 0; i < points.length - 1; i++) {
		let a = points[i][0];
		let ab_len = points[i][1];
		let b = points[i + 1][0];
		let ab = b.sub(a);
		let ab_unit = ab.div(ab_len);
		let len_after_segment = len_so_far_px + ab_len;
		while (current_offset_px < len_after_segment) {
			let is_major_tick = (offset_multiplier % major_interval_count) == number_of_ticks_to_first_major_interval
			let tick_length_px = is_major_tick ? 6 : 2;
			let segment_offset = current_offset_px - len_so_far_px
			let base = a.add(ab_unit.mul(segment_offset));
			if (!(base.x < 0 || base.x > x_px || base.y < 0 || base.y > y_px)) {
				result.push([
					[
						base.add(ab_unit.left().mul(-tick_length_px)),
						base.add(ab_unit.left().mul(tick_length_px))
					],
					is_major_tick ? (offset_multiplier * minor_interval_km + distance_from_start_to_next_tick + slk_from).toFixed(decimal_figures) : undefined,
					Math.atan2(ab_unit.y, ab_unit.x)
				]);
			}
			offset_multiplier++;
			if (ticks_to_major_interval == 0) {
				ticks_to_major_interval = major_interval_count;
			}
			ticks_to_major_interval--;
			current_offset_px = offset_multiplier * minor_interval_px + initial_offset_px;
		}
		len_so_far_px = len_after_segment;
	}

	return result;
}
