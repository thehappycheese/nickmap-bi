import Vector2 from './Vector2';
import LineSegmentMeasured from './LineSegmentMeasured';

export default class LineStringMeasured {
    segments: LineSegmentMeasured[];
    mag: number;

    constructor(segments: LineSegmentMeasured[], mag: number) {
        this.segments = segments;
        this.mag = mag;
    }

    static fromVectors(vectors: Vector2[]): LineStringMeasured {
        if (vectors.length <= 1) {
            return new LineStringMeasured([], 0);
        }

        let sumMag = 0;
        const vecPart: LineSegmentMeasured[] = [];

        for (let i = 0; i < vectors.length - 1; i++) {
            const a = vectors[i];
            const b = vectors[i + 1];
            const abMag = a.distanceTo(b);
            sumMag += abMag;
            vecPart.push(new LineSegmentMeasured(a, b, abMag));
        }

        return new LineStringMeasured(vecPart, sumMag);
    }

    toVectors(): Vector2[] {
        const result: Vector2[] = this.segments.map(seg => seg.a);
        if (this.segments.length > 0) {
            result.push(this.segments[this.segments.length - 1].b);
        }
        return result;
    }

    intoTuples(): [number, number][] {
        const result: [number, number][] = this.segments.map(seg => [seg.a.x, seg.a.y]);
        if (this.segments.length > 0) {
            const lastSeg = this.segments[this.segments.length - 1];
            result.push([lastSeg.b.x, lastSeg.b.y]);
        }
        return result;
    }

    intoTuplesMeasured(fromMeasure: number, toMeasure: number): [number, number, number][] {
        const measureLen = toMeasure - fromMeasure;
        const scale = measureLen / this.mag;
        let eachMeasure = fromMeasure;

        const result: [number, number, number][] = this.segments.map(seg => {
            const res = [seg.a.x, seg.a.y, eachMeasure];
            eachMeasure += seg.mag * scale;
            return res as [number, number, number];
        });

        if (this.segments.length > 0) {
            const lastSeg = this.segments[this.segments.length - 1];
            result.push([lastSeg.b.x, lastSeg.b.y, toMeasure]);
        }

        return result;
    }

    magnitude(): number {
        return this.mag;
    }

    offsetSegments(distance: number): LineSegmentMeasured[] {
        return this.segments.map(({ a, b, mag }) => {
            const offsetVector = b.sub(a).left().unit().mul(distance);
            return new LineSegmentMeasured(a.add(offsetVector), b.add(offsetVector), mag);
        });
    }

    cut(fractionOfLength: number): [LineStringMeasured | null, LineStringMeasured | null] {
        const distanceAlong = this.mag * fractionOfLength;

        if (distanceAlong <= 0) {
            return [null, this];
        } else if (distanceAlong >= this.mag) {
            return [this, null];
        } else {
            let distanceSoFar = 0;
            let distanceRemaining = distanceAlong;
            for (let index = 0; index < this.segments.length; index++) {
                const { a, b, mag: segmentLength } = this.segments[index];
                if (distanceRemaining <= 0) {
                    return [
                        new LineStringMeasured(this.segments.slice(0, index), distanceAlong),
                        new LineStringMeasured(this.segments.slice(index), this.mag - distanceAlong)
                    ];
                } else if (distanceRemaining < segmentLength) {
                    const abUnit = b.sub(a).div(segmentLength);
                    const intermediatePoint = a.add(abUnit.mul(distanceRemaining));

                    const part1 = this.segments.slice(0, index);
                    part1.push(new LineSegmentMeasured(a, intermediatePoint, distanceRemaining));

                    const part2 = [
                        new LineSegmentMeasured(intermediatePoint, b, segmentLength - distanceRemaining),
                        ...this.segments.slice(index + 1)
                    ];

                    return [
                        new LineStringMeasured(part1, distanceSoFar + distanceRemaining),
                        new LineStringMeasured(part2, this.mag - distanceSoFar - distanceRemaining)
                    ];
                }
                distanceSoFar += segmentLength;
                distanceRemaining -= segmentLength;
            }
        }
        return [null, null];
    }

    cutTwice(
        fractionOfLengthStart: number,
        fractionOfLengthEnd: number
    ): [LineStringMeasured | null, LineStringMeasured | null, LineStringMeasured | null] {
        const [a, bc] = this.cut(fractionOfLengthStart);
        if (bc) {
            const aFractionOfLength = Math.max(fractionOfLengthStart, 0);
            const bcFractionOfLength = 1 - aFractionOfLength;
            const [b, c] = bc.cut((fractionOfLengthEnd - aFractionOfLength) / bcFractionOfLength);
            return [a, b, c];
        } else {
            return [a, null, null];
        }
    }

    interpolate(fractionOfLength: number): Vector2 | null {
        if (this.segments.length === 0) {
            return null;
        }

        if (fractionOfLength <= 0) {
            return this.segments[0].a;
        }

        const deNormalisedDistanceAlong = this.mag * fractionOfLength;
        let lenSoFar = 0;

        for (const { a, b, mag: segmentLength } of this.segments) {
            lenSoFar += segmentLength;
            if (lenSoFar >= deNormalisedDistanceAlong) {
                return b.sub(b.sub(a).div(segmentLength).mul(lenSoFar - deNormalisedDistanceAlong));
            }
        }

        return this.segments[this.segments.length - 1].b;
    }

    direction(fractionOfLength: number): number {
        const deNormalisedDistanceAlong = this.mag * fractionOfLength;
        let lenSoFar = 0;

        for (const { a, b, mag: segmentLength } of this.segments) {
            lenSoFar += segmentLength;
            if (lenSoFar >= deNormalisedDistanceAlong) {
                return b.sub(a).direction();
            }
        }

        return 0;
    }

    offsetBasic(distance: number): Vector2[] | null {
        if (this.segments.length === 0) {
            return null;
        }

        const offsetSegments = this.offsetSegments(distance);
        const points: Vector2[] = [offsetSegments[0].a];

        for (let i = 0; i < offsetSegments.length - 1; i++) {
            const mseg1 = offsetSegments[i];
            const mseg2 = offsetSegments[i + 1];
            const ab = mseg1.b.sub(mseg1.a);
            const cd = mseg2.b.sub(mseg2.a);

            if (Math.abs(ab.cross(cd)) < 0.00000001) {
                points.push(mseg1.b);
            } else {
                const intersection = mseg1.intersect(mseg2);
                if (intersection) {
                    const [intersectionPoint, timeAb, timeCd] = intersection;
                    const tipAb = 0 <= timeAb && timeAb <= 1;
                    const fipAb = !tipAb;
                    const pfipAb = fipAb && timeAb > 0;
                    const tipCd = 0 <= timeCd && timeCd <= 1;
                    const fipCd = !tipCd;

                    if (tipAb && tipCd) {
                        points.push(intersectionPoint);
                    } else if (fipAb && fipCd) {
                        if (pfipAb) {
                            points.push(intersectionPoint);
                        } else {
                            points.push(mseg1.b, mseg2.a);
                        }
                    } else {
                        points.push(mseg1.b, mseg2.a);
                    }
                }
            }
        }

        points.push(offsetSegments[offsetSegments.length - 1].b);
        return points;
    }
}
