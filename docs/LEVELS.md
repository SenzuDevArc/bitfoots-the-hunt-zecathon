# Bitfoot: The Hunt, level by level

The play order is `window.TRAIL_ORDER` in `site/levels/levels.js`. Levels are numbered from 0, as the game's HUD shows them. Each level teaches one idea through a safe failure: you make the mistake, and the world shows you what the hunters can now see. The moveset never changes (walk, sprint, carry). Difficulty comes from the hunters and how they are combined, never from new player powers.

Every chain fact a level shows must match a rule in [ZEC-RULEBOOK.md](ZEC-RULEBOOK.md). Each level teaches one real Zcash term, listed per level below and in the `TERMS` table in `site/levels/order.js`.

Some earlier levels were merged into later ones, and their ideas are taught on the level they joined: STAY IN and ANY COIN joined LIFE IN THE RIVER, and ONE PILE AT A TIME joined LINKING THE DOTS (`window.TRAIL_MERGED` in `site/levels/levels.js`).

## Act 1: the public trail

### Level 0: Your wallet
- Goal: make a wallet, then bring 3 coins to the den.
- Lesson: your secret words back up your wallet, and whoever has them has the coins.
- Term: seed phrase.

### Level 1: Your first payment
- Goal: pay the post 1 coin to open the gate, then bring 4 coins to the den.
- Lesson: you approve a payment by signing it, and a tiny fee goes to the network.
- Term: zatoshi.

### Level 2: Wallet trackers
- Goal: pay the post on land, then bring 4 coins to the den past both hunters.
- Lesson: every step on land leaves footprints. Anyone can follow them and find you, even years later.
- Terms: transparent ZEC; a simple payment's standard fee is 10,000 zatoshis.

## Act 2: the river

### Level 3: Going private
- Goal: grab 5 coins, step into the river and bring them to the den inside it.
- Lesson: jumping into the river hides your footprints, but everyone sees where you went in and how much you brought.
- Term: shielding.

### Level 4: Life in the river
- Goal: get paid and pay the merchant, all inside the river, then reach the den.
- Lesson: you can get paid and pay inside the river, and from outside every coin looks the same. Climb out and everyone sees how much you took.
- Terms: note; fully shielded payment; nullifier; encrypted memo.

## Act 3: your keys

### Level 5: Linking the dots
- Goal: shield address A and address B on separate trips, then bring 6 coins to the den.
- Lesson: land addresses are public, so shield each one on its own trip, never together.
- Terms: diversified addresses; shielded pool; unified address (starts with u1).

### Level 6: The glass key
- Goal: a stall wants your glass key. Bring 3 coins to the den.
- Lesson: whoever gets your glass key sees every trip you make in the river, but can never spend. Once it is out, you can't take it back.
- Term: full viewing key.

### Level 7: The campfire
- Goal: keep your words, get paid, then bring 4 coins to the den.
- Lesson: whoever has your words owns your coins, so never share them. Someone watching your connection can still see when you get paid.
- Term: spending key.

### Level 8: All together (the finale)
- Goal: shield each pile on its own, pay inside the river and keep your words. Three red lines and you are found.
- Lesson: stay in the river, keep your words, and approve every leak yourself. The shore only sees what you let it see.
- Term: Ironwood.

## Act 4: the hard road

### Level 9: The new river
- Goal: carry your 3 coins through the dam into the new river, grab 1 more on land, then bring 4 coins to the den in the new river.
- Lesson: the old river is sealed. Coins can leave it, but no coin can go in, so you carry your coins over to the new river.
- Terms: migration; the gate's check is a proof, and Zcash's rivers use Halo 2.

### Level 10: The exchange
- Goal: pay the exchange desk 1 coin, then bring 3 coins to the den.
- Lesson: this exchange only takes public coins. To pay it you climb out at a new spot first, then walk to the desk, and everyone sees that walk.
- Terms: TEX address.

### Level 11: The lying post office
- Goal: get your mail. Some of it is fake. Check it at your own Zebra node, then bring 3 coins to the den.
- The post office hides 2 of your envelopes and slips in 2 fake copies; only your own node shows the real mail. Fake coins crumble at the den.
- Reading a note alone makes the post office's searchlight call every hunter; checking 2 other envelopes within 4 seconds hides which one was yours.
- Two hunters on patrol, one asleep by the river, and a dog guarding the only way in to your node.
- Lesson: a post office you don't run can hide your mail and show you less than you have. It can't take your coins.
- Term: full node, like Zebra.
