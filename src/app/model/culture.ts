import { randelem } from "./lib";
import { Bonuses, HolySite, ReligiousSite, ReligiousTrait, ReligiousTraits, Temple } from "./religion";
import { Tile } from "./tile";

export class CultureGroup {
    constructor(
        readonly name: string, 
        readonly typeName: string,
        readonly leisureValue: number,
        readonly freedom: number,
        readonly bonuses: Bonuses,
        readonly religiousSiteType: new (traits: ReligiousTrait[]) => ReligiousSite,
        readonly availableTraits: ReligiousTrait[]) {       
    }

    createCulture(tile: Tile): Culture {
        return new Culture(tile, this);
    }
}

export const CultureGroups = {
    Sumerian: new CultureGroup(
        'Sumerian', 
        'Traditional Agrarian Society', 0.25, 0.2,
        {
            raidIntensity: 1,
            raidCapture: 1,
            raidMobility: 1,
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
    Akkadian: new CultureGroup(
        'Akkadian',
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
}