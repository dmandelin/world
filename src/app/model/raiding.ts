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

import { PerProduce } from "./production";
import { Tile } from "./tile";
import { World } from "./world";

export class RaidEffects {
    deltaPopulation = 0;
    deltaOutput = PerProduce.of();
}

export function resolveRaids(world: World) {
    world.forTiles(t => t.raidEffects = new RaidEffects())
    world.forTiles(t => resolveTileRaids(t));
}

function resolveTileRaids(t: Tile) {
    const raiders = Math.floor(t.population / 5);
    for (const v of [t, ...t.neighbors]) {
        const popEffect = Math.floor(ces(raiders, v.population) 
            * (0.75 + 0.5 * Math.random()));
        v.raidEffects.deltaPopulation -= popEffect;
        t.raidEffects.deltaPopulation += Math.floor(0.1 * popEffect);
        // TODO - production/goods effects;
    }
}

function ces(raiders: number, targets: number): number {
    if (raiders === 0 || targets === 0) return 0;
    return 1 / (5 / raiders + 25 / targets);
}