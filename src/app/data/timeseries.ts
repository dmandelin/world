export class TimeSeries<V> {
    constructor(readonly a: [number, V][] = []) {
    }

    add(t: number, v: V): void {
       this.a.push([t, v]);
    }

    get years(): number[] {
        return this.a.map(([t, _]) => t);
    }

    get values(): V[] {
        return this.a.map(([_, v]) => v);
    }
}