import { randelem } from "./lib";
import { HolySite, ReligiousSite, ReligiousTrait, ReligiousTraits, Temple } from "./religion";
import { Tile, TileModifiers, TileModifierValues } from "./tile";

export class CultureGroup {
    constructor(
        readonly name: string, 
        readonly typeName: string,
        readonly leisureValue: number,
        readonly freedom: number,
        readonly mods: TileModifierValues,
        readonly religiousSiteType: new (traits: ReligiousTrait[]) => ReligiousSite,
        readonly availableTraits: ReligiousTrait[]) {       
    }

    createCulture(tile: Tile): Culture {
        return new Culture(tile, this);
    }
}

export const CultureGroups = {
    ProtoSumerian: new CultureGroup(
        'Proto-Sumerian', 
        'Traditional Agrarian Society', 0.25, 0.2,
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
    ),
    DesertNomad: new CultureGroup(
        'Desert Nomad',
        'Traditional Pastoral Society', 0.1, 0.5,
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
    ),
}

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
}