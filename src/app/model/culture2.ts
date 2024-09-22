export class CulturalTrait {
    constructor(readonly name: string, readonly description: string) {
    }
}

export class Myth extends CulturalTrait {
}

export const Myths = {
    // Universal
    Ancestors: new Myth(
        'Ancestors',
        'Our ancestors watch over us and guide us.'),
    // Horticultural
    EarthMother: new Myth(
        'Earth Mother',
        'The Earth Mother and her daughters provide for us and must be respected.'),
    AncestralLand: new Myth(
        'Ancestral Land',
        'The land is our sacred trust because our ancestors are buried here.'),
    Seasons: new Myth(
        'Seasons',
        'There is a time to sow, and a time to harvest.'),
    // Pastoral
    AnimalSpirits: new Myth(
        'Animal Spirits',
        'The world is full of spirits, some of which are helpful, some of which are dangerous.'),
    Sky: new Myth(
        'Sky',
        'The sky sits above all and sends nourishing run and rain but also storms.'),
    Migration: new Myth(
        'Migration',
        'We survived a long migration from elsewhere as a people.'),
};

export class Rite extends CulturalTrait {
}

export const Rites = {
    // Universal
    Everyday: new Rite(
        'Everyday Rites',
        'We perform the proper rites for the spirits in everything we do.'),
    LifeTransitions: new Rite(
        'Life Transitions',
        'We mark the important transitions of life such as marriage, birth, and death.'),
    AncestorVeneration: new Rite(
        'Ancestor Veneration',
        'We honor our ancestors with offerings and prayers.'),
    // Horticultural
    HarvestFestival: new Rite(
        'Harvest Festival',
        'We celebrate the harvest with feasting and games.'),
    FertilityRite: new Rite(
        'Fertility Rites',
        'We perform a rite to ensure the fertility of our fields and our people.'),
    // Pastoral
    AnimalSacrifice: new Rite(
        'Animal Sacrifice',
        'We solemnly sacrifice animals to the spirits.'),
    Transhumance: new Rite(
        'Migration Rites',
        'We perform rites to ensure the safety of our herds during migration.'),
};

// Components to model:
// - Myths: Stories and ideas. These can shape identity and interpretations.
//   These can also encode ideas about how the world works, or
//   political and social ideals.
// - Rituals
// - These *don't* have to be grouped as a specific "religion" at first.
//   Specific clusters and identities might evolve via an area getting
//   more of a common culture, and a culture distinct from neighbors.
// - And thus, we must have differences at the beginning. Our simple
//   farmers vs herders could work for now, but it probably gets more
//   interesting if we add other regions.
// - What are the myths and rituals attached to? Tiles? People?
//   Tiles might be simpler to display at first, but I think we
//   had better go people, because eventually we'll need it to work
//   that way.
// - It's not clear that either myths or rituals are "primary": we should
//   probably put them on an equal footing.
// - It seems OK to group these two under a "culture" property. Other
//   things such as language, consumption habits, and ecological 
//   patterns could go there.

// More on religion from Atran:
// - Religion is not an evolutionary adaptation. This was argued
//   extensively using different models. Also, I found this the
//   evolutionary story initially appealing, but I couldn't imagine
//   dynamics that would actually make it happen. For one, although
//   there were different conquest events and cultural assimilations
//   in history, I'm really not aware of any natural laboratory
//   where we can see Darwinian-type processes among societies.
//   Rather, it's a much more complicated process involving also
//   imitation, blending, and choice.
// - What does promote religious belief and commitment:
//   - Inexplicable stuff
//   - Anxieties practical and existential
//   - Cultural transmission, emphasizing songs, stories with
//     just enough incongruous elements to stand out, and linkages
//     among practices
//   - Costly rituals, which especially help form community
//     membership and higher expectations of cooperation
// - Note spectrum of doctrinal vs enactive
// - Note schisms and reformations
// - Once it exists, religion can have effects on other aspects of
//   society and development:
//   + individual peace of mind and well-being
//   + solidarity
//   + peace
//   + morale in conflicts
//   + donations and public goods
//   + trustworthy trade
//   + emotions: can be many: fear, hope, awe
//   + cultural development
//   + intellectual development
// - This could all get increasingly complicated, adding and subtracting
//   different practices and beliefs, and allowing for both altruistic
//   and exploitative behavior.

// Modeling family/clan/tribe rituals:
// - For now, we can lump these together as 'clan rituals'.
// - Have a % of basic clan output converted to 'clan rituals'.
// - Clan rituals should produce benefits at that level, i.e., to
//   primary production and reproduction.
// - Clan rituals *increase* raiding, especially within-tile raiding,
//   because they generate tight solidarity at a level much smaller
//   than a tile, thus more conflict within a tile.
// - Eventually, they'll need to compete with rituals of broader
//   scopes, but that's enough for now.
// - Private trade probably would enhance the effectiveness.

// Modeling multiple religious activities:
// - We could think about starting with just clan rites, but temples
//   start being built at the beginning of the simulation, so we'll
//   need both.
// - The code might be somewhat independent at first, but we'll want
//   to be able to display them together on a panel.