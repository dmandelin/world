import { randelem } from "./lib";
import { Pop, Roles } from "./population";
import { Desert } from "./production";
import { HolySite, ReligiousSite, ReligiousTrait, ReligiousTraits, Temple } from "./religion";
import { Tile, TileModifiers, TileModifierValues } from "./tile";

export abstract class CultureGroup {
    constructor(
        readonly name: string, 
        readonly typeName: string,
        readonly baseSettlementSize: number,
        readonly baseSettlementName: string,
        readonly leisureValue: number,
        readonly freedom: number,
        readonly mods: TileModifierValues,
        readonly religiousSiteType: new (traits: ReligiousTrait[]) => ReligiousSite,
        readonly availableTraits: ReligiousTrait[]) {       
    }

    createCulture(tile: Tile): Culture {
        return new Culture(tile, this);
    }

    abstract initialPops(tile: Tile, n: number): Pop[];
}

class ProtoSumerian extends CultureGroup {
    constructor() {
        super(
            'Proto-Sumerian', 
            'Traditional Agrarian Society', 
            400, 'villages',
            0.25, 0.2,
            {
            },
            Temple,
            [
                ReligiousTraits.Fertility,
                ReligiousTraits.Trading,
                ReligiousTraits.Agrarian,
                ReligiousTraits.Peace,
                ReligiousTraits.War,
            ],
        );
    }

    override initialPops(tile: Tile, n: number): Pop[] {
        return [
            new Pop(Math.round(n * 0.01), tile, Roles.Priests),
            new Pop(Math.round(n * 0.99), tile, Roles.ClansPeople),
        ];
    }
}

class DesertNomad extends CultureGroup {
    constructor() {
        super(
            'Desert Nomad',
            'Traditional Pastoral Society', 
            40, 'camps',
            0.1, 0.5,
            {
                raidIntensity: 2,
                raidCapture: 2,
                raidMobility: 2,
            },
            HolySite,
            [
                ReligiousTraits.Fertility,
                ReligiousTraits.Trading,
                ReligiousTraits.Pastoral,
                ReligiousTraits.War,
            ],
        );
    }

    override initialPops(tile: Tile, n: number): Pop[] {
        return [new Pop(n, tile, Roles.ClansPeople)];        
    }
}

export const CultureGroups = {
    ProtoSumerian: new ProtoSumerian(),
    DesertNomad: new DesertNomad(),
};

export class Culture {
    constructor(readonly origin: Tile, readonly group: CultureGroup) {
    }

    createReligiousSite(): ReligiousSite {
        return new this.group.religiousSiteType([randelem(this.group.availableTraits)]);
    }

    refreshModifiers(tile: Tile) {
            for (const [modName, value] of Object.entries(this.group.mods)) {
                tile.mods[modName as keyof TileModifiers].apply(
                    this.group.name, value);
            }
    }

    get baseSettlementSize(): number {
        return this.group.baseSettlementSize;
    }

    get baseSettlementName(): string {
        return this.group.baseSettlementName;
    }

    initialPops(tile: Tile, n: number): Pop[] {
        return this.group.initialPops(tile, n);
    }
}