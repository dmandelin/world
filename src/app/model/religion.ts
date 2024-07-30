import { WorldLog } from "./world";

class ReligiousTrait {
    constructor(
        readonly name: string) {
    }
}

class ReligiousTraitsSingleton {
    readonly Fertility = new ReligiousTrait('Fertility');
    readonly Agrarian = new ReligiousTrait('Agrarian');
    readonly Pastoral = new ReligiousTrait('Pastoral');
    readonly Trading = new ReligiousTrait('Trading');
}

export const ReligiousTraits = new ReligiousTraitsSingleton();

class TempleLevel {
    constructor(
        readonly name: string,
        readonly level: number,
        readonly cost: number, 
        readonly capacity: number) {
    }
}

export const TempleLevels = [
    new TempleLevel('Shrines', 0, 0, 500),
    new TempleLevel('Temple I', 1, 100, 1000),
    new TempleLevel('Temple II', 2, 300, 2000),
    new TempleLevel('Temple III', 3, 1000, 5000),
    new TempleLevel('Temple IV', 4, 3000, 10000),
]

export class Temple {
    private level_ = 0;
    private construction_ = 0;

    constructor(readonly traits: ReligiousTrait[]) {
    }

    private get l() { return TempleLevels[this.level_]; }
    get name() { return this.l.name; }
    get capacity() { return this.l.capacity; }

    get construction() { return this.construction_; }
    get nextLevel() { return TempleLevels[this.level_ + 1]; }

    applyConstruction(construction: number): boolean {
        if (this.level_ == TempleLevels.length - 1) {
            return false;
        }
        const nextLevel = TempleLevels[this.level_ + 1];

        this.construction_ += construction;
        if (this.construction_ >= nextLevel.cost) {
            ++this.level_;
            this.construction_ -= nextLevel.cost;
            if (this.level_ == TempleLevels.length - 1) {
                this.construction_ = 0;
            }
            return true;
        }
        return false;
    }
}