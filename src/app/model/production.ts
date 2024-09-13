export class Product {
    constructor(
        readonly name: 'Barley'|'Lentils'|'Dairy'|'Temple',
    ) {}

    static fromName(name: string): Product {
        switch (name) {
            case 'Barley': return Barley;
            case 'Lentils': return Lentils;
            case 'Dairy': return Dairy;
            case 'Temple': return TempleConstruction;
            default: throw `Unknown product ${name}`;
        }
    }
}

export const Barley = new Product('Barley');
export const Lentils = new Product('Lentils');
export const Dairy = new Product('Dairy');
export const TempleConstruction = new Product('Temple');
export const Products = [Barley, Lentils, Dairy, TempleConstruction];

export class Terrain {
    constructor(
        readonly name: 'Alluvium'|'DryLightSoil'|'Desert'|'Building',
    ) {}
}

export const Alluvium = new Terrain('Alluvium');
export const DryLightSoil = new Terrain('DryLightSoil');
export const Desert = new Terrain('Desert');
export const BuildingPlot = new Terrain('Building');

export const AllTerrainTypes = [Alluvium, DryLightSoil, Desert];
