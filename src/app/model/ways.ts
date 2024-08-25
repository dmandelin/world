import { clamp } from "./lib";
import { Tile } from "./tile";

export function flourishing(t: Tile): number {
    // In our period, let's make this primarily about economics
    // (survival goods) and culture (the sense of a sustainable
    // and meaningful way of life). Raiding losses will be a
    // detriment.

    // Economy: base happiness from prosperity.
    const cr = t.pop.capacityRatio;
    let baseValue = 0;
    if (cr < 0.5) {
        // Famine or other disaster. Negative happiness, but mitigated
        // by religious belief.
        baseValue = (cr - 0.5) * t.bonus('hopeFactor');
    } else {
        // Enough to sustain the population, so positive happiness.
        // A basic flourishing of 0.5 would come from a capacity ratio
        // of 1 and sufficient cultural support, which can generally
        // be supplied by clan rituals. Flourishing of 1.0 would take
        // perhaps capacity ratio 2 along with a strong cultural base
        // indicating this is sustainable. Our current temples are maybe
        // enough to get it up to 
        const survivalValue = Math.min(cr - 0.5, 0.5) * t.bonus('gritFactor');

        const surplusValue = cr <= 1.0 ? 0
            : Math.log2(cr) * 0.1 + Math.log2(cr) * t.bonus('prosperityFactor');

        baseValue = survivalValue + surplusValue;
    }

    // Reduce for raid effects. We want a function where losses count 5x
    // for small amounts, but integrates to 1. So f'(0) = 5, f(0) = 0.
    // for ax^2 + bx + c, f'(0) = b, f(0) = c. So c = 0, b = 5. We also
    // have f(1) = 1, so a + b + c = 1, a = -4. So the function is
    // -4x^2 + 5x.
    const rl = t.raidEffects.deltaPopulation / t.pop.n;
    const raidLossRatio = -4 * rl * rl + 5 * rl;
    return baseValue * (1 - raidLossRatio);
}

export function complexity(t: Tile): number {
    // culture
    // politics
    // population
    // production
    // consumption
    // trade
    // technology
    // military
    return 10;
}

export function freedom(t: Tile): number {
    // culture
    // politics
    // population
    // production
    // consumption
    // trade
    // technology
    // military
    return 2;
}