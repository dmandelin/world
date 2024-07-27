export class TimeSeries<V> {
    constructor(readonly a: [number, V][] = []) {
    }

    add(t: number, v: V): void {
       this.a.push([t, v]);
    }
}