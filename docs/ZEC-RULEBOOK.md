# ZEC RULE BOOK: source of truth for Bitfoot: The Hunt

Every quote below was checked word for word against a saved copy of its source, on the date given for each section.

Every level line and mechanic must match a rule here. Each rule carries a verbatim source quote and its URL. Items under UNSOURCED are never shown as fact. Sections: R1 chain basics and wallets, R2 the shielded side, R3 privacy in practice.

# Zcash Rule Book, Section 1: blockchain basics as Zcash does them (R1-xx)

All sources were fetched on 2026-10-24. The protocol spec copy read was "Version v2026.7.0-344-g2bdf39 [NU6.2]", dated October 21, 2026 (https://zips.z.cash/protocol/protocol.pdf). The text was pulled from the PDF with pdftotext.

Two primary sources disagree with each other. In each case the ZIP wins, because the readthedocs glossary is older:
- Block time: the glossary says "Roughly every 2.5 minutes". ZIP 208 (Final) set it to 75 seconds at Blossom. Use 75 seconds.
- Fee: the glossary says "use the default fee of .0001 ZEC". ZIP 317 (Active) makes the fee depend on transaction size. 0.0001 ZEC is only the fee for the smallest transaction.

---

### R1-01 THE BLOCKCHAIN IS A SHARED PUBLIC RECORD
- Rule: Every Zcash transaction is written, in order, into one record that every user shares.
- Source says: "The blockchain is a public record of Zcash transactions in chronological order. The blockchain is shared between all Zcash users." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html, Blockchain)
- Status: Final
- Game must show: one shared ground that every hunter can read. Footprints are the record, and every character sees the same prints.
- Game must NOT: suggest a private or per-player record, or that shielded transactions are missing from the chain. They are recorded too, just encrypted (see R1-15).

### R1-02 EVERYTHING IS ON THE CHAIN, EVEN SHIELDED PAYMENTS
- Rule: Every transaction appears on the public chain. Shielded ones hide their details, not the fact that they happened.
- Source says: "The most secure transaction is a shielded (z-to-z) one, which encrypts the sender and receiver addresses and transaction amount. However, all transactions appear on the public blockchain, so a transaction is known to have occured and what fees were paid." (https://zcash.readthedocs.io/en/latest/rtd_pages/basics.html)
- Status: Final
- Game must show: a river crossing still leaves a visible sign that something happened (a ripple or a stamp), but no readable prints, names or amounts.
- Game must NOT: show shielded movement as totally invisible, as if no transaction existed.

### R1-03 A BLOCK IS A BATCH OF PAYMENTS, ABOUT EVERY 75 SECONDS
- Rule: A block is a batch of payments added to the chain. Zcash aims for one block every 75 seconds.
- Source says: "In section 5.3 (Constants), define PostBlossomPoWTargetSpacing := 75 seconds." (https://zips.z.cash/zip-0208, Specification) and "A block is a record in the Zcash blockchain that contains a set of transactions sent on the network." (glossary.html, Block)
- Status: Final
- Game must show: payments waiting, then sealed together in batches on a steady beat. The clock or stamp can tick about every 75 seconds of story time.
- Game must NOT: say 2.5 minutes (outdated), or show each payment getting its own instant block.

### R1-04 WAITING ROOM BEFORE A BLOCK (MEMPOOL)
- Rule: A sent payment first waits, checked but unconfirmed, until a block includes it.
- Source says: "The memory pool (or mempool for short) is a temporary staging location for transactions which have been verified by nodes in the Zcash network but have not yet been included in a block." (glossary.html, Memory pool)
- Status: Final
- Game must show: a short "waiting" state after the pay post, before the payment counts.
- Game must NOT: treat a payment as finished the moment it is signed.

### R1-05 CONFIRMATIONS: ONE PER BLOCK, MORE IS SAFER
- Rule: Getting into a block is the first confirmation. Each later block adds one more. Wait for about 10 when it matters.
- Source says: "A transaction confirmation first occurs when that transaction has been included in a block and gains an additional confirmation for each subsequent block." ... "generally recommended to wait for 10+ confirmations." (glossary.html, Confirmation)
- Status: Final
- Game must show: a confirmation counter that climbs as stamps pile on top. The gate can open at 1 for a tiny payment, but the UI shows it is "not yet safe" until about 10.
- Game must NOT: show one confirmation as permanent and final.

### R1-06 WALLETS WAIT BEFORE SPENDING NEW COINS (3 OR 10 CONFIRMATIONS)
- Rule: Wallets should not spend coins that are still fresh. The bar is 3 confirmations from trusted senders and 10 from anyone else.
- Source says: "10 confirmations, for untrusted TXOs;" "3 confirmations, for trusted TXOs." Wallets "SHOULD NOT permit the spending of TXOs with fewer than 3 confirmations" (https://zips.z.cash/zip-0315, Confirmation policy)
- Status: Draft (ZIP 315 is Draft)
- Game must show: coins you just received stay locked (padlock) for a few stamps before you can spend them again.
- Game must NOT: let a coin you just received be spent again instantly.

> **Game design note:** the game keeps every payment instant, so the game does not show R1-04, R1-05 or R1-06: no waiting state, no confirmation counter, no padlock on fresh coins. It never says a payment is final or that fresh coins are safe to spend at once; the detail is left out, not contradicted.

### R1-07 RECENT BLOCKS CAN BE UNDONE (UP TO 100)
- Rule: The newest blocks can be rewound and thrown away, at most 100 blocks deep.
- Source says: "A rollback is when a blockchain is rewound to a previous state and a set of the most recent blocks and the transactions they contain are discarded. Zcash has a rollback limit of 100 blocks." (glossary.html, Rollback)
- Status: Final
- Game must show: if shown at all, only the newest stamps can wobble. Older ones are fixed.
- Game must NOT: imply that old history can ever be rewritten.

### R1-08 NO SPENDING THE SAME COIN TWICE
- Rule: The network lets only one spend of the same ZEC go through.
- Source says: "A double spend happens when a user sends the same ZEC to two different recipients. Zcash miners, the Zcash blockchain and zk-SNARKs are integral for only allowing one transaction to confirm and be considered valid." (glossary.html, Double spend)
- Status: Final
- Game must show: a coin that is already spent cannot be carried to a second pay post. It is gone from the pouch.
- Game must NOT: allow, or hint at, reusing a spent coin.

### R1-09 FEES DEPEND ON TRANSACTION SIZE (ZIP 317)
- Rule: The standard fee is 5,000 zatoshi per "action", with a minimum of 2 actions. A simple payment costs 0.0001 ZEC; payments with more inputs or outputs cost more. The amount sent does not change the fee.
- Source says: "conventional_fee = marginal_fee · max(grace_actions, logical_actions)" with marginal_fee 5000 zatoshis per logical action and grace_actions 2 (https://zips.z.cash/zip-0317, Specification / Parameters)
- Status: Final (ZIP 317 Revision 0 is Active. Revision 1 adds Ironwood actions for NU6.3 and is Draft. Revision 2 is Draft.)
- Game must show: a small fee dot at the pay post. A payment that gathers many coins (many inputs) shows a bigger fee.
- Game must NOT: show a fixed fee for every payment, a fee that grows with the amount sent, a fee the player bids up to go faster, or a free payment.

### R1-10 PAY THE STANDARD FEE, NEVER AN ODD ONE
- Rule: Wallets pay the standard fee so the fee itself gives nothing away about you.
- Source says: "The conventional fee should not leak private information used in constructing the transaction;" wallets "SHOULD create transactions that pay this fee, in order to reduce information leakage" (https://zips.z.cash/zip-0317, Requirements / Specification)
- Status: Final (Revision 0 Active)
- Game must show: if the player can tip extra or pay an unusual fee, a hunter notices it (a link line or a clue file entry).
- Game must NOT: present a custom fee as harmless, or as a speed boost.

### R1-11 TOO LOW A FEE CAN MEAN NEVER MINED
- Rule: A payment that underpays the fee may sit waiting until it expires, or be dropped.
- Source says: "If a transaction has too low of a fee, it may stay in the mempool until the transaction expires." (glossary.html, Transaction fee). ZIP 317: nodes "MAY drop these transactions"
- Status: Final
- Game must show: an underpaid payment stays stuck in the waiting state, then fades.
- Game must NOT: confirm an underpaid payment normally.

### R1-12 TRANSPARENT = FULLY PUBLIC, LIKE BITCOIN
- Rule: On a transparent (t-address) payment, everyone can see the sender, the receiver and the amount.
- Source says: "the sender, receiver and transaction value are publicly visible." (https://zcash.readthedocs.io/en/latest/rtd_pages/basics.html, transparent transactions). Also: "Transfers of transparent value work essentially as in Bitcoin and have the same privacy properties." (protocol spec §1.2)
- Status: Final
- Game must show: footprints on land show who walked from where to where, and how much they carried. Every hunter and the lantern hunter can read them.
- Game must NOT: suggest a t-address hides any of the three (who, to whom, how much).

### R1-13 TRANSPARENT ADDRESSES START WITH t AND ARE RECORDED FOREVER
- Rule: Addresses starting with "t" are public. Every payment to or from one is recorded on the chain.
- Source says: "A transparent address (also referred to as a taddr) sends or receives transactions such that the address and associated value are publicly recorded on the Zcash blockchain. These addresses start with the letter t." (glossary.html, Transparent address)
- Status: Final
- Game must show: footprints that never wash away on land. The dog can follow prints of any age.
- Game must NOT: let land prints fade with time.

### R1-14 MIXED PAYMENTS SHOW THEIR PUBLIC SIDE
- Rule: When a payment mixes public and private addresses, the public side is still fully shown.
- Source says: "A transaction consisting of both transparent addresses and shielded addresses only reveals the data associated with the transparent address." (glossary.html, Transparent address)
- Status: Final
- Game must show: walking from land into the river leaves land prints right up to the bank. Walking out leaves prints from the bank onward.
- Game must NOT: imply that entering the river erases the prints that led to it.

### R1-15 MOVING VALUE BETWEEN POOLS ALWAYS SHOWS THE AMOUNT
- Rule: Shielding (public to private) and deshielding (private to public) are visible on-chain, and the amount is shown.
- Source says: "It is also possible for value to be transferred between chain value pools, either transparent or shielded; this always reveals the amount transferred." (protocol spec v2026.7.0, §1.2 High-level Overview)
- Status: Final
- Game must show: at the bank, the amount carried in or out is shown to watchers (a number popping up at the bank). This is why same amount in and out gets LINKED.
- Game must NOT: hide the amount at the moment of entering or leaving the river.

### R1-16 YOU CAN STAY SHIELDED: PRIVATE-TO-PRIVATE PAYMENTS EXIST
- Rule: You can receive, hold and pay entirely inside the shielded side. You never have to come back out.
- Source says: z-to-z is the most secure type; it "encrypts the sender and receiver addresses and transaction amount." (basics.html). Also: "It is RECOMMENDED that wallets only hold funds as shielded in the long term." (https://zips.z.cash/zip-0315, Draft)
- Status: Final (basics.html) / Draft (ZIP 315 recommendation)
- Game must show: a den, merchants and pay posts reachable from the water or across it, so a player can be paid and pay while staying shielded. The river is a place to live and trade, not only a strip to cross.
- Game must NOT: make the shielded pool a "mixer strip" you must always leave on the far side.

### R1-17 COINS ARE WHOLE OUTPUTS THAT GET SPENT AND REPLACED
- Rule: A payment uses up earlier outputs (coins or notes) as inputs and creates new outputs.
- Source says: "A transaction can contain transparent inputs, outputs, and scripts, which all work as in Bitcoin" ... shielded transfers "take in shielded input notes, and/or produce shielded output notes." (protocol spec §1.2). TXO = "An output (transparent coin or shielded note) of a transaction on the consensus block chain" (ZIP 315, Terminology)
- Status: Final (spec) / Draft (ZIP 315 term)
- Game must show: coins in the pouch are separate pieces. Paying consumes whole pieces and new ones are made (see the change note under UNSOURCED).
- Game must NOT: show one shared balance number being shaved down in place.

### R1-18 A WALLET HOLDS YOUR KEYS
- Rule: A wallet is an app that holds your secret keys, shows your balance and sends payments.
- Source says: "A Zcash wallet contains private key(s) which allow the owner to spend the ZEC balance it contains. Each Zcash wallet can show you the total balance of all ZEC it controls and lets you pay a specific amount to a specific address" (glossary.html, Wallet)
- Status: Final
- Game must show: coins stay padlocked until the player makes a wallet (pouch). The wallet is what unlocks spending.
- Game must NOT: suggest the coins live "in" the app. Coins are on the chain, and the wallet holds the keys.

### R1-19 THE SPENDING KEY IS THE ONLY WAY TO SPEND
- Rule: Whoever has the spending (private) key can spend the money. Lose it or leak it and the coins are gone.
- Source says: "A spending key is a type of private key that allows any user in possession of it to spend the balance of the associated address." ... "Private keys are important to keep safe as they are the only access to spending the funds you may own." (glossary.html, Spending key / Private key)
- Status: Final
- Game must show: anyone who gets your key (the campfire seed scam) can take everything in the pouch.
- Game must NOT: suggest support, a bank or a reset can recover stolen or lost keys.

### R1-20 ONE SEED MAKES ALL YOUR KEYS
- Rule: One secret seed backs up the whole wallet. Every key comes from it.
- Source says: "Wallets only need to store a single seed (particularly useful for hardware wallets)." ... a weak seed is "a weak link in the derivation of all keys belonging to that wallet." (https://zips.z.cash/zip-0032, Motivation / Rationale)
- Status: Final
- Game must show: the word notepad is the master backup. Losing it means losing every address, old and new.
- Game must NOT: suggest each address needs its own backup.

### R1-21 NEW WALLET SEED PHRASE IS 24 WORDS
- Rule: A new wallet's backup phrase (BIP 39) is 24 words (ZIP 315, Draft). When restoring an existing wallet, a wallet may accept fewer words.
- Source says: "if using a BIP 39 mnemonic, a 24-word mnemonic will be needed;" (https://zips.z.cash/zip-0315, Wallet seeds) and "A wallet implementation MAY accept BIP 39 mnemonics of fewer than 24 words or SLIP 39 shares of fewer than 33 words when restoring a wallet (but as specified above, MUST NOT generate them)." (same section). Reason: "The method of generating such a seed byte sequence for Zcash purposes MUST ensure that it has at least 256 bits of entropy." (https://zips.z.cash/zip-0032, Specification: Wallet seeds)
- Status: Draft (ZIP 315); the 256-bit requirement is Final (ZIP 32)
- Game must show: 24 words on the notepad when a new wallet is made.
- Game must NOT: show a 12-word phrase being generated for a new wallet, or claim a wallet can never restore from fewer than 24 words.

### R1-22 SIGNING PROVES YOU APPROVED IT
- Rule: Your wallet signs each payment with your key. The network checks the signature before accepting it.
- Source says: "When your Zcash wallet signs a transaction with the appropriate private key, the network can confirm that the signature matches the ZEC being spent. This signing is confirmed publicly for transparent addresses and through the use of zk-SNARKs for shielded addresses." (glossary.html, Signature)
- Status: Final
- Game must show: "SIGN" at the pay post before anything moves. Signing never reveals the key itself.
- Game must NOT: show the key being handed over to pay.

### R1-23 UNIFIED ADDRESSES (u1) BUNDLE SEVERAL RECEIVERS
- Rule: A unified address starts with "u" and holds one or more receivers. It always holds at least one shielded receiver.
- Source says: "A Revision 0 Unified Address MUST contain at least one shielded Item" (https://zips.z.cash/zip-0316). Prefix: "“u”, if this is a UA or UVK prior to Revision 2" (ZIP 316); the string continues with "the "1" separator" after the HRP (ZIP 316), hence "u1". Revision 2 adds "zu" (shielded-only) and "tu" (can include transparent) and is Draft.
- Status: Final (Revision 0 Active) / Draft (Revision 2, zu/tu)
- Game must show: one address card with several slots in it (shielded first, public optional).
- Game must NOT: show a u1 as purely public, or present zu/tu as live today.

### R1-24 THE SENDER USES THE MOST PRIVATE RECEIVER IT SUPPORTS
- Rule: When paying a unified address, the sender's wallet must pick the most preferred receiver it can use. Shielded comes before transparent.
- Source says: "The Sender of a payment to a Unified Address MUST use the Receiver of the most preferred" type it supports. Priority: Orchard (0x03), Sapling (0x02), then transparent (https://zips.z.cash/zip-0316, Priority List)
- Status: Final (Revision 0)
- Game must show: paying a u1 at the pay post goes into the river automatically, as long as the payer can do shielded.
- Game must NOT: let a shielded-capable payer choose the public slot of a u1 by default.

### R1-25 A TRANSPARENT RECEIVER WEAKENS A UNIFIED ADDRESS
- Rule: Public receivers give no privacy, and the transaction graph can link them.
- Source says: "Transparent addresses do not provide any privacy protection" (ZIP 316, Rationale) and unlinkability is only partly achieved with transparent receivers "since the on-chain transaction graph can potentially be used to link transparent addresses." (ZIP 316, address derivation Rationale)
- Status: Final (ZIP 316 text)
- Game must show: a u1 with a public slot that gets used leaves land prints like any t-address.
- Game must NOT: suggest that wrapping a t-address inside a u1 makes it private.

### R1-26 SINCE NU6.3 THE ORCHARD POOL ONLY PAYS OUT
- Rule: Since block 3,428,143 (NU6.3), coins can leave the Orchard pool but no new coins can go in. New shielded value goes to Ironwood.
- Source says: the rules "ensure that, after NU6.3, the Orchard pool can only be spent from (not added to)" (https://zips.z.cash/zip-0258, Status: Final; Mainnet activation 3428143). Also: "an Orchard-protocol receiver that was exposed before NU6.3 can receive Ironwood-pool funds after NU6.3" (https://zips.z.cash/zip-0326, Draft)
- Status: Final (ZIP 258) / Draft (ZIP 326)
- Game must show: if pools are named, Orchard is a "closed, exit-only" stream, and old u1 addresses still receive privately (into Ironwood).
- Game must NOT: call Orchard the active pool new money goes into, or say old u1 addresses stopped working.

## Mining, new coins, units, fee floor (R1-27 to R1-34)

All sources below were read on 2026-10-26: the protocol spec PDF (same header "Version v2026.7.0-344-g2bdf39 [NU6.2]", text pulled with pdftotext), the ZIP pages on zips.z.cash, and glossary.html.

### R1-27 MINERS BUILD BLOCKS WITH PROOF OF WORK (EQUIHASH)
- Rule: Waiting payments sit in the mempool until a miner puts them in a block. Miners compete to find an Equihash proof-of-work solution; the winner adds the block.
- Source says: "Pending inclusion in a block, a transaction is kept in the mempool in an unconfirmed state." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html, Block) and "Mining is the process where for each block, nodes in the Zcash network compete by doing complex mathematical calculations to find a solution based on a self-adjusting difficulty. Zcash miners are rewarded with both the transaction fees of the transactions they confirm and block rewards. Zcash uses a proof-of-work mining algorithm called Equihash." (glossary.html, Mining) and "Zcash uses Equihash [BK2016] as its proof-of-work." (https://zips.z.cash/protocol/protocol.pdf §7.7 Proof of Work)
- Status: Final (spec) / published doc (glossary)
- Read: 2026-10-26
- Game must show: a miner gathering waiting payments into a batch and racing others to seal it; the winner's batch joins the chain.
- Game must NOT: quote the glossary's "Roughly every 2.5 minutes" from the same Block entry (outdated, see R1-03), or show the miner choosing which coins are valid by opinion: the solution and the rules decide.

### R1-28 NEW ZEC IS CREATED WHEN A BLOCK IS MINED (BLOCK SUBSIDY)
- Rule: Each mined block creates new ZEC, the block subsidy. Part goes to the miner, part to funding streams, and the miner also collects the fees of the payments in the block, through the block's first (coinbase) transaction.
- Source says: "Like Bitcoin, Zcash creates currency when blocks are mined. The value created on mining a block is called the block subsidy." / "[Canopy onward] The block subsidy is composed of a miner subsidy and a series of funding streams." / "As in Bitcoin, the miner of a block also receives transaction fees." (https://zips.z.cash/protocol/protocol.pdf §3.10) and "Every block has a single coinbase transaction as the first transaction in the block. The purpose of this coinbase transaction is to collect and spend any miner subsidy, and transaction fees paid by other transactions included in the block." (protocol spec §3.11)
- Status: Final
- Read: 2026-10-26
- Game must show: sealing a block produces a small pile of fresh coins plus the fee dots from the payments inside it.
- Game must NOT: say all new ZEC goes to the miner (funding streams take a share, see R1-31), or use the glossary "Block reward" entry figures ("80% (or 10 ZEC)"): they describe the first four years only.

### R1-29 THE SUBSIDY HALVES ON A SCHEDULE (HALVINGS)
- Rule: The block subsidy drops by half at fixed block heights. The second halving was at block 2,726,400 (23 November 2024); the third is at block 4,406,400.
- Source says: "A seventh upgrade, called NU6, activated on Mainnet on 23 November, 2024 at block height 2726400 (coinciding with the second block subsidy halving )" (https://zips.z.cash/protocol/protocol.pdf §6) and "ending at block height 4406400, Zcash’s third halving." (https://zips.z.cash/zip-1016). The formula is BlockSubsidy(height) = floor(MaxBlockSubsidy / (BlossomPoWTargetSpacingRatio · 2^Halving(height))) with "PreBlossomHalvingInterval N := 840000" and "PostBlossomHalvingInterval := floor(PreBlossomHalvingInterval · BlossomPoWTargetSpacingRatio)" (protocol spec §5.3, §7.8)
- Status: Final (spec) / Proposed (ZIP 1016, the 4406400 sentence; the same height is the Revision 2 stream end in the spec §7.10.1 table)
- Read: 2026-10-26
- Game must show: if new coins are shown, the pile per block gets smaller at a halving.
- Game must NOT: give a calendar date for the third halving (the source gives a block height only). If NU7 activates first, ZIP 1016 says the halving height is revised ("the revised third-halving height A + 3(4406400 - A)"); that rule is Proposed, not live.

### R1-30 THERE WILL NEVER BE MORE THAN 21,000,000 ZEC
- Rule: The protocol caps the total supply at 21 million ZEC. A block that would push the issued supply above it is rejected.
- Source says: "MAX_MONEY N := 2.1·10^15 (zatoshi)" (https://zips.z.cash/protocol/protocol.pdf §5.3 Constants; 2.1·10^15 zatoshi ÷ 10^8 = 21,000,000 ZEC, see R1-33) and "If the total issued supply (computed without possibility of overflow) would become greater than MAX_MONEY zatoshi in the block chain created as a result of accepting a block, then all nodes MUST reject the block as invalid." (protocol spec, chain value pool consensus rule). Cross-check: "a minimum of 420,000 ZEC (2% of the total eventual supply)" (https://zips.z.cash/zip-1016)
- Status: Final (spec); the 21,000,000 figure is the spec constant converted to ZEC
- Read: 2026-10-26
- Game must show: a fixed cap; the supply counter can only approach 21,000,000.
- Game must NOT: suggest anyone (developers, miners, a foundation) can mint beyond the cap.

### R1-31 TODAY'S SPLIT OF EACH NEW BLOCK: 8% GRANTS, 12% LOCKBOX, REST TO THE MINER
- Rule: From block 3,146,400 (NU6.1) to block 4,406,400, 8% of each block subsidy goes to Zcash Community Grants and 12% goes to the in-protocol deferred (lockbox) pool, the Coinholder-Controlled Fund. The miner gets what is left: 80%, by subtraction.
- Source says: "[NU6.1 onward] [ZIP-214] Revision 2 defines these funding streams for Mainnet : ... FS_FPF_ZCG_H3 8 100 3146400 4406400 / FS_CCF_H3 12 100 3146400 4406400" (https://zips.z.cash/protocol/protocol.pdf §7.10.1, table rows: stream, numerator, denominator, start, end) and "FS_CCF_H3 = DEFERRED_POOL as defined in ZIP 207" (https://zips.z.cash/zip-0214, Mainnet Recipients for Revision 2 and Revision 3) and "8% of the block rewards will be allocated to the ZCG for grants by and for the Zcash Community." / "12% of the block rewards will accrue to a fund controlled by decisions of coin holders, seeded by the Deferred Dev Fund Lockbox." (https://zips.z.cash/zip-1016) and "MinerSubsidy(height) := BlockSubsidy(height) - FoundersReward(height) - [sum of funding stream values]" (protocol spec §7.8; FoundersReward is 0 after the first halving)
- Status: Final (spec §7.10.1, activated at NU6.1 on 24 November 2025) / ZIP 214 Revision 2 and ZIP 1016 are labelled Proposed on zips.z.cash. The 80% miner share is derived (100 - 8 - 12), not a quoted figure. Activation date: "An eighth upgrade, called NU6.1, activated on Mainnet on 24 November, 2025 at block height 3146400" (protocol spec §6). Caveat: ZIP 214 Revision 3 (NU7, Proposed) would move the end height if NU7 activates first; say "current since NU6.1".
- Read: 2026-10-26
- Game must show: if the split is shown, three slices: miner (largest), grants 8%, lockbox 12%.
- Game must NOT: use the ZIP 1015 streams (FS_FPF_ZCG / FS_DEFERRED, end height 3146400) as current, say "founders' reward", or say "Electric Coin Company / Zcash Foundation get a cut" (those ZIP 214 Revision 0 streams ended at block 2726400). Keep "80%" off cards unless the card says it is the remainder.

### R1-32 CURRENT BLOCK SUBSIDY: 1.5625 ZEC PER BLOCK
- Rule: Between the second halving (block 2,726,400) and the third (block 4,406,400) each block creates 1.5625 ZEC (156,250,000 zatoshi). Of that, 8% and 12% go to the funding streams (R1-31).
- Source says: "Every 75 seconds, a new block is mined to the Zcash blockchain and a block reward of 1.5625 ZEC comes into circulation." and "The amount of the block reward cuts in half about every four years until all 21 million ZEC are in circulation." (https://z.cash/learn/what-are-the-economics-of-zcash/, no page date shown) and "During the second halving period, the post-Blossom block subsidy is 1.5625 ZEC." (https://zips.z.cash/zip-0218, Status: Proposed; found by the fact-checker, not re-read by me). Spec cross-check (my arithmetic): "MaxBlockSubsidy N := 1.25·10^9 (zatoshi)", BlossomPoWTargetSpacingRatio = 150 / 75 = 2, Halving(height) = 2 after the second halving: 1.25·10^9 ÷ (2 · 2^2) = 156,250,000 zatoshi (https://zips.z.cash/protocol/protocol.pdf §5.3, §7.8).
- Status: published doc (z.cash, undated) + spec formula (Final). The glossary "Block reward" entry is outdated (10 ZEC to miners) and must not be used.
- Read: 2026-10-26
- Game must show: if a figure is shown, "1.5625 ZEC per block until the third halving", and the miner's part is less than that (funding streams take 20%).
- Game must NOT: call 1.5625 ZEC the miner's pay (that is the whole subsidy before the 8% / 12% streams), or show 3.125, 6.25 or 12.5 ZEC as today's reward.

### R1-33 ONE ZEC = 100,000,000 ZATOSHI
- Rule: The smallest unit of ZEC is the zatoshi. One ZEC is 100 million zatoshi. Fees and amounts inside the protocol are counted in zatoshi.
- Source says: "We call the smallest units of currency (on either network) zatoshi." / "On Mainnet , 1 ZEC = 10^8 zatoshi." (https://zips.z.cash/protocol/protocol.pdf §3.12 Mainnet and Testnet; pdftotext renders the exponent as "10 to the 8") and "replacing "BTC", or "bitcoin" used as a currency unit, with "ZEC"; and "satoshi" with "zatoshi"." (protocol spec §7.12)
- Status: Final
- Read: 2026-10-26
- Game must show: fee dots and small amounts can be labelled in zatoshi (e.g. 10,000 zatoshi = 0.0001 ZEC).
- Game must NOT: say a ZEC can be split below one zatoshi, or call the unit "satoshi".

### R1-34 THE MINIMUM CONVENTIONAL FEE IS 10,000 ZATOSHI (CHECK OF R1-09)
- Rule: R1-09 is correct. Under ZIP 317 the fee is 5,000 zatoshi times the number of logical actions, but never fewer than 2 actions are charged, so the smallest normal payment pays 10,000 zatoshi (0.0001 ZEC).
- Source says: "Wallets implementing this specification SHOULD use a conventional fee, calculated in zatoshis, of conventional_fee = marginal_fee · max(grace_actions, logical_actions)" with the parameter table "marginal_fee 5000 zatoshis per logical action (as defined below)" and "grace_actions 2 logical actions" and the rationale "This returns the conventional fee for a minimal transaction (as described above) to the original conventional fee of 10000 zatoshis" (https://zips.z.cash/zip-0317, Fee calculation / Rationale: Marginal Fee). Revision 1 (NU6.3): "contribution_Ironwood = nActionsIronwood" (same ZIP).
- Status: ZIP 317 "[Revision 0] Active, [Revision 1: NU6.3] Draft, [Revision 2] Draft" (Last-Updated 2026-06-26)
- Read: 2026-10-26
- Game must show: a simple payment's fee dot = 10,000 zatoshi; each extra logical action above 2 adds 5,000.
- Game must NOT: call 10,000 zatoshi a hard network minimum: ZIP 317 is a wallet SHOULD; nodes may drop lower-fee transactions (R1-11). Do not use ZIP 317's "Considered Alternatives" values (marginal_fee 250, 1000, 2500, 10000) as the rule.

---

## UNSOURCED (not a rule yet)

- **Address reuse on transparent links your payments.** It is common knowledge, and it follows from R1-13 (every payment to a t-address is publicly recorded under it). No primary source sentence says "do not reuse a transparent address". Searched: glossary.html, basics.html, ZIP 315 (no "reuse" or "fresh"), ZIP 316 (closest: the transaction graph "can potentially be used to link transparent addresses"), ZIP 320 (only ephemeral TEX addresses "SHOULD NOT be chosen in a way that allows them to be linked"). The game's level 3 lesson rests on this, so it is backed by inference only.
- **Change: the leftover of a spent coin returns to you as a new output.** ZIP 315 only mentions "change outputs" in passing ("store this information in the memo field of change outputs"). The protocol spec says outputs are created, but no fetched source explains change in plain terms. Searched: glossary.html (no Change or UTXO entry), basics.html, ZIP 315, protocol spec §1.2.
- **A wrong seed word gives a checksum error.** That is BIP 39 behaviour. ZIP 339 (Wallet Recovery Words) is only "Reserved", with no text. Searched: ZIP 339, ZIP 32, ZIP 315. BIP 39 itself is not on the allowed source list.
- **Block explorers let anyone look up transparent transactions.** z.cash/wallets only lists Bitquery, Blockchair and Messari under the "Block Explorer" tag, with no sentence on what an explorer shows. The glossary and basics pages have no explorer entry. What an explorer could show is already covered by R1-01, R1-12 and R1-13.

# Zcash Rule Book, section 2: the shielded side (R2-xx)

All sources fetched 2026-10-24. Protocol spec = https://zips.z.cash/protocol/protocol.pdf, header "Version v2026.7.0-344-g2bdf39 [NU6.2]", dated October 21, 2026 (text extracted locally with pdftotext). Note: the spec's §1.2 overview still lists pools as "transparent pool, Sprout pool, Sapling pool, Orchard pool, and deferred development fund pool"; Ironwood appears only in later sections (§4.14, §7.1). ZIP 258 is the source for Ironwood.

## Pools

### R2-01 Two kinds of money: public and shielded
- Rule: Every coin sits in a pool. The public pool works like Bitcoin; shielded pools hide payments.
- Source says: "All value in Zcash belongs to some chain value pool. ... Transfers of transparent value work essentially as in Bitcoin and have the same privacy properties." (https://zips.z.cash/protocol/protocol.pdf §1.2 High-level Overview) and "A zk-SNARK is a particular form of zero-knowledge proof used in the Zcash protocol which allows shielded addresses to prove the validity of associated transactions without revealing the address or value transacted." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html "zk-SNARKs")
- Status: Final
- Game must show: land = public pool (footprints), river = shielded pool. Every coin is either on land or in the water, never neither.
- Game must NOT: suggest there is a third "half-hidden" place, or that bushes are part of Zcash privacy.

### R2-02 Ironwood is the newest shielded pool (NU6.3)
- Rule: Since the NU6.3 upgrade, new shielded money goes into a new pool called Ironwood.
- Source says: "This proposal defines the deployment of the NU6.3 network upgrade, which introduces the Ironwood shielded pool." (https://zips.z.cash/zip-0258 Abstract; Status: Final; mainnet height 3428143)
- Status: Final
- Game must show: if pools are named, the river the player swims in today is Ironwood.
- Game must NOT: call Orchard "the active pool" or say Ironwood is a plan or proposal (ZIP 258 is Final, not Draft as older notes said).

### R2-03 Orchard is sealed: coins can only leave
- Rule: After NU6.3 nobody can add coins to Orchard or pay another address inside it; the Orchard total can only shrink.
- Source says: "after NU6.3, the Orchard pool can only be spent from (not added to), and that cross-address transfers within the Orchard pool are disabled, so that newly created shielded value is directed into the Ironwood pool." (https://zips.z.cash/zip-0258 Specification)
- Status: Final
- Game must show: an old, closed stretch of river (if shown) where coins can only flow out, toward Ironwood.
- Game must NOT: let the player deposit into Orchard or pay another address inside Orchard. Do not claim every move inside Orchard is blocked: the source disables cross-address transfers only.

### R2-04 Why Orchard was sealed
- Rule: A bug was found in Orchard's proof circuit; it was fixed, and value is moving to Ironwood.
- Source says: "This vulnerability could have allowed balance violation and theft of funds." / "The Orchard Action circuit's variable-base scalar multiplication gadget is corrected, fixing the soundness vulnerability." (https://zips.z.cash/zip-0257 Motivation / Specification; Status: Final). ZIP 257 does not mention Ironwood; the move comes from ZIP 258: "so that newly created shielded value is directed into the Ironwood pool." (https://zips.z.cash/zip-0258, Consensus rules from NU6.3 activation)
- Status: Final
- Game must show: nothing required. If mentioned, say "a flaw was found and fixed".
- Game must NOT: say coins were stolen. ZIP 257 says "could have allowed", not that it happened.

### R2-05 Moving from Orchard to Ironwood is a migration
- Rule: Wallets move Orchard coins to Ironwood in two steps: prepare notes, then send on a schedule.
- Source says: "This ZIP specifies best practices for wallets migrating funds from the Orchard pool to the Ironwood pool" / "The migration runs as a two-phase process: a note-preparation phase followed by a scheduled transaction-creation phase." (https://zips.z.cash/zip-0318 Abstract)
- Status: Draft
- Game must show: optional. If shown, the move is done by the wallet, in batches over time, not one big jump.
- Game must NOT: present this as a final, required rule (ZIP 318 is Draft).

### R2-06 Sprout takes no new money
- Rule: Sprout, the first shielded pool, accepts no new coins. Old coins can still leave.
- Source says: "This proposal disables the ability to add new value to the Sprout chain value pool balance." (https://zips.z.cash/zip-0211 Abstract; Status: Final) and "This does not prevent extracting value held in Sprout addresses and sending it to transparent addresses, or to Sapling addresses via the migration tool" (ZIP 211, Motivation)
- Status: Final
- Game must show: if Sprout appears, it is a dried-up side stream you can only walk out of.
- Game must NOT: let the player put coins into Sprout.

### R2-07 Pool status snapshot (dated 2026-10-24 05:07 UTC)
- Rule: Dated snapshot only, not a spec. On 2026-10-24 at 05:07 UTC the third-party dashboard zecstats.org labelled Sapling and Ironwood open, Orchard sealed and migrating, Sprout closing. These labels and numbers can change at any time.
- Source says: Sprout "closing"; Sapling "open"; Orchard "sealed (migrating)"; Ironwood "open (NU6.3)"; total shielded "4.96M ZEC", "29.2%"; "Last updated 2026-10-24 05:07 UTC". (https://zecstats.org, third-party live dashboard)
- Status: Dated snapshot (2026-10-24 05:07 UTC); third-party live page, not a ZIP or spec
- Game must show: any pool or "how much is shielded" figure carries its date.
- Game must NOT: hard-code these numbers as permanent facts.

### R2-08 Crossing between pools shows the amount
- Rule: Any move between pools (public to shielded, or one shielded pool to another) shows the amount.
- Source says: "It is also possible for value to be transferred between chain value pools, either transparent or shielded; this always reveals the amount transferred." (https://zips.z.cash/protocol/protocol.pdf §1.2)
- Status: Final
- Game must show: the river bank. Stepping in or out shows a visible number on the bank.
- Game must NOT: imply that entering or leaving the river hides the amount.

## Shielding, deshielding, staying shielded

### R2-09 Shielding is visible and tied to your public address
- Rule: Shielding (public to shielded) is public: the sending public address and the amount can be seen.
- Source says: "A shielding transaction is always linked to the transparent addresses it spends from." (https://zips.z.cash/zip-0315 Status: Draft) plus R2-08 (amount revealed).
- Status: Draft (ZIP 315) + Final (spec §1.2 for the amount)
- Game must show: footprints lead right up to the bank where you entered, with the amount shown.
- Game must NOT: wipe the land trail that led to the river.

### R2-10 Deshielding is visible too
- Rule: Leaving the shielded pool to a public address shows the amount and the public address it lands on.
- Source says: "this always reveals the amount transferred." (https://zips.z.cash/protocol/protocol.pdf §1.2) and "The user's consent is needed to reveal amounts publically" (https://zips.z.cash/zip-0315) and "A transparent address (also referred to as a taddr) sends or receives transactions such that the address and associated value are publicly recorded on the Zcash blockchain." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html, Transparent address)
- Status: Final (spec) / Draft (ZIP 315)
- Game must show: new footprints start on the far bank, with the amount, when you climb out.
- Game must NOT: suggest the exit is invisible. What is hidden is which entry it came from (R2-17), not the exit itself.

### R2-11 You can stay shielded: fully shielded payments exist
- Rule: You can keep coins and pay people entirely inside the shielded pool, never touching land.
- Source says: "A shielded transaction is a transaction exclusively between shielded addresses." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html) and "It is RECOMMENDED that wallets only hold funds as shielded in the long term" (https://zips.z.cash/zip-0315)
- Status: Final (glossary, docs) / Draft (ZIP 315 recommendation)
- Game must show: a player can live in the river: receive, hold and pay (pay post / merchant in the water) without climbing out.
- Game must NOT: make the river a strip you must cross and leave, like a mixer. Leaving is optional.

### R2-12 Fully shielded payments hide sender, receiver and amount
- Rule: In a shielded payment, outsiders cannot see who paid, who got paid, or how much.
- Source says: "zk-SNARK ... allows shielded addresses to prove the validity of associated transactions without revealing the address or value transacted." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html "zk-SNARKs")
- Status: Final
- Game must show: no footprints and no numbers while paying inside the river. The lantern hunter sees only that something happened.
- Game must NOT: show amounts or a line between payer and payee for a water-to-water payment.

### R2-13 Prefer one pool; avoid pool crossing
- Rule: Wallets should avoid moving between pools, and pay from one shielded pool when possible.
- Source says: "A wallet MUST NOT send funds to a transparent address unless all of the source funds come from shielded pools, and this SHOULD be a single shielded pool. We want to minimize pool crossing." (https://zips.z.cash/zip-0315)
- Status: Draft
- Game must show: crossing from one river to another is a visible bank event (R2-08), so the smart play is to stay in one river.
- Game must NOT: suggest hopping between pools adds privacy.

### R2-14 Shielding from several public addresses links them
- Rule: Shielding coins from two public addresses in one go shows they belong to the same person.
- Source says: "Wallets SHOULD NOT auto-shield from multiple transparent addresses in the same transaction" and the reason: "if the inputs to the transaction are associated with multiple transparent addresses, those addresses will be linked to each other" (https://zips.z.cash/zip-0315)
- Status: Draft
- Game must show: entering the river carrying coins from two land addresses draws a red link between them.
- Game must NOT: treat merging into the river as cleaning both trails.

## Turnstile / value balance

### R2-15 The network counts each pool's total (turnstile)
- Rule: Everyone can see the total in each shielded pool. It can never go below zero.
- Source says: "It is possible for nodes to monitor the total value of notes that are shielded to, or unshielded from" each pool. ... "If the total value that is unshielded exceeds the total value that was shielded for a given pool, a balance violation has occurred" (https://zips.z.cash/zip-0209 Motivation; Status: Final)
- Status: Final
- Game must show: a public counter at the river's edge showing the river's total. It goes up when coins enter, down when they leave.
- Game must NOT: show individual balances inside the river. Only the pool total is public.

### R2-16 Blocks that push a pool negative are rejected
- Rule: If a block would make any pool's total negative, every node rejects it.
- Source says: "If the chain value pool balance for any of the Sprout, Sapling, Orchard, Ironwood, transparent, or deferred development fund pools would become negative ... all nodes MUST reject the block as invalid." (https://zips.z.cash/zip-0258)
- Status: Final
- Game must show: optional. Fake coins can never come out of the river.
- Game must NOT: suggest hidden money can be created out of nothing.

## Notes, commitments, nullifiers, proofs

### R2-17 Shielded coins are "notes"
- Rule: Shielded money is stored as notes. Each note has an amount and an owner address.
- Source says: "Value in a shielded chain value pool is carried by notes, which specify an amount and (indirectly) a shielded payment address" (https://zips.z.cash/protocol/protocol.pdf §1.2)
- Status: Final
- Game must show: coins in the river are sealed boxes (one note = one box with an amount inside).
- Game must NOT: show a shielded "account balance" on the chain; there are only notes.

### R2-18 Each note leaves a public commitment (a sealed box on the shelf)
- Rule: When a note is made, a sealed fingerprint of it (a note commitment) goes on the public chain. The commitment does not show the note's contents.
- Source says: "To each note there is cryptographically associated a note commitment. Once the transaction creating a note has been mined, the note is associated with a fixed note position in a tree of note commitments" (https://zips.z.cash/protocol/protocol.pdf §1.2) and a commitment scheme commits to its input so that "no information is revealed about it without the trapdoor ("hiding")" (protocol spec §4.1.8 Commitment)
- Status: Final
- Game must show: a sealed box/stamp is added to a public shelf for every new note; everyone sees boxes, nobody sees inside.
- Game must NOT: label boxes with owner or amount.

### R2-19 Spending reveals a nullifier, stopping double spends
- Rule: Spending a note publishes its one-time "nullifier". Using it twice gets the second payment rejected.
- Source says: "each note on the block chain only has one valid nullifier, and so attempting to spend a note twice would reveal the nullifier twice, which would cause the second transaction to be rejected." (https://zips.z.cash/protocol/protocol.pdf §1.2)
- Status: Final
- Game must show: spending drops a token in a public jar; a second identical token bounces (token jar).
- Game must NOT: suggest the nullifier is the note itself or shows the amount.

### R2-20 The nullifier does not point to which note was spent
- Rule: Nobody can tell which sealed box a nullifier belongs to without the owner's key.
- Source says: "It is infeasible to correlate the note commitment or note position with the corresponding nullifier without knowledge of at least this key." (https://zips.z.cash/protocol/protocol.pdf §1.2)
- Status: Final
- Game must show: tokens in the jar and boxes on the shelf have no lines between them.
- Game must NOT: draw a link from a spent token back to a specific box.

### R2-21 A spend hides which earlier note it used (anonymity set = all notes)
- Rule: Your spend could be any earlier note an outsider does not know to be spent.
- Source says: "the set of possibilities for a given note input to a transaction --its note traceability set -- includes all previous notes that the adversary does not control or know to have been spent." (https://zips.z.cash/protocol/protocol.pdf §1.2)
- Status: Final
- Game must show: every earlier box on the shelf that the hunter does not know to be spent is a suspect, not only the current crowd.
- Game must NOT: imply privacy depends only on how many people are in the river at this moment (crowd of 6). Timing and amount at the banks are separate leaks (see R2-22).

### R2-22 The hiding has limits: timing and counts can still leak
- Rule: The "any note" promise is for fully shielded payments. Timing and partly public payments can still give hints.
- Source says: "We make this claim only for fully shielded transactions. It does not exclude the possibility that an adversary may use ... metadata-based heuristics such as timing, to make probabilistic inferences about transaction linkage." (https://zips.z.cash/protocol/protocol.pdf §1.2 footnote 4)
- Status: Final
- Game must show: in-and-straight-out with the same amount lets the hunter guess a link (LINKED, TOO FAST): a guess at the banks, not a trail in the water.
- Game must NOT: say timing leaks inside fully shielded payments are impossible, or that shielded pools are unbreakable in all cases.

### R2-23 A proof shows the payment is valid without showing it
- Rule: Each shielded payment carries a math proof that it is valid, without revealing addresses or amounts.
- Source says: "A zero-knowledge proving system is a cryptographic protocol that allows proving a particular statement ... without revealing information about the auxiliary inputs other than that implied by the statement." (https://zips.z.cash/protocol/protocol.pdf §4.1.13)
- Status: Final
- Game must show: the cube machine / cave gate checks "valid" and lets the payment through without opening the box.
- Game must NOT: show the checker opening the box or reading the amount.

### R2-24 Orchard and Ironwood proofs use Halo 2
- Rule: Orchard and Ironwood payments are proved with a system called Halo 2.
- Source says: "For Orchard-pool Action descriptions in version 5 transactions, Zcash uses zk-SNARKs with the Halo 2 proving system" (§5.4.10.3) and for Ironwood: "The aggregated zk-SNARK proof ... (see section 5.4.10.3 `Halo 2' on page 115)." (https://zips.z.cash/protocol/protocol.pdf §5.4.10.3, §7.1)
- Status: Final
- Game must show: optional name on the machine.
- Game must NOT: name a different proof system for Ironwood.

## Addresses and keys

### R2-25 Shielded addresses: make many, all yours
- Rule: One wallet can make many shielded addresses that outsiders cannot tell belong together.
- Source says: "A group of such addresses shares the same full viewing key and incoming viewing key, and so creating as many unlinkable addresses as needed does not increase the cost of scanning" (https://zips.z.cash/protocol/protocol.pdf §3.1)
- Status: Final
- Game must show: in the river, a fresh address per payer costs nothing.
- Game must NOT: suggest a new address is needed to hide inside the pool's own records (it hides the link between payers who compare addresses).
- Name check (2026-10-26): these are called **diversified payment addresses**. The full spec sentence is: "Sapling protocol and Orchard protocol provide a mechanism to allow the efficient creation of diversified payment addresses with the same spending authority." (https://zips.z.cash/protocol/protocol.pdf §3.1) and ZIP 32: "To prevent the diversifier leaking how many diversified addresses have already been generated for an account, we make the sequence of diversifiers pseudorandom and uncorrelated to that of any other account." (https://zips.z.cash/zip-0032, Sapling diversifier derivation). No new rule needed: R2-25 already holds the fact; the term may be used on cards.

### R2-26 Unified addresses always include a shielded receiver
- Rule: A unified address (starts "u1") always carries at least one shielded receiver.
- Source says: "A Revision 0 Unified Address MUST contain at least one shielded Item (currently Typecodes 0x02 and 0x03)." (https://zips.z.cash/zip-0316; Status: Revision 0 Active). Prefix: "“u”, if this is a UA or UVK prior to Revision 2", followed by "the "1" separator" (ZIP 316), hence "u1".
- Status: Final (Rev 0 Active)
- Game must show: a "u1" address card always has a river (shielded) slot.
- Game must NOT: show a unified address that is land-only.

### R2-27 Full viewing key: sees in and out, cannot spend
- Rule: A full viewing key shows money coming in and going out, but cannot spend it.
- Source says: "for each spending key there is a full viewing key that allows recognizing both incoming and outgoing notes without having spending authority." (https://zips.z.cash/protocol/protocol.pdf §1.2)
- Status: Final
- Game must show: the glass key lets the auditor see both incoming and outgoing boxes; the coins stay locked to them.
- Game must NOT: let the glass key open the den or move coins.

### R2-28 Incoming viewing key: sees only what comes in
- Rule: An incoming viewing key finds and reads payments sent to you, and is made from the full key.
- Source says: "(Note for below: IVK and OVK are derived from FVK.)" (https://zips.z.cash/zip-0310; Status: Draft) and spec §4.20.2 title "Decryption using an Incoming Viewing Key"; §1.2: "use the receiving key to scan the block chain for notes addressed to them and then decrypt those notes." (https://zips.z.cash/protocol/protocol.pdf)
- Status: Final (spec) / Draft (ZIP 310)
- Game must show: if two keys are shown, the smaller glass key shows only arrivals.
- Game must NOT: say the incoming key shows outgoing payments.

### R2-29 Unified viewing keys bundle keys for each pool
- Rule: A unified full or incoming viewing key bundles the keys for each pool into one.
- Source says: "A Unified Full Viewing Key combines multiple Full Viewing Key (and optionally Metadata) Items." / "A Unified Incoming Viewing Key combines multiple Incoming Viewing Key (and optionally Metadata) Items." (https://zips.z.cash/zip-0316)
- Status: Final (Rev 0 Active)
- Game must show: one glass key works for all rivers you use.
- Game must NOT: require a separate key per pool for the player.

### R2-30 Selective disclosure: you choose who sees
- Rule: You can share a viewing key with one person; they see your shielded data, others still don't.
- Source says: "A user may share a viewing key or payment disclosure with any third party, allowing them to access shielded data while maintaining privacy from others." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html "Selective disclosure")
- Status: Final
- Game must show: handing the glass key to the auditor only; hunters still see nothing.
- Game must NOT: imply sharing a viewing key makes your payments public to everyone.

## Memos

### R2-31 Encrypted memo: 512 bytes on every shielded note
- Rule: Every shielded payment carries a private 512-byte message slot.
- Source says: "A note plaintext also includes a 512-byte memo field associated with this note." (https://zips.z.cash/protocol/protocol.pdf §3.2.1) and "It is always present in every encrypted payment, and is always exactly 512 bytes long." (https://zcash.readthedocs.io/en/latest/rtd_pages/memos.html)
- Status: Final
- Game must show: a note slip inside the sealed box, short (about a text message).
- Game must NOT: let a memo be long, or appear on a land (transparent) payment.

### R2-32 Who can read a memo
- Rule: The memo is an encrypted field visible to the recipient. The sender, the receiver, or someone who imported either one's viewing key can list it with zcash-cli.
- Source says: "So we implemented an additional field that is visible to the recipient of a payment, called the “encrypted memo field”." and "The sender, receiver, or someone who has imported the sender or receiver’s viewing key may use z_listreceivedbyaddress:" (https://zcash.readthedocs.io/en/latest/rtd_pages/memos.html)
- Status: Final
- Game must show: hunters see the sealed box, never the slip; the auditor with the glass key can read it.
- Game must NOT: say "only you" can read it (the sender can too).

## UNSOURCED (not a rule yet)
- "Turnstile" as the name for R2-15: the word does not appear in ZIP 209 (fetched). Searched ZIP 209 and ZIP 258. The mechanism is sourced; the word is not.
- "Memos exist only on shielded payments": memos.html says "every encrypted payment" and the spec puts the memo in the note plaintext, which implies shielded-only, but neither page states it outright. R2-31's "Game must NOT" relies on this inference.
- "Incoming viewing key shows ONLY incoming, never outgoing": implied by the spec contrasting the full viewing key ("both incoming and outgoing") and §4.20.2/§4.20.3 splitting incoming vs outgoing decryption; no single sentence says "IVK cannot see outgoing". Searched spec §1.2, §3.1, §4.20, ZIP 310, ZIP 316.
- "A shared viewing key cannot be revoked": no primary sentence found (glossary, ZIP 310, ZIP 316 searched).
- "Sapling stays open after NU6.3": only zecstats (live label "open"); ZIP 258 has no Sapling rule. Kept as live-number in R2-07.

# Zcash Rule Book, Section 3: Privacy in practice (R3-xx)

All sources fetched 2026-10-24 (curl of the live page, text stripped, quotes copied from that text).
Status codes: ZIP 315 = Draft, ZIP 307 = Draft, ZIP 317 Rev 0 = Active, ZIP 320 = Active, ZIP 321 = Active, ZIP 316 Rev 0 = Active.
The readthedocs pages (glossary, wallet threat model, light client) are documentation, not ZIPs: marked "Final" here as "published doc", not as a consensus rule.
Words in caps (SHOULD, MUST) come from the ZIPs: SHOULD = strong advice for wallets, not a law of the chain.

## A. Keep funds shielded (ZIP 315)

### R3-01 STAY SHIELDED, DON'T CROSS
- Rule: The best practice is to keep your coins inside the shielded pool for the long term, not pass through it.
- Source says: "It is RECOMMENDED that wallets only hold funds as shielded in the long term" (https://zips.z.cash/zip-0315 Specification > Long-term storage of funds)
- Status: Draft
- Game must show: the river (shielded pool) is a place you can LIVE in: hold coins, receive and pay while staying in the water (see R3-03).
- Game must NOT: make the river a strip you must cross to reach the other bank, like a mixer you go in and out of.

### R3-02 AUTO-SHIELDING
- Rule: A good wallet moves public coins into the shielded pool by itself, and you can switch that off.
- Source says: "if a wallet supports receiving transparent funds ... then it SHOULD auto-shield such funds by default." / "Wallet users MUST be able to disable auto-shielding functionality offered by a wallet." (https://zips.z.cash/zip-0315 Long-term storage of funds; Auto-shielding)
- Status: Draft
- Game must show: coins that land on the public bank get carried into the river by the wallet (a shield cache that fills on its own), with a toggle.
- Game must NOT: suggest shielding is always a manual dash the player has to remember.

### R3-03 PAYING INSIDE THE SHIELD (z to z)
- Rule: A payment between two shielded addresses hides both addresses, the amount and the memo.
- Source says: "A shielded transaction is a transaction exclusively between shielded addresses. The addresses, value and optional encrypted memo are shielded using zk-SNARK cryptography before the transaction is recorded in the blockchain." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html "Shielded transaction")
- Status: Final (published doc)
- Game must show: a pay post IN the river; paying there leaves no footprints and no red link line.
- Game must NOT: force the player to climb out onto the bank to pay someone who also has a shielded address.

### R3-04 MIXED PAYMENTS ONLY HIDE THE SHIELDED SIDE
- Rule: When a payment touches a public address, only the shielded part is hidden; the public part shows.
- Source says: "A transaction consisting of both shielded addresses and transparent addresses only protects the data associated with the shielded address." (https://zcash.readthedocs.io/en/latest/rtd_pages/glossary.html "Shielded address")
- Status: Final (published doc)
- Game must show: stepping into or out of the river leaves footprints on the bank side only.
- Game must NOT: show the bank-side end of a shielding or unshielding as hidden.

### R3-05 SHIELDING IS LINKED TO THE PUBLIC ADDRESS IT CAME FROM
- Rule: Moving coins into the shield always shows which public address they came from.
- Source says: "A shielding transaction is always linked to the transparent addresses it spends from." (https://zips.z.cash/zip-0315 Long-term storage of funds)
- Status: Draft
- Game must show: footprints lead from the public address to the water's edge where you entered.
- Game must NOT: suggest that jumping into the river wipes the trail that led to it.

### R3-06 AMOUNTS CROSSING POOLS ARE PUBLIC
- Rule: The amount moved between the public side and a shielded pool is visible on the chain.
- Source says: "Public value balances: Together with the transparent inputs and outputs, these determine the fee and the amount being transferred between pools." (https://zips.z.cash/zip-0315 Kinds of information leakage)
- Status: Draft
- Game must show: a stamp/number at the water's edge showing how much went in or came out.
- Game must NOT: hide the amount at the moment of shielding or unshielding.

### R3-07 DON'T SHIELD FROM TWO PUBLIC ADDRESSES AT ONCE
- Rule: Shielding coins from two public addresses in one go tells everyone both addresses are yours.
- Source says: "if the inputs to the transaction are associated with multiple transparent addresses, those addresses will be linked to each other" (https://zips.z.cash/zip-0315 Long-term storage of funds)
- Status: Draft
- Game must show: carrying coins from two public addresses into the river together draws a red link line between them.
- Game must NOT: treat a combined shielding as safe because it ends in the river.

### R3-08 SPACE OUT SEPARATE SHIELDINGS
- Rule: Shield coins from different public addresses separately, and not at matching times.
- Source says: "UTXOs received on different transparent receivers SHOULD NOT be shielded in the same transaction. Ideally, when they are shielded in separate transactions, this should be done in such a way that the timing of those transactions is not linkable." (https://zips.z.cash/zip-0315 Linkability of transactions or addresses)
- Status: Draft
- Game must show: the clock; two shieldings back to back draw a TOO FAST link.
- Game must NOT: imply any specific safe waiting time (the ZIP lists timing as an open question, see UNSOURCED).

### R3-09 NO "SHIELD WHILE PAYING"
- Rule: A wallet should not shield old public coins as part of a payment you make to someone.
- Source says: "In particular, issue b) motivates ruling out the use of "opportunistic shielding", i.e. shielding previously received transparent funds as part of a user-initiated transaction." (https://zips.z.cash/zip-0315 Long-term storage of funds)
- Status: Draft
- Game must show: shielding and paying are two separate actions.
- Game must NOT: show a single move that grabs bank coins and pays a merchant in one step as the good choice.

### R3-10 THE RECEIVER SEES THE LINK TO YOUR PUBLIC ADDRESS
- Rule: If you pay someone with coins straight from a public address, they can see that address.
- Source says: "a link between the input transparent address(es) and the payment will be visible to the recipient(s), or to any other holder of an Incoming Viewing Key for the destination address(es)." (https://zips.z.cash/zip-0315 Long-term storage of funds)
- Status: Draft
- Game must show: the merchant NPC can trace your bank footprints back when you pay from the bank.
- Game must NOT: imply the receiver learns nothing just because the payment arrived in the river.

### R3-11 PUBLIC COINS TO STRANGERS NEED YOUR OK EACH TIME
- Rule: A good wallet asks you every single time before paying someone else from a public address.
- Source says: "Wallets SHOULD NOT spend funds from a transparent address in a transaction with an external recipient, unless the user gives explicit consent for this on a per-transaction basis." (https://zips.z.cash/zip-0315 Allowed transfers)
- Status: Draft
- Game must show: paying from the bank triggers a "this is public, sure?" prompt at the pay post.
- Game must NOT: let a bank payment go through silently.

### R3-12 LEAVING TO A PUBLIC ADDRESS: ONLY FROM THE SHIELD
- Rule: Sending to a public address should only use shielded coins, ideally from one pool.
- Source says: "A wallet MUST NOT send funds to a transparent address unless all of the source funds come from shielded pools, and this SHOULD be a single shielded pool." (https://zips.z.cash/zip-0315 Linkability of transactions or addresses)
- Status: Draft
- Game must show: an unshield exits from the river; a public payment never mixes bank coins and river coins.
- Game must NOT: show a payment that combines bank coins with river coins.

### R3-13 DON'T MIX POOLS TO PAY
- Rule: A wallet must not automatically combine coins from different pools to cover one payment.
- Source says: "Wallets MUST NOT automatically combine funds across pools to satisfy a transfer (since that could reveal the total funds the user holds in some pool)." (https://zips.z.cash/zip-0315 Information leakage for transfers between pools)
- Status: Draft
- Game must show: if the game has more than one river (pools), a payment draws from one.
- Game must NOT: show pool-crossing as free of leaks.

### R3-14 PUBLICLY REVEALING AN AMOUNT NEEDS YOUR OK
- Rule: Any move that shows an amount publicly should ask you first, every time.
- Source says: "there should be per-transaction opt-in for any transfer that publically reveals amounts on chain." (https://zips.z.cash/zip-0315 Information leakage for transfers between pools)
- Status: Draft
- Game must show: an unshield step shows the amount and asks the player to confirm.
- Game must NOT: auto-reveal amounts without a choice.

### R3-15 CONSENT TO EVERY LEAK
- Rule: Your wallet should tell you what a payment reveals, and you agree before it is sent.
- Source says: "users must explicitly consent to each instance of information being revealed by the wallet in a transaction." (https://zips.z.cash/zip-0315 User consent)
- Status: Draft
- Game must show: before a leaky action, a short "this shows: who / how much / when" card.
- Game must NOT: punish the player for a leak the game never told them about.

### R3-16 SOME LEAKS CAN'T BE TAKEN BACK
- Rule: Some choices, like sharing your keys, can't be undone once made.
- Source says: "Some varieties of consent may not be revocable, for example if a user chooses to share some of their keys." (https://zips.z.cash/zip-0315 User consent)
- Status: Draft
- Game must show: handing out the glass key is permanent; no "take it back" button.
- Game must NOT: let the player recall a shared key.

### R3-17 BIGGER CROWD, BETTER HIDING
- Rule: Following these habits keeps the crowd of shielded coins large, which protects everyone.
- Source says: "Following all of the recommendations in this section improves both collective privacy and the user's individual privacy, by maximizing the size of the note anonymity set over time" (https://zips.z.cash/zip-0315 Long-term storage of funds)
- Status: Draft
- Game must show: the crowd in the river grows when players stay shielded; the player's own good habits add to it.
- Game must NOT: define the crowd as "only the people leaving at the same moment" (the source ties it to notes over time; see UNSOURCED for the exact definition).

### R3-18 NEW ADDRESSES THAT CAN'T BE TIED TOGETHER
- Rule: You can give different shielded addresses to different people, and they can't tell they're all yours.
- Source says: "a user can give different addresses to different counterparties, in such a way that the counterparties (even if they collude) cannot tell that the addresses were provided by the same or distinct users." (https://zips.z.cash/zip-0315 Motivation for choices reducing linkability)
- Status: Draft
- Game must show: a fresh shielded address per payer; payers comparing notes still draw no link line.
- Game must NOT: imply a new PUBLIC address gives the same protection (see R3-19).

### R3-19 A PUBLIC PART BREAKS THE UNLINKABILITY
- Rule: If your fresh addresses include a public part, watchers can still link them through the chain.
- Source says: "This is only partially achieved if the UA contains a Transparent P2PKH Address, since the on-chain transaction graph can potentially be used to link transparent addresses." (https://zips.z.cash/zip-0316 Deriving a Unified Address from a UIVK)
- Status: Final (ZIP 316 Rev 0 Active)
- Game must show: an address with a bank (public) part leaves footprints a hunter can join up.
- Game must NOT: show address rotation with a public part as fully safe.

### R3-20 DUSTING
- Rule: An attacker can send you lots of tiny coins so your later spends stand out and can be spotted.
- Source says: "For example in a “dusting attack”, the adversary sends a victim lots of small-valued notes (or notes with strategically chosen values), increasing the probability that the victim’s transactions will have a larger number of spends than other transactions" (https://zips.z.cash/zip-0315 Kinds of information leakage)
- Status: Draft
- Game must show: a hunter tossing many tiny coins at the player; spending them all at once makes the player glow in the crowd.
- Game must NOT: claim wallets already defend against this (the ZIP says mitigations "have not been implemented yet").

### R3-21 DUSTING LETS A SENDER SEE WHEN YOU SPEND
- Rule: Someone who dusted you can tell when you spend those coins, even in the shield.
- Source says: "tell when the user spends shielded funds sent to them by the adversary. dust attack: the adversary can send many low-value notes, which will be spent in a transaction with many Sapling inputs (visible on the blockchain)." (https://zcash.readthedocs.io/en/latest/rtd_pages/wallet_threat_model.html Address-Knowing Adversary)
- Status: Final (published doc)
- Game must show: same as R3-20.
- Game must NOT: say "inside the river nothing about you is visible, ever."

### R3-22 SHIELDED PAYMENTS STILL SHOW SOME SHAPE
- Rule: Even a fully shielded payment shows its version, expiry and how many inputs and outputs it has.
- Source says: "Numbers of JoinSplits, Spends, Outputs, and Actions: This could correlate with other information under certain circumstances." Same list: "Transaction version (v4, v5, or v6, as of NU6.3)" and "Expiry height and anchor position" (https://zips.z.cash/zip-0315 Kinds of information leakage)
- Status: Draft
- Game must show: ripples on the water (a payment happened, roughly how big) without names or amounts.
- Game must NOT: show a shielded payment as completely invisible.

### R3-23 CHANGE AND SMALL COINS: WALLET SHOWS SPENDABLE vs PENDING
- Rule: A good wallet shows what you can spend now separately from coins still waiting for confirmations.
- Source says: "Wallets SHOULD report: Confirmed-spendable balance. Pending balance, or total balance." (https://zips.z.cash/zip-0315 Reporting of balances)
- Status: Draft
- Game must show: pouch shows "ready" and "waiting" coins; recommended waits are 3 confirmations (your own coins) and 10 (others').
- Game must NOT: let freshly received coins be spent instantly with no waiting state.
- Extra source: "10 confirmations, for untrusted TXOs; 3 confirmations, for trusted TXOs." (same ZIP, Trusted and untrusted TXOs)

### R3-24 SEED PHRASE IS 24 WORDS
- Rule: A new Zcash wallet seed written as words must be 24 words long.
- Source says: "if using a BIP 39 mnemonic, a 24-word mnemonic will be needed" / "MAY accept BIP 39 mnemonics of fewer than 24 words ... when restoring a wallet (but as specified above, MUST NOT generate them)." (https://zips.z.cash/zip-0315 Wallet seeds)
- Status: Draft
- Game must show: a 24-word notepad at level 0.
- Game must NOT: show a 12-word seed for a new wallet (today's level 0 does).

## B. Network privacy (IP)

### R3-25 YOUR IP CAN GIVE YOU AWAY
- Rule: Whoever watches your internet connection can learn who and where you are from your IP address.
- Source says: "tell who the user is. The adversary knows the user's IP address, which could lead them to the user's real identity. tell where the user is." (https://zcash.readthedocs.io/en/latest/rtd_pages/wallet_threat_model.html Network- and Lightwalletd-Surveiling Adjacent-App Adversary)
- Status: Final (published doc)
- Game must show: a lantern hunter at the network edge who sees the player's lantern/light (where they connect from), not their coins.
- Game must NOT: imply shielding hides who you are on the network.

### R3-26 TOR-STYLE NETWORK PRIVACY IS AN EXTRA ASSUMPTION
- Rule: The light wallet design only stops the server linking your visits if you also hide your network (like Tor).
- Source says: "If we further assume network privacy (via Tor or similar), the proxy should not be able to link different connections or queries as deriving from the the same wallet." (https://zips.z.cash/zip-0307 Security Model)
- Status: Draft
- Game must show: a cloak or hidden path that hides the player's lantern from the server watcher.
- Game must NOT: say Zcash itself hides your IP.

## C. Light wallets (ZIP 307, lightwalletd)

### R3-27 WHAT A LIGHT WALLET IS
- Rule: A phone wallet doesn't keep the whole chain; it asks a server for a slimmed-down copy.
- Source says: "Light client: A client that is not a full participant in the network of Zcash peers. It can send and receive payments, but does not store or validate a copy of the block chain." (https://zips.z.cash/zip-0307 Terminology). The "server" and "slimmed-down copy" parts rest on R3-28 ("A stateless server that serves light clients with blockchain information. It fetches blockchain data from zcashd, processes them to reduce data, and stores it in a database.") and R3-29 ("A compact block is a packaging of ONLY the data from a block needed to: ...").
- Status: Draft
- Game must show: the wallet gets a stream of pages from a server post (lightwalletd), not the whole book.
- Game must NOT: show the phone wallet checking every rule itself like a full node.

### R3-28 LIGHTWALLETD
- Rule: Lightwalletd is the server that hands light wallets compact blockchain data.
- Source says: "A stateless server that serves light clients with blockchain information. It fetches blockchain data from zcashd, processes them to reduce data, and stores it in a database." (https://zcash.readthedocs.io/en/latest/rtd_pages/lightclient_support.html Lightwalletd)
- Status: Final (published doc)
- Game must show: one server NPC everyone in the village syncs from.
- Game must NOT: show the server as part of the blockchain itself.

### R3-29 COMPACT BLOCKS
- Rule: A compact block carries only what you need to spot your payments and spends, not memos.
- Source says: "A compact block is a packaging of ONLY the data from a block needed to: Detect a payment to your shielded Sapling address; Detect a spend of your shielded Sapling notes; Update your witnesses" and "for the moment we propose ignoring the memo field during payment detection." (https://zips.z.cash/zip-0307 Compact Stream Format)
- Status: Draft
- Game must show: the server hands everyone the SAME trimmed pages.
- Game must NOT: show the server sending each player only their own payments.

### R3-30 TRIAL DECRYPTION
- Rule: Your wallet tries to unlock every payment with your key; the ones that open are yours.
- Source says: "For every CompactOutput in the CompactBlock, the light client can trial-decrypt it against a set of Sapling incoming viewing keys." (https://zips.z.cash/zip-0307 Scanning for relevant transactions)
- Status: Draft
- Game must show: the player tries their key on every sealed box in the pile; only theirs open (level 11).
- Game must NOT: show the server picking out "your" boxes for you.

### R3-31 SYNCING ALONE DOESN'T TELL THE SERVER WHICH ARE YOURS
- Rule: Because everyone downloads the same blocks, the download itself doesn't reveal which payments are yours.
- Source says: "As synchronisation happens via a broadcast medium, it leaks no information about which transactions the light client is interested in." (https://zips.z.cash/zip-0307 Transaction privacy)
- Status: Draft
- Game must show: everyone gets the same pile from the server post.
- Game must NOT: stop here: see R3-32 and R3-33 for what DOES leak.

### R3-32 FETCHING A FULL PAYMENT (MEMO) LEAKS
- Rule: When your wallet fetches a full payment, for example to read a memo, the server can learn about it.
- Source says: "it will need to download the full transaction. The light client SHOULD obscure the exact transactions of interest by downloading numerous uninteresting transactions as well ... It MUST convey to the user that fetching full transactions will reduce their privacy." (https://zips.z.cash/zip-0307 Transaction privacy)
- Status: Draft
- Game must show: asking the server for one specific box makes the server notice; grabbing many boxes hides which one you wanted.
- Game must NOT: say "the server never learns anything" (today's level 11 lesson says "server never learns which are yours").

### R3-33 WHAT A WATCHER OF YOUR CONNECTION CAN STILL LEARN
- Rule: Someone watching your wallet's traffic can tell when you send or receive, even fully shielded.
- Source says: "tell that and when the user received a fully-shielded transaction. The wallet fetches the memo from lightwalletd separately, which uses more bandwidth, and that is visible even though the connection is encrypted." and "tell that and when the user sends a fully-shielded transaction." (https://zcash.readthedocs.io/en/latest/rtd_pages/wallet_threat_model.html Network- and Lightwalletd-Surveiling Adjacent-App Adversary)
- Status: Final (published doc)
- Game must show: the network-edge lantern hunter sees the player's lantern flicker when they get or send a payment, but not what or with whom.
- Game must NOT: show shielded payments as unobservable to someone watching the player's own connection.

### R3-34 THE SERVER CAN'T SEE YOUR SHIELDED BALANCE OR AMOUNTS
- Rule: Even a bad server can't see your shielded balance, or the amounts and memos you send and get.
- Source says: "can't tell what the user's current shielded balance is" / "can't learn information about the value, memo field, etc. of shielded transactions the user receives." (https://zcash.readthedocs.io/en/latest/rtd_pages/wallet_threat_model.html Lightwalletd-Compromising Adversary)
- Status: Final (published doc)
- Game must show: the server NPC sees boxes go by but never what's inside.
- Game must NOT: show the server reading box contents.

### R3-35 A BAD SERVER CAN LIE ABOUT YOUR BALANCE
- Rule: A dishonest server can't steal coins, but it can hide payments or fake extra ones in your view.
- Source says: "They can repeat a transaction to the user’s wallet many times to cause the wallet to think it has more balance than it can actually spend." / "make the user think their balance is lower than it actually is. They can omit transactions destined to user" / "can't steal the user's funds." (https://zcash.readthedocs.io/en/latest/rtd_pages/wallet_threat_model.html Lightwalletd-Compromising Adversary)
- Status: Final (published doc)
- Game must show: (optional) a crooked server post that hides a box from the pile; coins stay safe.
- Game must NOT: show the server able to take coins.

### R3-36 SYNC START HEIGHT CAN LEAK
- Rule: At the start of each sync, the server learns the block height your wallet last synced to.
- Source says: (section headed "This section describes a proposed enhancement that has not been implemented.") "The above interaction reveals to the server at the start of each synchronisation phase (B and D) the block height which the light client had previously synchronised to. This is an information leak" (https://zips.z.cash/zip-0307 Block privacy via bucketing)
- Status: Draft (ZIP 307); the bucketing fix in this section is a proposal, not implemented
- Game must show: nothing required; optional detail for the server NPC ("you last came by at page 3,400,000").
- Game must NOT: claim the bucketing fix is live (it is a proposal; the ZIP says it "has not been implemented"), or say the sync height reveals when the wallet was made.

## D. Payment request links (ZIP 321)

### R3-37 A PAYMENT LINK OR QR CARRIES ADDRESS, AMOUNT, MEMO
- Rule: A Zcash payment link or QR fills in who to pay, how much and an optional memo for you.
- Source says: "Wallets that recognize this format enable users to construct transactions simply by clicking links on webpages or scanning QR codes." / "one or more tuples of payment address, amount, asset (if applicable), and optional memo." (https://zips.z.cash/zip-0321 Abstract; Requirements)
- Status: Final (Active)
- Game must show: scanning a sign at the pay post fills in address, amount and memo; the player only approves.
- Game must NOT: show the link sending money by itself.

### R3-38 YOU STILL APPROVE
- Rule: The link prepares the payment; you still have to approve it.
- Source says: "human intervention is required only for approval, not creation, of such a transaction." (https://zips.z.cash/zip-0321 Motivation)
- Status: Final (Active)
- Game must show: after scanning, a confirm screen with the details (and the label shown apart from the address).
- Game must NOT: auto-pay on scan.

### R3-39 ONE LINK CAN PAY SEVERAL PEOPLE
- Rule: One payment link can ask for payments to several addresses in a single transaction.
- Source says: "Implementations SHOULD construct a single transaction that pays all of the specified instances of zcashaddress." (https://zips.z.cash/zip-0321 URI Semantics)
- Status: Final (Active)
- Game must show: (optional) a sign with two recipients paid in one go.
- Game must NOT: say a link holds only one recipient.

### R3-40 NO MEMO TO A PUBLIC ADDRESS
- Rule: A link that puts a memo on a public address is invalid; memos only travel to shielded addresses.
- Source says: "Parsers MUST consider the entire URI invalid if the address associated with the same paramindex does not permit the use of memos (i.e. it is a transparent address)." (https://zips.z.cash/zip-0321 Query Keys > memo)
- Status: Final (Active)
- Game must show: a memo on a sign pointing to the bank is rejected as broken.
- Game must NOT: show a memo attached to a public payment.

### R3-41 THE LINK FORMAT
- Rule: A Zcash payment link starts with "zcash:", and memos are at most 512 bytes.
- Source says: "zcashurn = "zcash:" ( zcashaddress [ "?" zcashparams ] / "?" zcashparams )" / "The decoded memo contents MUST NOT exceed 512 bytes" (https://zips.z.cash/zip-0321 URI Syntax; Query Keys)
- Status: Final (Active)
- Game must show: if a link is shown as text, it begins "zcash:".
- Game must NOT: show a link with a made-up prefix.

## E. TEX addresses and exchanges (ZIP 320)

### R3-42 TEX ADDRESS = "PUBLIC COINS ONLY"
- Rule: A TEX address (starts "tex1") only accepts coins sent from public addresses, never straight from the shield.
- Source says: "Wallets and other Senders sending to a TEX address (as any output) MUST ensure that only transparent (P2SH or P2PKH) UTXOs are spent in the creation of the transaction." (https://zips.z.cash/zip-0320 Specification). Prefix: encoded "with the human-readable prefix (HRP) "tex"" (ZIP 320); Bech32m puts "the "1" separator" after the HRP (ZIP 316), hence "tex1".
- Status: Final (Active)
- Game must show: an exchange desk with a "tex" sign that accepts only bank coins.
- Game must NOT: show river coins going straight into a TEX desk.

### R3-43 WHY TEX EXISTS
- Rule: TEX was made because an exchange wanted to see where deposits came from, so it could send them back.
- Source says: "The Binance cryptocurrency exchange requires that funds sent to their deposit addresses come from source addresses that are readily identifiable using on-chain information, such that if necessary funds may be rejected by sending them back" (https://zips.z.cash/zip-0320 Motivation)
- Status: Final (Active)
- Game must show: the exchange desk can bounce coins back to the bank address they came from.
- Game must NOT: name other exchanges as using TEX (the ZIP says others are not expected to unless they need it).

### R3-44 PAYING A TEX FROM THE SHIELD TAKES TWO STEPS
- Rule: To pay a TEX from shielded coins, the wallet first unshields to a one-time public address, then pays.
- Source says: "a Sender supporting this ZIP MUST create two transactions: one that unshields the funds to an ephemeral transparent address, and one that spends from that ephemeral address to the destination TEX Address." (https://zips.z.cash/zip-0320 Design considerations for Senders)
- Status: Final (Active)
- Game must show: climbing out at a fresh spot on the bank, then walking to the exchange desk; that fresh spot is public.
- Game must NOT: show this as private: the unshield amount and the hop to the desk are on the public side (R3-06).

### R3-45 TEX LOOKS LIKE A NORMAL PUBLIC ADDRESS ON CHAIN
- Rule: On the chain, a payment to a TEX address looks exactly like one to a normal public address.
- Source says: "a transaction sending to a TEX Address is indistinguishable from one sending to the underlying P2PKH address." (https://zips.z.cash/zip-0320 Disadvantages)
- Status: Final (Active)
- Game must show: footprints to the TEX desk look like any bank footprints.
- Game must NOT: show a special "TEX" mark on the chain.

## F. Swaps

### R3-46 NEAR INTENTS: ZEC IS PUBLIC-ADDRESS ONLY
- Rule: The NEAR Intents swap service supports Zcash only through public (t1/t3) addresses.
- Source says: "ZCash ... Address Types: Transparent - t1 or t3 prefix ... Partially supported - Transparent addresses only" / "ZEC (Zcash, transparent only)" (https://docs.near-intents.org/resources/chain-support.md ZCash)
- Status: Live-number (2026-10-24; third-party service page, can change)
- Game must show: the swap post sits on the public bank; using it means coming out of the river, with the amount visible (R3-06).
- Game must NOT: show a swap that happens inside the river.

## G. Who runs what: node, indexer, wallet

Sources read 2026-10-26: the README.md of each project on its default branch (Zebra `main`, Zaino `dev`, Zallet `main`), and ZIP 258.

### R3-47 ZEBRA IS THE FULL NODE (ZCASH FOUNDATION)
- Rule: Zebra is a Zcash full node written in Rust by the Zcash Foundation. It checks every block and talks to other nodes over the peer-to-peer network. Since NU6.3 it is expected to be the only full validator that can follow the chain.
- Source says: "Zebra is a Zcash full node written in Rust." and "The `-p 8233:8233` flag exposes the P2P port so other Zcash nodes can connect to yours" (https://github.com/ZcashFoundation/zebra, README.md) and "It is proposed that zcashd will not implement the consensus changes for NU6.3. zebra is therefore expected to be the only full-validator implementation able to follow the consensus Zcash block chain from NU6.3 activation onward." (https://zips.z.cash/zip-0258, Implementation support; Status: Final)
- Status: project README (published doc) / Final (ZIP 258)
- Read: 2026-10-26
- Game must show: a node keeper NPC who holds the whole book and checks every page; phone wallets do not do this (R3-27).
- Game must NOT: call Zebra a wallet: "zebra does not provide a wallet" (https://zips.z.cash/zip-0317, Deployment in zebra).

### R3-48 ZAINO IS THE INDEXER THAT SERVES WALLETS
- Rule: Zaino is a Rust indexer that sits on top of a Zebra node and serves light wallets, full wallets and block explorers. It is built to cover everything lightwalletd serves today, and stay compatible with it.
- Source says: "Zaino is an indexer for the Zcash blockchain implemented in Rust." / "Zaino provides all necessary functionality for "light" clients (wallets and other applications that don't rely on the complete history of blockchain) and "full" clients / wallets and block explorers providing access to both the finalized chain and the non-finalized best chain and mempool held by a Zebra full validator." / "This API will encompass all functionality currently in the LightWallet gRPC service (CompactTxStreamer), currently served by Lightwalletd" / "Zaino is designed (where possible) to maintain backward compatibility with Lightwalletd and the legacy Zcash full node." (https://github.com/zingolabs/zaino, README.md)
- Status: project README (published doc)
- Read: 2026-10-26
- Game must show: the server post wallets sync from (R3-28 to R3-36) can be named Zaino, standing next to the Zebra node keeper.
- Game must NOT: say the README states Zaino "replaces" lightwalletd: it says it will "encompass all functionality" and stay backward compatible. Do not show Zaino checking consensus rules: the README puts that in "the Validator (Zebra)".

### R3-49 ZALLET IS THE FULL-NODE WALLET REPLACING THE ZCASHD WALLET (BETA)
- Rule: Zallet is a Rust wallet that works with a full node, built to replace the old zcashd wallet. It is in beta.
- Source says: "Zallet is a full-node Zcash wallet written in Rust. It is being built as a replacement for the `zcashd` wallet." / "Zallet is currently in beta." / "Breaking changes may occur at any time, requiring you to delete and recreate your Zallet wallet." (https://github.com/zcash/zallet, README.md; https://github.com/zcash/wallet redirects there, HTTP 301)
- Status: project README (published doc); beta
- Read: 2026-10-26
- Game must show: if named, Zallet is the desktop/server wallet that sits beside a node, not the phone wallet.
- Game must NOT: call Zallet finished or stable, or a light (phone) wallet.

### R3-50 ZCASHD DOES NOT FOLLOW THE CHAIN AFTER NU6.3
- Rule: The old zcashd node was not upgraded for NU6.3, so from that upgrade on it cannot follow the main chain.
- Source says: "It is proposed that zcashd will not implement the consensus changes for NU6.3." (https://zips.z.cash/zip-0258, Implementation support; Status: Final)
- Status: Final
- Read: 2026-10-26
- Game must show: nothing required. If old software appears, it is the legacy node that was retired.
- Game must NOT: show zcashd as today's node. Finding: R3-28 quotes lightwalletd fetching "from zcashd"; that quote is a true copy of the doc but describes the older setup. Cards about today's server should use R3-48 (Zaino on Zebra).

## H. ZIPs: how Zcash rules are written

Sources read 2026-10-26 from zips.z.cash.

### R3-51 A ZIP IS A ZCASH IMPROVEMENT PROPOSAL
- Rule: A ZIP is a design document that describes a new Zcash feature or process, with a technical spec and the reasons for it.
- Source says: "A Zcash Improvement Proposal (ZIP) is a design document providing information to the Zcash community, or describing a new feature for Zcash or its processes or environment. The ZIP should provide a concise technical specification of the feature and a rationale for the feature." (https://zips.z.cash/zip-0000)
- Status: ZIP 0 (Process)
- Read: 2026-10-26
- Game must show: a ZIP notice board where a proposal is posted, discussed and then adopted.
- Game must NOT: present a ZIP as law just because it has a number: its Status says how far it got (R3-52).

### R3-52 A ZIP'S STATUS SAYS WHETHER IT IS LIVE
- Rule: New ZIPs start as Draft. Proposed means there is rough consensus. Final means a consensus ZIP is built and switched on in the network.
- Source says: "Draft: All initial ZIP submissions have this status." / "Proposed: Typically the stage after Draft, added to a ZIP after consideration, feedback, and rough consensus from the community." / "Final: When a Consensus or Standards ZIP is both implemented and activated on the Zcash network." / "Active: Typically only used for Process or Informational ZIPs, achieved once rough consensus on a Proposed ZIP is reached in PR/forum posts." (https://zips.z.cash/zip-0000, ZIP Status Field)
- Status: ZIP 0 (Process)
- Read: 2026-10-26
- Game must show: a status stamp on every ZIP notice (Draft, Proposed, Final).
- Game must NOT: call a Draft ZIP (for example ZIP 318, R2-05) a rule everyone must follow.

### R3-53 ZIP 2005 IS IRONWOOD QUANTUM RECOVERABILITY, NOT THE MIGRATION
- Rule: ZIP 2005 exists, but it changes how Ironwood notes are built so Zcash can move more smoothly to quantum-safe versions later. It is not the Orchard to Ironwood migration. The migration is ZIP 318 (Draft, wallet best practice, R2-05); the upgrade that seals Orchard and opens Ironwood is ZIP 258 (Final, R1-26, R2-02, R2-03).
- Source says: "ZIP: 2005 Title: Ironwood Quantum Recoverability ... Status: Proposed Category: Consensus" and "This ZIP proposes a change to the construction of notes, to be deployed for the Ironwood pool, designed to improve Zcash’s long-term resilience against a significant potential threat to its security from quantum computers. It does not by itself make the protocol secure against quantum adversaries, but is intended to support a smoother transition to future versions of Zcash designed to be so." (https://zips.z.cash/zip-2005, header / Abstract) and "ZIP 2005 activates at NU6.3 on each network. The Ironwood pool is created at NU6.3 activation; from that point onward, every Ironwood-pool output note uses the quantum-recoverable note plaintext format (lead byte 0x03) defined in ZIP 2005." (https://zips.z.cash/zip-0258, ZIP 2005 activation) and "ZIP: 318 Title: Orchard to Ironwood Migration ... Status: Draft Category: Wallet" (https://zips.z.cash/zip-0318)
- Status: Proposed (ZIP 2005 header) but activated at NU6.3 per ZIP 258 (Final). ZIP 318: Draft.
- Read: 2026-10-26
- Game must show: an Orchard to Ironwood migration level cites ZIP 318 for how wallets move coins and ZIP 258 for why Orchard is closed. ZIP 2005 can appear only as "Ironwood notes are built to be quantum-recoverable".
- Game must NOT: label the migration notice "ZIP 2005", or say ZIP 2005 makes Zcash quantum-secure (its Abstract says it "does not by itself" do that).

## UNSOURCED (not a rule yet)

- "Anonymity set = all notes in the pool." ZIP 315 uses the phrase "note anonymity set" without defining it. Searched: ZIP 315 full text, ZIP 307, glossary.html, wallet_threat_model.html. Not found as a definition.
- "Unshielding the same amount you shielded links the two." Common knowledge. ZIP 315 only says cross-pool amounts are public (R3-06) and asks for consent. No sentence states the matching attack. Searched ZIP 315, glossary, wallet threat model.
- "Wait X minutes / blocks before unshielding." ZIP 315 lists it as open: "How should wallet developers time transactions to avoid linkability?" No safe number exists in the sources.
- "Leave the pool together with a crowd." No primary sentence. Only R3-08 (timing not linkable) and R3-17 (anonymity set) support the idea indirectly.
- Network-layer privacy in wallets: ZIP 315 has a "Network-layer privacy" heading with no text under it. Tor only appears as an assumption in ZIP 307 (R3-26). No source says any wallet uses Tor by default.
- Zodl/Zashi rotating addresses automatically: not checked in a primary source today (github.com/zodl-inc not read).
- Exchanges beyond Binance/TEX: no primary source read on how other exchanges handle shielded deposits.
- Auto-shielding being time-triggered, not receipt-triggered: this appears in ZIP 315 only under "str4d notes" (draft working notes), not the main specification, so not made a rule.
- ZIP 317 fee rules: ZIP 317 was fetched (Rev 0 Active, Rev 1 NU6.3 Draft) but not turned into rules here; fees likely belong to another section.
