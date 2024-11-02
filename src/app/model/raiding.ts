// Analysis
//
// Before we have political systems, we'll assume that raiding happens
// automatically by each tile on itself and on its neighbors.
//
// - Total losses target
//   - Losses due to warfare per turn were 0-60%, averaging 15%, for 
//     prehistoric societies.
//   - Early Ubaid may have been relatively peaceful, so we could have
//     below average losses at the start.
//
// - General effects of one turn of raiding by one tile on another (or itself)
//   - For two tiles of equal population and same type:
//     - Target tile:
//       - population loss of 2%
//       - output loss of 2%
//     - Source tile:
//       - population gain of 0.2%
//       - output gain of 0.2%
//   - Pastoralists are significantly better raiders:
//       - they do more raiding: 2x or so more effect
//       - they gain double relative to target tile losses
//   - Rituals
//       - war: 1.5x as much raiding
//       - peace: if two neighbors both have peace rituals, half as much raiding
//   - Tiles of unequal population:
//       - Smaller tile raiding larger:
//         - Should be somewhat more profitable as they can look for best opportunities
//       - Larger tile raiding smaller:
//         - Could have significantly more effect

import { assert } from "./lib";
import { ReligiousTraits } from "./religion";
import { Tile } from "./tile";
import { World } from "./world";

export class TileRaidActivity {
    constructor(readonly tile: Tile) {}

    readonly outgoing: Map<Tile, TileRaidResult> = new Map();
    readonly incoming: Map<Tile, TileRaidResult> = new Map();

    reset() {
        this.outgoing.clear();
        this.incoming.clear();
    }

    addOutgoing(raid: TileRaidResult) {
        assert(raid.raider === this.tile);
        this.outgoing.set(raid.victim, raid);
        raid.victim.raids.incoming.set(raid.raider, raid);
    }

    get deltaPopulation(): number {
        let delta = 0;
        for (const rr of this.outgoing.values()) {
            delta += rr.props.raiderPopGain + rr.props.raiderPopLoss;
        }
        for (const rr of this.incoming.values()) {
            delta += rr.props.victimPopLoss;
        }
        return delta;
    }
}

type TileRaidResultProperties = {
    // All changes are in deltas applied to the subject.
    raiderPopGain: number;
    raiderPopLoss: number;
    victimPopLoss: number;
}

export class TileRaidResult {
    constructor(
        readonly raider: Tile, 
        readonly victim: Tile,
        readonly props: TileRaidResultProperties,
        ) {
            assert(Number.isInteger(props.raiderPopGain));
            assert(Number.isInteger(props.raiderPopLoss));
            assert(Number.isInteger(props.victimPopLoss));

            assert(props.raiderPopGain >= 0);
            assert(props.raiderPopLoss <= 0);
            assert(props.victimPopLoss <= 0);
    }
}

export function resolveRaids(world: World) {
    world.forTiles(t => t.raids.reset())
    world.forTiles(t => resolveTileRaids(t));
}

function resolveTileRaids(t: Tile) {
    const raiders = Math.floor(t.population / 5);
    for (const v of [t, ...t.neighbors]) {
        const baseVictimPopEffect = ces(raiders, v.population)
            * (0.75 + 0.5 * Math.random())
            * t.mods.raidIntensity.value
            * t.controller.raidIntensityFactor(v.controller)
            * raidIntensityFactorFromPeace(t, v);
        const baseRaiderPopLoss = baseVictimPopEffect * 0.1;

        const victimPopEffect = baseVictimPopEffect
            * raidEffectFactor(t, v);
        const raiderPopGain = victimPopEffect * 0.2 * t.mods.raidCapture.value;
        const raiderPopLoss = baseRaiderPopLoss;

        const result = new TileRaidResult(t, v, {
            raiderPopGain: Math.round(raiderPopGain),
            raiderPopLoss: Math.round(-raiderPopLoss),
            victimPopLoss: Math.round(-victimPopEffect),
        });

        t.raids.addOutgoing(result);
        // TODO - production/goods effects;
    }
}

function ces(raiders: number, targets: number): number {
    if (raiders === 0 || targets === 0) return 0;
    return 1 / (10 / raiders + 50 / targets);
}

function raidEffectFactor(t: Tile, v: Tile) {
    const [tm, vm] = [t.mods.raidMobility, v.mods.raidMobility];
    switch (true) {
        case tm > vm:
            return 1.5;
        case tm < vm:
            return 0.25;
        default:
            return 1;
    }
}

function raidIntensityFactorFromPeace(t: Tile, v: Tile) {
    if (t.religiousSite.traits.includes(ReligiousTraits.Peace) &&
        v.religiousSite.traits.includes(ReligiousTraits.Peace)) {
        return 0.25;
    }

    if (t.religiousSite.traits.includes(ReligiousTraits.Peace) &&
        !v.religiousSite.traits.includes(ReligiousTraits.War)) {
        return 0.5;
    }

    if (v.religiousSite.traits.includes(ReligiousTraits.Peace) &&
        !t.religiousSite.traits.includes(ReligiousTraits.War)) {
        return 0.75;
    }

    return 1;
}