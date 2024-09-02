import {Injectable} from "@angular/core";
import {Brain, BasicBrain, DefensiveBrain, SubjectBrain} from "./agents/brains";
import {NAMED_DEFAULT_POLITIES, Polity} from "./polity";
import {Tile} from "./tile";
import {randelem, randint} from "./lib";
import { resolveRaids } from "./raiding";

// # Next refactorings:
// - Flow-type concept for things like production and consumption.
// - Stock-type concept for things like population and constructions.
// - Start updating UI components to use the new data structures rather
//   than redundantly representing calculations.

// Then on to:
// - Flooding and irrigation works
// - Variable climate per turn
// - Raiding defense bonus for towns
// - Trade in wool, fish, pottery, and flint
// - Citizen assemblies
// - Subpopulations: separate classes for elites, nomads, and urban specialists

// Motivation-driven plan:
// - Starting on turn 1, look for a tile where people would be motivated
//   to do something different from what the model does now, and then
//   add that ability to the model.
// - In the latest version, we sometimes see stressed tiles at the start
//   of the simulation. Maybe we can consider them to have just had a flood
//   or something. At any rate, they have problems to work on.
// - Developments we want to see in this time period:
//   - Economy
//     - Technological development
//     - Irrigation to increase arable land
//     - Pottery, wool, and jewelry production
//     - Long-distance trade
//   - Culture
//     - Temple elite and temple lands effects
//     - Temple influence into other tiles
//   - Politics
//     - Power actors and influence levels
//   - Top stuff to do is probably irrigation, pottery, and long-distance trade. 
//     - Irrigation:
//       - Main thing we need to figure out is how much it costs or how
//         fast they irrigate. We can do some trial and error there but
//         treat it as a construction project and aim for breakeven to
//         take 1-3 turns.
//     - Pottery:
//       - Effects:
//         - Substantial farm product output bonus
//         - Somehow helps hire specialists
//       - Costs: Need to research this more, but I think in the beginning, it
//         was expensive, but during this period a new pottery wheel was invented
//         that made it much cheaper.
//       - Production: Have to have the technology. May need to level up in
//         local skill. Potters can produce locally or for trade
//     - Long-distance trade:
//       - This included tools, but for now the most important parts are probably
//         for elite goods. We can start with gems and gold and maybe add other
//         luxury goods later.
//       - Effects: Some of these will actually be needed to establish chiefs
//         and/or priests. Or maybe prestige is simply much lower if they don't
//         have them.
//       - We can start modeling goods as trickling over by sequences of barter,
//         with very high transaction costs. We can give sufficiently presitigious
//         political actors the ability to send a trade mission further, such as
//         to off-map sites, to receive goods with lower transaction costs.
//
// - Problems and opportunities discovered:
//   * Stress should affect innovation rate.
//
//   * Add processing indicator now that turns take noticeable time.
//   * Analyze nutritional formula for desert tiles: sometimes results don't
//     make sense.
//   - Be consistent about allowing trade through tiles, or otherwise give
//     bottom corners some trade opportunities.
//   - Some tiles make advantageous trades, but are still left malnourished.
//     Give them more ways to get more resources:
//     - Trade over longer distances to get resources not available from
//       neighbors in large enough quantity.
//     - Irrigate more land to increase output.
//     - Raid neighbors for resources they refuse to trade, but note that
//       the neighbors may then stop trading or raid back.
//       - Part 1 would be regular raiding yielding some resources.
//       - Part 2 would be some sort of political development giving the
//         ability to do a bigger, more systematic raid.
//     - Fight neighbors for control of border lands.
//     - Trade for obsidian and flint to increase labor productivity.
//   - Visualize these on the map because they're needed to understand
//     what problems tiles are facing.
//     - rites
//     - raiding losses/gains
//     - population change?

// - Ideology/Culture
//     - Specialist labor and trade required to take full advantage of temple
// - Economy
// - Military
//   * Simple raiding model
//     * Capture produce, and/or trade goods
//     - Defensive works and patrols
//       - Specialist labor required to take full advantage
// - Politics
//   - Start with achievement-based societies
//     - Collective for agrarians, individualistic for pastoralists
//   - Define some sort of coordination bonuses that impact
//     each other power source
// - Environment
//   - Climate conditions that change over time and affect productivity.

// Top economic TODOs:
// - allocations
//   - experiment with land allocation and both allocation
//   - retune production functions based on above analysis
//   - apply to actual production
// - trade food for increased production
// - trade for obsidian for labor productivity and health bonuses
// - trade for lapis lazuli for culture bonuses
// - craft specialists: tools, cloth, pottery, jewelry

// - Future steps for trade:
//   - Consider markets, floating prices, diagonal trades
//   - Add plausible goods from the four sides of the map, e.g.,
//     obsidian/flint from the west, dairy from the north, lapis
//     lazuli from the east, and fish from the south.
//   - Allow longer-range trade and variable transaction costs
//   - Add effects on other aspects of society from each trade good.
//   - Add industries that create trade goods such as pottery and cloth.
//   - Model trade-driven urbanization and its ramifications.

@Injectable({providedIn: 'root'})
export class WorldViewModel {
    constructor(readonly world: World) {}

    selectedTile_: Tile|undefined;

    get selectedTile() { 
        return this.selectedTile_; 
    }

    set selectedTile(value: Tile|undefined) { 
        this.selectedTile_ = value; 
        this.world.notifyWatchers();
    }
}

@Injectable({providedIn: 'root'})
export class World {
    private yearOrigin_ = -5000;
    private year_ = 0;
    private polities_ = NAMED_DEFAULT_POLITIES.map((pd, i) => 
        new Polity(this, pd.name, pd.mapColor, randelem(World.BRAINS)));
    
    readonly map = new WorldMap(this, 5, 5, this.polities);

    readonly log = new WorldLog();

    lastAttacks = new Set<[Polity, Polity]>();

    private watchers_: Set<Function> = new Set<Function>();
    private locallyControlledPolities = new Set<string>(['E']);

    constructor() {
        // Initialize trade links.
        for (const t of this.map.tiles.flat()) {
            t.market.initialize();
        }
        for (const t of this.map.tiles.flat()) {
            t.market.update();
        }

        this.recordRanks();

        this.forTiles(t => t.updateTimeSeries());
    }

    isLocallyControlled(p: Polity) {
        return this.locallyControlledPolities.has(p.name);
    }

    clearLocalControl() {
        this.locallyControlledPolities.clear();
    }

    recordRanks() {
        let i = 1;
        for (const polity of this.getRankedPolities()) {
            polity.historicalRanks.push([this.year, i++]);
        }
    }

    static BRAINS = [
        new BasicBrain('A', 1.0),
        new SubjectBrain('S', 0.66, 0.5),
        new BasicBrain('N', 0.5, 0.4),
        new DefensiveBrain('D', 0.33),
        new DefensiveBrain('P', 0.2),
        new SubjectBrain('U', 0.0),
    ];

    addWatcher(w: Function) {
        this.watchers_.add(w);
        return w;
    }

    removeWatcher(w: Function|undefined) {
        if (w) this.watchers_.delete(w);
    }

    setBrains(brains: readonly Brain[]) {
        for (let i = 0; i < brains.length; ++i) {
            this.polities_[i].setBrain(brains[i]);
        }
    }

    get year() { return this.year_; }
    get yearForDisplay() { return this.yearDisplay(this.year); }
    yearDisplay(yearFromOrigin: number) {
        const year = yearFromOrigin + this.yearOrigin_;
        return year < 0 ? `${-year} BC` : `${year + 1} AD`;
    }

    get polities() { return this.polities_; }
    private set polities(value: Polity[]) { this.polities_ = value; }

    get capacity() {
        return this.map.tiles.flat().map(t => t.capacity).reduce((a, b) => a + b);
    }

    get population() {
        return this.map.tiles.flat().map(t => t.population).reduce((a, b) => a + b);
    }

    advance() {
        this.advanceTurn();
    }
    
    advanceTurn() {
        this.log.turnlogClear();

        this.forTiles(t => t.optimizeAllocations());
        this.forTiles(t => t.market.update());

        // Raiding.
        resolveRaids(this);

        // Construction.
        this.forTiles(t => t.applyConstruction());

        // Technology invention and adoption.
        const snapshot = new Map(this.map.tiles.flat().map(t => [t, t.techKit.asMap]));
        this.forTiles(t => t.adoptNeighborTechs(snapshot));
        this.forTiles(t => t.advanceTechKit());

        // Population.
        this.forTiles(t => t.updatePopulation());

        this.year_ += 20;
        this.recordRanks();

        // Time series recording.
        this.forTiles(t => t.updateTimeSeries());

        this.log.turnlog(`The year is now ${this.year}`);
        this.notifyWatchers();
    }

    notifyWatchers() {
        if (this.watchers_ === undefined) return;
        for (const w of this.watchers_) {
            w();
        }
    }

    startTurnFor(p: Polity) {
        p.attacked.clear();
        p.defended.clear();
    }

    vassalize(attacker: Polity, defender: Polity) {
        // Defender is removed from any existing suzerain.
        if (defender.suzerain) {
            defender.suzerain.vassals.delete(defender);
            const formerSuzerain = defender.suzerain;
            defender.suzerain = undefined;
            this.releaseDisconnectedVassals(formerSuzerain);
        }


        // Vassals of the defender are released.
        for (const v of defender.vassals) {
            v.suzerain = undefined;
        }
        defender.vassals.clear();

        // The new vassal relationship.
        defender.suzerain = attacker;
        attacker.vassals.add(defender);
    }

    devassalize(suzerain: Polity, vassal: Polity) {
        suzerain.vassals.delete(vassal);
        vassal.suzerain = undefined;
        this.releaseDisconnectedVassals(suzerain);
    }

    releaseDisconnectedVassals(p: Polity) {
        const connectedVassals = new Set<Polity>();
        const done = new Set<Tile>();
        const work: Tile[] = [];
        for (const t of this.map.tiles.flat()) {
            if (t.controller === p) {
                work.push(t);
            }
        }
        while (work.length) {
            const t = work.pop();
            done.add(t!);
            for (const n of this.neighoringTiles(t!)) {
                if (done.has(n)) continue;
                if (n.controller != p && n.controller.suzerain != p) continue;
                work.push(n);
                if (n.controller != p) {
                    connectedVassals.add(n.controller);
                }
            }
        }
        const oldVassals = p.vassals;
        p.vassals = new Set<Polity>([...p.vassals].filter(v => connectedVassals.has(v)));
        for (const v of oldVassals) {
            if (!p.vassals.has(v)) {
                v.suzerain = undefined;
            }
        }
    }

    foughtThisTurn(a: Polity, b: Polity): boolean {
        return a.attacked.has(b) || b.attacked.has(a);
    }

    neighoringTiles(tile: Tile): Tile[] {
        const ts = this.map.tiles;
        const ns = [];
        if (tile.i > 0) ns.push(ts[tile.i-1][tile.j]);
        if (tile.i < this.map.height - 1) ns.push(ts[tile.i+1][tile.j]);
        if (tile.j > 0) ns.push(ts[tile.i][tile.j-1]);
        if (tile.j < this.map.width - 1) ns.push(ts[tile.i][tile.j+1]);
        return ns;
    }

    getRankedPolities(): Polity[] {
        return [...this.polities].sort((a, b) => {
            const popDiff = b.vassalPopulation - a.vassalPopulation;
            if (popDiff) return popDiff;
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        })
    }

    forTiles(f: (t: Tile) => any) {
        for (const t of this.map.tiles.flat()) {
            f(t);
        }
    }
}

export class WorldLog {
    readonly turnlogs: string[] = [];

    turnlog(s: string) {
        this.turnlogs.push(s);
    }

    turnlogClear() {
        this.turnlogs.length = 0;
    }
}

class WorldMap {
    tiles: Tile[][];
  
    constructor(world: World, public readonly width: number, public readonly height: number, polities: ReadonlyArray<Polity>) {
        const jCenter = Math.floor((width - 1)/2);

        // Initialize tiles.
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                const polity = polities[i * width + j];
                
                const isRiver = 
                       i < height - 1 && Math.abs(j - jCenter) == 1 
                    || i == height - 1 && j == jCenter;

                
                const wetFraction = 0.01 * (isRiver
                    ? 5 + randint(5) + randint(5)
                    : 0)
                const dryLightSoilFraction = isRiver
                    ? Math.random() * (1 - wetFraction)
                    : Math.random() * 0.1;
                const capacityRatio = Math.random() * 0.3 + 0.5;
                this.tiles[i][j] = new Tile(world, i, j, polity, isRiver, wetFraction, dryLightSoilFraction, capacityRatio);
            }
        }
    }
}
