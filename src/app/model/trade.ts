import {Tile} from './tile';
import {PerProduce, Product, Products, marginalCapacity} from './production';

// * Barter with Variable Pricing
//
// Each party has a marginal utility for the two goods they're
// considering trading (or trading more of). Thus, there is min/max
// ratio of goods (which is effectively a price) at which each
// party is willing to trade. That defines an interval of possible
// prices (which may be empty).
//
// If the interval is nonempty, we'll need to choose a price within
// that range. At first, we could use some sort of average (probably
// geometric mean since these are ratios). Later, we could add
// trading advantages from coordination, skill, information technology,
// and so on that would tilt prices in one party's favor.
//
// Other things to do when adding variable pricing:
// - Might want to highlight maximum and minimum prices on the map
//   for different trade pairs, or the world info panel.
// - Graph at least total trade.

// * Transaction Costs
//
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

// Trade-oriented religions should decrease transaction costs, but
// they won't affect transportation costs, so we'll need some notion
// of which costs they affect. We'll put in a "cost of doing business"
// that starts at something like 10%, accounting for various kinds of
// crime and friction that can be reduced by religious activity.

// A transfer of any amount of one product from one tile to another.
export class Transfer {
    // Barters are represented by bidirectionally linking paired transfers.
    inExchangeFor: Transfer | undefined;

    constructor(readonly link: TradeLinkDirection, readonly product: Product, public amount: number) {}

    get src() { return this.link.src; }
    get dst() { return this.link.dst; }

    get costFactor() { return 1.0 - this.link.cost(this.product); }
    get gross() { return this.amount; }
    get net() { return this.amount * this.costFactor; }
}

// The trade economy of a tile. This isn't necessarily a market pe se.
export class Market {
    readonly links: TradeLinkDirection[] = [];
    message: string = '';

    constructor(readonly tile: Tile) {}

    initialize() {
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const [ni, nj] = [this.tile.i + dx, this.tile.j + dy];
            if (ni >= 0 && ni < this.tile.world.map.height && nj >= 0 && nj < this.tile.world.map.width) {
                const neighbor = this.tile.world.map.tiles[ni][nj];
                const tradeLink = new TradeLink([this.tile, neighbor]);
                const sendLink = new TradeLinkDirection(this.tile, neighbor, tradeLink);
                const recvLink = new TradeLinkDirection(neighbor, this.tile, tradeLink);
                sendLink.reverse = recvLink;
                recvLink.reverse = sendLink;
                this.links.push(sendLink);
                neighbor.market.links.push(recvLink);
            }
        }
    }

    update() {
        // Seek beneficial trades, but spread out the trade across different
        // links, because people will want to spread out risks.

        // At first, trade will be consumption-driven: the people of a tile
        // will seek to trade for goods with the highest marginal utility.
        // Trade partners themselves will also want to get what has the highest
        // marginal utility to them among what's available.

        // Reset and recalculate from scratch each time.
        this.message = '';
        this.links.forEach(l => l.clear());

        // Amount had of each good, updated as trades are made.
        const amounts = this.tile.production.Total;
        const neighborAmounts = new Map(this.links.map(l => [l, l.dst.production.Total]));

        // Links we think there are no more trades available on.
        const doneLinks = new Set<TradeLinkDirection>();

        // Do a maximum number of iterations.
        for (let i = 0; i < 1000; ++i) {
            // Spread trade around the different links rather than arbitrarily
            // concentrating on the first trade link we consider.
            for (const l of this.links) {
                let marginalUtility = marginalCapacity(amounts);
                const recvProduct = marginalUtility.max()[0];
                // TODO - Try a different product if the neighbor is out of the first choice.
                //        Same for below.
                if (neighborAmounts.get(l)!.get(recvProduct) === 0) continue;

                let neighborMarginalUtility = marginalCapacity(neighborAmounts.get(l)!);
                const sendProduct = neighborMarginalUtility.max()[0];
                if (amounts.get(sendProduct) === 0) continue;
                if (recvProduct === sendProduct) continue;

                // Compute minium exchange ratio we'll accept and maximum they'll accept.
                // Exchange ratio is (what they give) / (what we give).
                const minRatio = 
                       marginalUtility.get(sendProduct)
                    / (marginalUtility.get(recvProduct) * (1 - l.cost(recvProduct)));
                const maxRatio = 
                      (neighborMarginalUtility.get(sendProduct) * (1 - l.cost(sendProduct)))
                    /  neighborMarginalUtility.get(recvProduct);

                if (minRatio <= maxRatio) {
                    const ratio = Math.sqrt(minRatio * maxRatio);
                    if (ratio === 0) debugger;

                    // Update the trade link.
                    l.incrExchange(sendProduct, 1, recvProduct, ratio);
                    // Mark goods as traded away.
                    amounts.incr([sendProduct, -1]);
                    amounts.incr([recvProduct, ratio]);
                    neighborAmounts.get(l)!.incr([recvProduct, -ratio]);
                    neighborAmounts.get(l)!.incr([sendProduct, 1]);
                }
            }
        }
    }
}

export class TradeLink {
    message = '';

    readonly transportCost: PerProduce = this.alongRiver
        ? PerProduce.of([['Barley', 0.02], ['Lentils', 0.02], ['Dairy', 0.02]])
        : PerProduce.of([['Barley', 0.2], ['Lentils', 0.2], ['Dairy', 0.02]]);

    constructor(readonly endpoints: [Tile, Tile]) {}

    get alongRiver() { return this.endpoints[0].isRiver && this.endpoints[1].isRiver; }

    get baseCoordinationCost() {
        return 0.1;
    }
    
    get coordinationCost() {
        // TODO - make coordination cost improvements more effective if both points have them.
        return 0.05 * this.endpoints[0].bonus('transactionCostFactor')
             + 0.05 * this.endpoints[1].bonus('transactionCostFactor');
    }

    cost(product: Product) {
        return this.transportCost.get(product) + this.coordinationCost;
    }

    get costs() {
        return this.transportCost.map((p, c) => c + this.coordinationCost);
    }
}

export class TradeLinkDirection {
    reverse!: TradeLinkDirection;
    transfers: Transfer[] = [];

    constructor(readonly src: Tile, readonly dst: Tile, readonly link: TradeLink) {}

    get alongRiver() { return this.link.alongRiver; }

    transportCost(product: Product) { return this.link.transportCost.get(product); }
    get coordinationCost() { return this.link.coordinationCost; }
    cost(product: Product) { return this.link.cost(product); }
    get costs() { return this.link.costs; }

    get isActive() { return this.transfers.length > 0; }

    get exchanges(): [Transfer, Transfer][]{
        return this.transfers.map(t => [t, t.inExchangeFor!]);
    }

    get message() { return this.link.message; }
    set message(m: string) { this.link.message = m; }

    findExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product): Transfer | undefined {
        return this.transfers.find(t =>
            t.dst == dst && t.product === srcProduct &&
            t.inExchangeFor?.dst === src && t.inExchangeFor?.product === dstProduct);
    }

    findOrCreateExchange(src: Tile, srcProduct: Product, dst: Tile, dstProduct: Product): Transfer {
        let transfer = this.findExchange(src, srcProduct, dst, dstProduct);
        if (!transfer) {
            const send = new Transfer(this, srcProduct, 0);
            const recv = new Transfer(this.reverse, dstProduct, 0);
            send.inExchangeFor = recv;
            recv.inExchangeFor = send;

            this.transfers.push(send);
            this.reverse.transfers.push(recv);

            transfer = send;
        }
        return transfer;
    }

    incrExchange(srcProduct: Product,  srcAmount: number, dstProduct: Product,dstAmount: number) {
        const send = this.findOrCreateExchange(this.src, srcProduct, this.dst, dstProduct);
        send.amount += srcAmount;
        send.inExchangeFor!.amount += dstAmount;
    }

    clear() {
        this.transfers = [];
        this.reverse.transfers = this.reverse.transfers.filter(t => t.dst !== this.src); 
        this.message = '';}
}