import Vector2 from "./Vector2.ts"

export default class LineSegmentMeasured {
    a: Vector2;
    b: Vector2;
    mag: number;

    constructor(a: Vector2, b: Vector2, mag: number) {
        this.a = a;
        this.b = b;
        this.mag = mag;
    }

    intersect(other: LineSegmentMeasured): [Vector2, number, number] | null {
        const ab = this.b.sub(this.a);
        const cd = other.b.sub(other.a);

        const ab_cross_cd = ab.cross(cd);
        if (ab_cross_cd === 0) {
            return null;
        }

        const ac = other.a.sub(this.a);
        const time_ab = ac.cross(cd) / ab_cross_cd;
        const time_cd = -ab.cross(ac) / ab_cross_cd;

        return [this.a.add(ab.mul(time_ab)), time_ab, time_cd];
    }
}