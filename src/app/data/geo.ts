export type Vector = [number, number];

export function mean(v1: Vector, v2: Vector): Vector {
    return [0.5 * (v1[0] + v2[0]), 0.5 * (v1[1] + v2[1])];
}