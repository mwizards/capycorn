# Capycorn Arcade — future game ideas

Ideas for future iterations, saved from a brainstorm on 2026-07-24. The arcade currently
leans toward fast reflex games (runners, jumping, tap racing), so most of these fill the
calmer puzzle/creative gap.

## 1. Snack Swap (match-3 puzzle)

A cozy match-3: swap oranges, melons, and berries on a grid to make rows of three and
feed a hungry capybara waiting at the side. Fills the biggest genre gap — there's no
puzzle game yet — and match-3 is a sweet spot for age 7: no time pressure, satisfying
combos, gentle difficulty ramp. Reuses the snack/fruit theme from Capybara Snackdown.

- Levels could unlock new snacks and a fuller, happier capybara.
- Special piece idea: a golden orange that clears a whole row with a sparkle burst.

## 2. Unicorn Sky Glide (gentle flying collect-a-thon)

Give the unicorn a starring role: float through pastel clouds collecting stars and
rainbow gems with soft, floaty physics — much more relaxed than Whisker Rush or Coin
Cat. Tap/hold to rise gently, release to drift down. No hard fail state; bumping a cloud
just slows you down.

- Rainbow trail behind the unicorn that grows as you collect gems.
- Could share the star/sparkle art style with Capy Salon.

## 3. Capycorn Memory Match (card pairs)

A card-flipping memory game using existing art (capybaras, cheetahs, cats, the unicorn,
snacks). Quick rounds, brain-training, and great for playing together — parent and child
taking turns. Cheap to build since all the art already exists in `assets/`.

- Difficulty picker: 4x3, 4x4, 5x4 grids.
- Match animations: the two matched characters do a little happy dance.

## 4. Capy Spa & Salon (expanded creative play)

The first slice of this shipped as **Capy Salon** (`capy-salon.html`): Sparkle the
unicorn styles a capybara's hair — wash with bubbles and rinse, paint tufts any color
(including rainbow), add waves, curls, and sparkles, then a Ta-da! photo moment.

Future iteration ideas for the salon:

- **Accessories:** bows, flower crowns, tiny hats, star clips that can be dragged onto
  the hair.
- **Haircut/grow tool:** scissors and a magic grow potion to change hair length.
- **Save the portrait:** render the finished capybara to a PNG the player can keep
  (canvas snapshot), building a little "style album" gallery.
- **More clients:** after the capybara, a cheetah or the coin cat sits in the chair;
  each client reacts differently.
- **Spa side:** mud mask, cucumber eyes, bubble bath minigame before styling.
- **Unicorn customization:** style Sparkle's own mane as a reward.
