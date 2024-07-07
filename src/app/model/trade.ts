import {Tile} from './tile';
import {PerProduce, ProduceInfo} from './production';

// Transaction cost estimates from previous analysis:
//
// For transporting grain that draft animals or humans can eat,
// or any other good of similar value per wagonload, the total 
// transaction cost for a 1-tile trip (~15 mi) is:
//
// - porters: 0.2
// - pack animals: 0.1
// - wagons: 0.05
// - river: 0.01
// - sea: 0.002
//
// About half the cost is expenditures, half hazards. With more
// valuable goods, expenditures scale down, but hazards are
// constant or even increase due to easier theft.
//
// For "dairy", goats and sheep are being transported, and are
// cheap to transport over grazeable areas: 0.02 per tile.
//
// For, we're not modeling taxes or endpoint costs, because they're
// not important to single-tile trade. They could become important
// later.

// In the earliest period, we'll assume:
// - crude rafts along rivers, cost 0.02 per tile for cereals/legumes
//   - pack animals came into use circa 3500 BC
// - porters elsewhere, cost 0.2 per tile for cereals/legumes
// - cost 0.02 per tile for dairy
//   - situation is different per terrain in complicated ways so ignore for now

export class TradeLink {
    readonly cost: PerProduce = this.alongRiver
        ? PerProduce.of([['Barley', 0.02], ['Lentils', 0.02], ['Dairy', 0.02]])
        : PerProduce.of([['Barley', 0.2], ['Lentils', 0.2], ['Dairy', 0.02]]);

    srcAmounts: PerProduce = PerProduce.of();
    dstAmounts: PerProduce = PerProduce.of();

    constructor(readonly src: Tile, readonly dst: Tile, readonly alongRiver: boolean) {}

    other(t: Tile) {
        return t === this.src ? this.dst : this.src;
    }

    update() {
        console.log(`Trade links update for ${this.src.controller.name} to ${this.dst.controller.name}`);

        // Search for unit-for-unit trades that increase capacity on both sides.
        const sc = this.src.capacity;
        const dc = this.dst.capacity;

        const smc = this.src.marginalCapacity;
        const dmc = this.dst.marginalCapacity;

        for (const sg of ProduceInfo.all) { // Source good traded away
            for (const dg of ProduceInfo.all) {
                if (sg === dg) continue;

                const sgr = 1.0 - this.cost.get(sg);
                const dgr = 1.0 - this.cost.get(dg);

                const su = smc.get(dg) * dgr - smc.get(sg) * sgr;
                const du = dmc.get(sg) * sgr - dmc.get(dg) * dgr;
                let label = 'no benefit';
                switch (true) {
                    case su > 0 && du > 0:
                        label = '+++ mutual benefit';
                        break;
                    case su > 0 || du > 0:
                        label = '~~~ one-sided benefit, variable prices could enable';
                        break;
                }
                console.log(`Trade ${sg.name} for ${dg.name}: ${su.toFixed(3)}/${du.toFixed(3)} -> ${label}`);
            }
        }
    }
}