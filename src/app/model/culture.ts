import { randelem } from "./lib";
import { HolySite, ReligiousSite, ReligiousTrait, ReligiousTraits, Temple } from "./religion";
import { Tile } from "./tile";

export class CultureGroup {
    constructor(
        readonly name: string, 
        readonly typeName: string,
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
        'Traditional Agrarian Society',
        Temple,
        [
            ReligiousTraits.Fertility,
            ReligiousTraits.Trading,
            ReligiousTraits.Agrarian,
        ],
    ),
    Akkadian: new CultureGroup(
        'Akkadian',
        'Traditional Pastoral Society',
        HolySite,
        [
            ReligiousTraits.Fertility,
            ReligiousTraits.Trading,
            ReligiousTraits.Pastoral,
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