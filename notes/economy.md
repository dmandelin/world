# Motivating problems

Next step is a "wealth bonus" for eminent families, but the current
model doesn't make it very easy to do this. The reason is that the
eminent families don't actually collect any produce, we just implicitly
redistribute.

There are related issues with trading and raiding. Eventually, we'd
want to model employment of people in trading, and seizure of trade
goods in transit via raiding, and the present model doesn't help too
much with that.

Finally, although the production2 model allowed for more flexible
allocation, it's clunky in certain areas. For example, there isn't
a very clean model for reallocating land.

Post-finally, we're going to need leisure time soon, so it's be good
to fold that in as well.

# Solutions

One natural move at this point is to get more stochastic: at each
reallocation turn, explicitly model different sets of people switching
between roles and occupations. We can include merchants and raiders
in that cycle. We may also be able to get rituals on more of an even
footing.

# Next

So far there is the outline of a new set of classes for production
and consumption. Next things to do:

- Something is wrong with the birth and death rate changes. Expose
  more of that calculation and then tune it better.
- Allow labor to switch between barley and lentils processes to seek
  higher utility.
- Assign a utility value to leisure. Show leisure in the UI.
  Initial value of 0-resource leisure is not that high, but can be
  reasonable with handcrafted costumes/effects/mustic. But various
  expenditures and trade goods could raise it a lot.
- Allow labor to change its leisure percentage.

- Add animal products, meat at first
- Allow trade to seek higher utility. We can have a type of merchantless
  trade with high transaction costs
  - later allow managed trade if politics allows for it for better costs
  - can also allow private trade or other forms later for even lower costs
- Allow raiding of trade routes. We've generally assumed raiding uses
  excess labor, but clearly it would cut into leisure time.
  - We'll need some sort of estimated marginal utility of raiding
    (which could include cultural factors such as honor) to decide
    how much to raid
  - We'll also need traders to see and respond to some kind of expected
    loss factor.