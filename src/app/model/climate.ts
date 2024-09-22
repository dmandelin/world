// Rough steps:
// - set and visualize a random climate per tile, at first just output modifier
// - apply output modifier to output
// - eventually we'll need volatility and social effects, but we could
//   perhaps let most of those wait. Maybe we can get an initial volatility
//   model with mitigation by horizontal ties, then add in more effects as
//   people make choices that would activate them
//   - we can also have religious effects from ecology!
//     - delayed-return fewer-crops farming produces new anxieties, which
//       can motivate religious development
//     - higher volality means more to worry about
// - set and visualize a random volatility per tile

// Variable weather, flooding, and water works:
// - Weather/flooding:
//   - This could vary substantially year to year, but over 20 years the
//     variation in the total will be less.
//   - For the initial period, we'll start with moderate-high variability,
//     representing an overall favorable climate, but as-yet only partially
//     tamed rivers, perhaps a coefficient of variation of 0.3.
//   - With that level, we don't have to worry about major famines too much,
//     and we start with a clan organization, so clans will sometimes need
//     help from neighboring clans or priests, leading to shifts in power.
//   - Also, the amount of variability will reduce effective output, as
//     with higher variability people need more "insurance", which costs.
//   - CV over a 20-year turn is 0.067, so we'll see some fluctuations in
//     output but it probably won't be a huge deal.
//   - We'll want some similarities by location. We can start by generating
//     random weather in each tile and then averaging across neighbors. We
//     can do more averaging along each river, and also make the Euphrates
//     20% more productive on average.
//   - Actual dynamics for volatility:
//     - Effective output reduced by the CV => large incentive to reduce
//     - 0.1 * CV per turn become debtors, generating an elite of 0.1 per debtor.
//       Note that horizontal ties can avoid this. At first we might model
//       them as constant, but elites might weaken them.
//     - Granaries (owned by temple, elites, people, etc) can mitigate this
//       at the consumption level.
//     - Larger irrigation works can mitigate this at the production level.
// - Water works:
//   - There is some level of water infrastructure at the beginning, which
//     has arable land and volatility where they are. We also assume small-
//     scale works are built as needed to farm new land.
//   - Medium-scale works built by towns can further double the amount of
//     irrigable land.
//     - Exactly how this would be organized is unclear, but it seems this
//       didn't result in state formation, so apparently the tribal systems
//       were able to do this.
//     - This probably would result in some inequality as either people more
//       involved in planning could sway some things in their favor, or some
//       clans would simply be more able to take advantage of the new land.
//   - Medium-scale works also reduce variation by 1/3.

