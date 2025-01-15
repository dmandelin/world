export class Slice {
    constructor(public f: number, public m: number) {}
}

export class Pyramid {
    constructor(public readonly maxAge: number, slices: Slice[] = []) {
        this.slices = slices.slice(0, Math.min(maxAge, slices.length));
        for (let i = slices.length; i < maxAge; i++) {
            this.slices.push(new Slice(0, 0));
        }
    }

    readonly slices: Slice[];
}

