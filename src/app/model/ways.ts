import { clamp } from "./lib";
import { Pop } from "./population";
import { Tile } from "./tile";

// - Sumerian names:
//   - nam-ti (𒂍𒃲) Flourishing
//   - šub (𒍑𒋼) Growth
//   - ama-gi (𒄑𒋺𒋛) Freedom
// - Akkadian names:
//   - ṭūbu (𒍑𒂷𒆠𒈨𒉣) Flourishing
//   - wabālu (𒉿𒅁) Growth
//   - andurāru (𒆠𒈠𒊕𒊕𒀭) Freedom

export function flourishing(pop: Pop): number {
    // In our period, let's make this primarily about economics
    // (survival goods) and culture (the sense of a sustainable
    // and meaningful way of life). Raiding losses will be a
    // detriment.

    // Economy: base happiness from prosperity.
    const cr = pop.capacityRatio;
    let baseValue = 0;
    if (cr < 0.5) {
        // Famine or other disaster. Negative happiness, but mitigated
        // by religious belief.
        baseValue = (cr - 0.5) * pop.tile.mods.hope.value;
    } else {
        // Enough to sustain the population, so positive happiness.
        // A basic flourishing of 0.5 would come from a capacity ratio
        // of 1 and sufficient cultural support, which can generally
        // be supplied by clan rituals. Flourishing of 1.0 would take
        // perhaps capacity ratio 2 along with a strong cultural base
        // indicating this is sustainable. Our current temples are maybe
        // enough to get it up to 
        const survivalValue = Math.min(cr - 0.5, 0.5) * pop.tile.mods.grit.value;

        const surplusValue = cr <= 1.0 ? 0
            : Math.log2(cr) * 0.1 + Math.log2(cr) * pop.tile.mods.celebration.value;

        baseValue = survivalValue + surplusValue;
    }

    return baseValue * (1 - raidDiscountFactor(pop.tile));
}

function raidDiscountFactor(t: Tile): number {
    const rl = t.raids.deltaPopulation / t.pop.n;
    return -4 * rl * rl + 5 * rl;
}

function deprivationDiscountFactor(t: Tile): number {
    const cr = t.pop.capacityRatio;
    const lv = t.culture.group.leisureValue;
    if (cr < 0.7) {
        // Deprivation from famine goes up to 100%, but
        // at base value we still have some deprivation
        // from having to work for what we need.
        return lv + 0.75 * (0.7 - cr) / 0.7;
    }
    // Here we're not too deprived, but would still prefer
    // to have more leisure.
    return (1 - (0.7 / cr)) * lv;
}

export type PerFactor = {
    technology: number,
    trade: number,
    religion: number,
    military: number,
    politics: number,
    people: number,
    total: number,
}

export function complexity(t: Tile): number {
    return complexities(t).total;
}

export function complexities(t: Tile): PerFactor {
    return development(t, false);
}

export function freedom(t: Tile): number {
    return freedoms(t).total;
}

export function freedoms(t: Tile): PerFactor {
    return development(t, true);
}

export function development(t: Tile, freedom: boolean): PerFactor {
    const d: PerFactor = {
        technology: t.techKit.complexity,
        trade: t.market.complexity,
        religion: t.religiousSite.complexity,
        military: 1,
        politics: t.controller.complexity,
        people: t.pop.complexity,
        total: 0,
    };

    // If asked for freedom, discount by freedom limiters.
    if (freedom) {
        // Technology puts a bit of new constraints on us but at this early point
        // is mostly empowering.
        d.technology *= 0.9;
        // Trade at this point is probably fairly constrained by tradition and
        // survival needs.
        d.trade *= 0.5;
        // Religion at this point is probably quite constrained by tradition and
        // elitism.
        d.religion *= 0.2;
        // Military action at this point has some freedom, but a lot of necessary
        // revenge cycles and security dilemma action, and not much policy.
        d.military *= 0.2;
        // Politics both creates and limits freedom. The ratio probably depends
        // greatly on the political system. Here we'll assume it's semi-free like trade.
        d.politics *= 0.5;
        // Whatever people are doing is mostly free, but it will be constrained
        // by laws, which will be customary at this point. We'll assume this doesn't
        // actually allow much wiggle room in agrarian societies, but some. Pastoral
        // societies might have more freedom.
        d.people *= t.culture.group.freedom;

        // Discount for things we want freedom from.
        for (const [k, v] of Object.entries(d)) {
            d[k as keyof PerFactor] = v * (1 - raidDiscountFactor(t)) * (1 - deprivationDiscountFactor(t));
        }
    }

    d.total = Object.values(d).reduce((a, b) => a + b, 0);
    return d;
}