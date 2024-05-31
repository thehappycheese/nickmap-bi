export default class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static new(x: number, y: number): Vector2 {
        return new Vector2(x, y);
    }

    magnitudeSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    direction(): number {
        return Math.atan2(this.y, this.x);
    }

    distanceTo(other: Vector2): number {
        let dx = other.x - this.x;
        let dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    cross(other: Vector2): number {
        return this.x * other.y - this.y * other.x;
    }

    left(): Vector2 {
        return new Vector2(-this.y, this.x);
    }

    right(): Vector2 {
        return new Vector2(this.y, -this.x);
    }

    unit(): Vector2 {
        let mag = this.magnitude();
        return new Vector2(this.x / mag, this.y / mag);
    }

    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    neg(): Vector2 {
        return new Vector2(-this.x, -this.y);
    }

    div(other: number): Vector2 {
        return new Vector2(this.x / other, this.y / other);
    }

    mul(other: number): Vector2 {
        return new Vector2(this.x * other, this.y * other);
    }
}