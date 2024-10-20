It's been easy to get hung up on which thing to do first, etc,
with the simulation and its goals being so complicated, and
the cultural and political layers being very tricky to design
in the first place. It may help to start making decisions
faster, with more of a tendency to build something vaguely
plausible and fix up later. However, that's not entirely unclear
as building up a bunch of code for some random thing that doesn't
fit well with the rest isn't necessarily progress.

One of the principles is that things tend to dovetail, so that
development in various social aspects tends to promote changes
in the others, and development in one region promotes changes in
others. This means we'll generally want to build basic dynamics
for each aspect first, and then let them interact and complicate
over time.

We can also look at the obvious missing features compared to
related designs:
- Religion systems are often quite simple, maybe simpler than
  what we already have.
- Ideology is either a government-type item from a list, or a
  set of laws and institutions that can be changed by various
  power players and factions. This I've been writing about,
  but don't really have yet, except in seed listing form.
- Politics can be a very complicated agent-based model in some
  cases. There may be various individuals and factions. This
  I also don't have yet.

Another angle: what feels missing? At present, people don't have
a way to impress each other. They can grow food and population,
but they just do that in place when we know there is much more
going on. So we need temples and luxury goods. Chronologically
a few luxury goods probably came first. The other one is, settlements
don't grow, they stay as all villages. They also do that in a
very artificial way, just redistributing population. Perhaps we
should have them initially split when they get beyond a certain
size, then allow certain factors to allow them to grow more.
Finally, we don't have any real politics at all, where probably
both internal and external politics have real importance.

OK, now we have 3 main things to build up on right now:
- settlements
- status
- politics

For settlements, at some point we may need a more abstract description,
but for now let's assume we need to get more granular than we have
been. Each settlement should be its own object with its own population.
At the beginning, when size is greater than a threshold, the village
starts having a change to send out a new village. Although settlements
have been described as "roughly equal population", we can in fact imagine
that there might have been various smaller hamlets, etc. for sizes
between 50-500. Later we'll add factors that allow population to grow
further, but we don't need that right away.

More on population dynamics from "Zipf's law for cities: an explanation",
by Xavier Gabaix:
- Apparently we can reach Zipf's law if we have settlements with these
  properties:
  - Exponential growth with nonzero variance in the growth rate
  - Growth rate distribution is independent of size
    - Since cities generally have more artificial amenities, apparently
      we really can only explain this if there's an inherent disamenity
      to scale! This would also help explain why growth is more in
      number of settlements than size at first.
    - We can also have splitting, and interestingly, if splitting is
      slower than growth, then growth will dominate and we'll see a
      Zipf distribution. But if splitting is faster than growth, which
      perhaps it could be early on, then sizes may stay more similar.
  - Minimum settlement size. Obviously satisfied by N = 1, but in practice
    we can probably set a floor of 50-500 depending on region for how
    people apparently chose to live.
- So, apparently we'd almost pretty much be there: we could make things
  work per settlement and see if the distributions behave how we want.
  - Also note that the analysis shows that the *average* city size
    ratios follow rank ratios, but the standard deviation in that is
    high. So, it's quite common to find that both #2 and #3 are about
    the same size.
    - It's also normal for the capital to be bigger than expected because
      of its unique political significance. I think it also makes sense
      to allow for other special somewhat inherent amenities: my intuition
      is that those would still more or less satisfy the assumptions.
    - Apparently there's also a phenomenon where smaller cities have a
      somewhat higher variance in their growth rate due to less diversified
      resource base, but we could completely ignore this and not be that
      far off.
  - But we do need some differences in the growth model. And according
    to this paper, urban growth was historically mostly due to migration.
    That also makes sense in the light of the common idea of cities as
    "population sinks".

From "Urban Scaling Laws" by Ribeiro and Netto:
- GDP goes with about the 1.1 power in some examples
- Scaling exponents have certain distributions for certain kinds of
  things:
  - Individual needs (housing, job, water): generally close to linear
    (a bit more spread on the high side up to 1.2 or so).
  - Infrastructure: around 0.85 (range 0.5-1.2): need less per person
    as city grows.
    - Sublinear scaling depends on being able to "fill space". If that
      isn't happening, scaling may be superlinear. Causes include providing
      the infrastructure to only a few people, or regulatory processes
      that block building out common infrastructure.
    - Apparently the causes of this aren't that well understood.
  - Social variables: economic output, infection: around 1.15 (range
    1.0-1.3). 
    - Here it's agreed that the larger frequency of interactions drives
      this.

For status, we already do have the concept of "eminent families" in
the model, but they aren't actually any different from anyone else.
- Let's give them a wealth bonus to represent a combination of having
  better land (often from arriving first), more skill, and working
  more. 
  - At first, that could be 2x.
  - If their population grows faster than others, eventually they
    might be too many people to realistically have such advantages,
    so we'll have to dial down the advantages of elite status as
    numbers go up, make some downwardly mobile, or both.
- Let's give them a small bonus to prestige or status based on their
  wealth, and allow them avenues to gain more:
  - Gain status by broad gifts.
  - Convert people into dependents, who are then supported by them
    and work for them at various tasks. Initially that could be just
    as wage workers: people paid somewhat less than average clan income.
  - Scaling up: as they gain more members and dependents, they can 
    unlock new technologies and productive possibilities.
  - Purchase display goods, e.g., fine pottery and jewelry
    - The fine pottery implies potters: here we'll need a specialist
      class. It presumably requires some elevated wage/support to
      get people to take the risk of becoming full-time specialists.
    - Jewelry could start as a straight trade good.
  - Build temples.

  What about the regular clanspeople? Can they rise in status, or check
  elites?
  - For now we probably don't need to get into this that much. There
    presumably will be some inertia to elite-led change. If we run into
    situations where we lose the elite, we'll need ways to re-promote them.
  - We should probably give them choices about leisure and donations.
    First thing to add is probably having them take leisure when they've
    produced enough, but allow elites to organize them for greater
    production, which has both benefits and downsides.

For politics, it seems we need things for people to disagree about, and
perhaps also to agree about in ways that before, they could not.
- It's not clear yet whether to model villages as agents or abstract away
  conflicts within a tile. Early on, I think they could be agents, but
  eventually they'll become very numerous and it would get confusing.
- Let's bring back the concept of "at peace" vs "at war"
  - A tile can be at peace or at war internally, as well as vs nearby
    tiles.
  - At war => higher raiding, less trade, less production
  - Should bring in some resource gains from war since we're adding a
    new disadvantage to it
  - Consider that over a 20-year period it's not necessarily all peace
    or all war. Early model could be between 20% war and 50% war, add
    more grades later.
  - At first, who's at peace or war could be pretty random, but later
    on we can add more complicated behavior.
- It's not that clear what to do for internal politics, as we don't have
  that much internal structure yet. Apparently politics wasn't that separated
  from religion, so maybe things around labor vs leisure and donations
  will be all we need at first.

And some bug fixes we'll need:
- Natural increase display on front page doesn't work.

The list:
- Fix natural increase display bug
- Make settlements grow internally and split; show # settlements on graph
- War vs peace internally and externally
- Wealth bonus for elites
- Leisure
- Status avenues for elites:
  - inherent
  - wealth
  - gifts
  - status goods/specialists
  - temples

After that, we can think more about how to make more lasting peace and how
to get settlements to grow beyond village level.