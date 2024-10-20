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