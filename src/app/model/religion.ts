import { Tile, TileModifiers, TileModifierValues } from "./tile";
import { WorldLog } from "./world";

// More on religion from Atran:
// - Religion is not an evolutionary adaptation. This was argued
//   extensively using different models. Also, I found this the
//   evolutionary story initially appealing, but I couldn't imagine
//   dynamics that would actually make it happen. For one, although
//   there were different conquest events and cultural assimilations
//   in history, I'm really not aware of any natural laboratory
//   where we can see Darwinian-type processes among societies.
//   Rather, it's a much more complicated process involving also
//   imitation, blending, and choice.
// - What does promote religious belief and commitment:
//   - Inexplicable stuff
//   - Anxieties practical and existential
//   - Cultural transmission, emphasizing songs, stories with
//     just enough incongruous elements to stand out, and linkages
//     among practices
//   - Costly rituals, which especially help form community
//     membership and higher expectations of cooperation
// - Note spectrum of doctrinal vs enactive
// - Note schisms and reformations
// - Once it exists, religion can have effects on other aspects of
//   society and development:
//   + individual peace of mind and well-being
//   + solidarity
//   + peace
//   + morale in conflicts
//   + donations and public goods
//   + trustworthy trade
//   + emotions: can be many: fear, hope, awe
//   + cultural development
//   + intellectual development
// - This could all get increasingly complicated, adding and subtracting
//   different practices and beliefs, and allowing for both altruistic
//   and exploitative behavior.

export class ReligiousTrait {
    constructor(
        readonly name: string,
        readonly mods: TileModifierValues = {}) {
    }
}

class ReligiousTraitsSingleton {
    readonly Fertility = new ReligiousTrait('Fertility', {
        popGrowth: 1.2,

        hope: 0.8,
        grit: 1.1,
        celebration: 0.15,
    });
    readonly Agrarian = new ReligiousTrait('Agrarian', {
        farming: 1.1,

        hope: 0.6,
        grit: 1.1,
        celebration: 0.2,
    });
    readonly Pastoral = new ReligiousTrait('Pastoral', {
        herding: 1.1,

        hope: 0.9,
        grit: 1.2,
        celebration: 0.1,
    });
    readonly Trading = new ReligiousTrait('Trading', {
        trading: 0.7,

        hope: 0.9,
        celebration: 0.3,
    });
    readonly Peace = new ReligiousTrait('Peace', {
        farming: 1.1,
        herding: 1.05,
        trading: 0.9,

        hope: 0.8,
        celebration: 0.2,
    });
    readonly War = new ReligiousTrait('War', {
        farming: 0.9,
        herding: 0.95,
        trading: 1.1,

        raidIntensity: 1.5,
        raidCapture: 1.2,

        celebration: 0.1,
    });
}

export const ReligiousTraits = new ReligiousTraitsSingleton();

class TempleLevel {
    constructor(
        readonly name: string,
        readonly complexity: number,
        readonly level: number,
        readonly cost: number, 
        readonly capacity: number) {
    }
}

export const TempleLevels = [
    new TempleLevel('Shrines', 1, 0, 0, 500),
    new TempleLevel('Temple I', 1.8, 1, 100, 1000),
    new TempleLevel('Temple II', 2.4, 2, 300, 2000),
    new TempleLevel('Temple III', 3.2, 3, 1000, 5000),
    new TempleLevel('Temple IV', 4, 4, 3000, 10000),
]

export class ReligiousSite {
    constructor(readonly traits: ReligiousTrait[]) {
    }

    get name(): string { throw new Error('abstract method'); }
    get capacity(): number { throw new Error('abstract method'); }
    get complexity(): number { throw new Error('abstract method'); }
    
    refreshModifiers(tile: Tile) {
        for (const trait of this.traits) {
            for (const [modName, baseValue] of Object.entries(trait.mods)) {
                tile.mods[modName as keyof TileModifiers].apply(
                    trait.name + ' rites', baseValue, this.capacity / tile.population)
            }
        }
    }
}

export class HolySite extends ReligiousSite {
    override get name() { return 'Holy Mountain'; }
    override get capacity() { return 500; }
    override get complexity() { return 1; }
}

export class Temple extends ReligiousSite {
    private level_ = 0;
    private construction_ = 0;

    private get l() { return TempleLevels[this.level_]; }
    override get name() { return this.l.name; }
    override get capacity() { return this.l.capacity; }
    override get complexity() { return this.l.complexity; }

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