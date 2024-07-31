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

    get empty(): boolean {
        return this.a.length === 0;
    }

    get lastYear(): number {
        return this.a[this.a.length - 1][0];
    }

    get lastValue(): V {
        return this.a[this.a.length - 1][1];
    }
}