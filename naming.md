# Naming — Replacement for `kidd`

> **Status update (2026-06-03):**
>
> - ✅ **`maltty@0.0.0` RESERVED on npm** — locked in, owned by Zac
> - ❌ **`peatty` BLOCKED FOREVER** by npm typo-squat filter (too similar to `pretty`). Only scoped `@thebytefarm/peatty` is publishable, which violates the unscoped-import goal.
>
> **Important:** `npm view <name>` returning 404 only means the name is unregistered. npm's typo-squat algorithm separately blocks names too similar to popular packages. The only way to know if a name will be blocked is to actually attempt publish. **Likely-at-risk names from this list:** `gristty` (vs `gritty`), `mashify`/`maltify` (vs `magnify`/`amplify`), `stoutty`, `peatty` (confirmed blocked). **Likely-safe names:** longer unique compounds like `mashbill`, `threshargs`, `cornmash`, `mashtun`, `bondhouse`.

All names below are **verified `npm view` returns E404** at time of writing. Theme: **corn / barley / rye / whiskey** to pair with `thebytefarm` org.

Constraints:

- Easy to pronounce on first read
- 1-3 syllables, ideally 2
- Works in "Hey, do you use **X**?" like react/vite/bun
- No moniker collisions (no `husky`/`silky`/`rye`-Python/`bourbon`-CSS/`kilner`-jar conflicts)
- Brand-buildable

---

## 🏆 Top contenders (committed shortlist)

### 🥇 `mashbill`

- **Pronounced:** MASH-bill
- **What it is:** The whiskey grain recipe — e.g. bourbon is 51%+ corn
- **Metaphor:** Your CLI's mash bill = the recipe of commands/config that defines your tool
- **Strength:** UNIQUE in dev space, perfect metaphor, brand-buildable visuals (recipe cards, percentages, copper stills)

### 🥇 `threshargs`

- **Pronounced:** THRESH-args
- **What it is:** Threshing (separating grain from chaff) + args
- **Metaphor:** **PERFECT** — threshing IS parsing. A thresher mechanically separates wheat (real data) from chaff (noise/extras), which is exactly what argv parsing does.
- **Strength:** Best metaphor of any args-lineage candidate, yargs heritage clear, 2 syllables

### 🥈 `mashargs`

- **Pronounced:** MASH-args
- **What it is:** Mash + args (yargs lineage)
- **Metaphor:** Mash raw grain into spirit = mash raw argv into commands
- **Strength:** 2 clean syllables, direct yargs heritage, distillation metaphor

### 🥉 `maltify`

- **Pronounced:** MALT-i-fy
- **What it is:** Malt + Spotify/Shopify pattern
- **Metaphor:** "Maltify your CLI" — transform raw args into structured commands
- **Strength:** Modern SaaS brand sound, verb-able

### 🏅 `threshify`

- **Pronounced:** THRESH-i-fy
- **What it is:** Thresh + Spotify pattern
- **Metaphor:** Same perfect metaphor as threshargs but in -ify form
- **Strength:** Modern SaaS brand sound + strongest metaphor; could pair as sibling to maltify

### 🏅 `winnowify`

- **Pronounced:** WIN-no-wi-fy
- **What it is:** Winnow (separate wheat from chaff in the wind) + Spotify pattern
- **Metaphor:** Winnowing = filtering. Perfect for the filter/transform phase of CLI argv.
- **Strength:** Distinctive 4-syllable brand, beautiful filter metaphor

### 🏅 `mashify`

- **Pronounced:** MASH-i-fy
- **What it is:** Mash + Spotify pattern
- **Metaphor:** Same as maltify but mash-focused; mashing grain = parsing args
- **Strength:** Same Spotify lineage, slightly punchier than maltify

### 🏅 `yargmash`

- **Pronounced:** YARG-mash
- **What it is:** Direct yargs riff with mash
- **Strength:** Reads exactly like yargs but masher; instant recognition as a parser

### 🏅 `yargmalt`

- **Pronounced:** YARG-malt
- **What it is:** Direct yargs riff with malt
- **Strength:** Reads exactly like yargs but maltier

### 🏆 `peaty`

- **Pronounced:** PEE-tee
- **What it is:** Real whiskey adjective (peat-smoked Scotch) + reads exactly like `citty`/`kitty`
- **Metaphor:** Whiskey character word; smoky, distinctive, established in spirits world
- **Strength:** **MAY BE THE BEST NAME ON THE LIST.** Universal pronunciation, real word (easy to remember/type), instant whiskey association, citty-pattern lineage. "Hey do you use peaty?" sounds like an established library.

### 🏆 `barnty`

- **Pronounced:** BAR-ntee (like `citty`)
- **What it is:** Direct citty-pattern transposition — `barn` + `tty`
- **Strength:** Reads as a cute brand like citty, but evokes farm immediately

### 🏅 `maltty`

- **Pronounced:** MAL-tee
- **What it is:** Malt + tty (explicit double-t to surface "tty")
- **Strength:** Brand-distinct from common adjective `malty`, while reading the same

### 🏅 `mashty`

- **Pronounced:** MASH-tee
- **What it is:** Mash + tty
- **Strength:** Pairs with maltty as siblings

### 🏅 `whisktty`

- **Pronounced:** WHIS-tee
- **What it is:** Whiskey + tty embedded
- **Strength:** Distinctive, full whiskey heritage in the name

### 🏅 `mashtun`

- **Pronounced:** MASH-tun
- **What it is:** The vessel where grain mash ferments
- **Metaphor:** The container that holds and runs your commands
- **Strength:** Distinctive industrial sound, 2 syllables

### 🏅 `feints`

- **Pronounced:** FAINTS
- **What it is:** Distillation cut — the impurity heads/tails you filter out
- **Metaphor:** Your CLI separates signal (commands) from feints (noise)
- **Strength:** 1 syllable, sharp like `bun`/`vite`/`oxc`, unknown to dev = ownable

### 🏅 `bondhouse`

- **Pronounced:** BOND-house
- **What it is:** Bonded warehouse where whiskey ages
- **Metaphor:** Your CLI is the bonded house where commands mature
- **Strength:** Brand mystique, strong logo potential

### 🏅 `maltyargs`

- **Pronounced:** MALT-ee-args
- **What it is:** Malt + yargs (direct lineage)
- **Metaphor:** "Malty" args — reads as a malt-whiskey descriptor
- **Strength:** Best PUN of any candidate, sits in yargs/oclif family

### 🏅 `cornmash`

- **Pronounced:** KORN-mash
- **What it is:** Corn-mash whiskey (bourbon base)
- **Strength:** Direct corn + whiskey fusion, on-theme for thebytefarm

### 🏅 `distillargs`

- **Pronounced:** DIS-till-args
- **What it is:** Distill + args
- **Metaphor:** Distillation IS what a parser does — purify argv into commands
- **Strength:** Strongest metaphor of any args combo, 3 syllables

---

## Full verified list (by category)

### 🥃 Whiskey / distilling — single words

| Name         | Say it      | Origin                          |
| ------------ | ----------- | ------------------------------- |
| `feints`     | FAINTS      | Distillation cuts (heads/tails) |
| `staves`     | STAYVZ      | Barrel staves                   |
| `mashtun`    | MASH-tun    | Mash vessel                     |
| `mashbill`   | MASH-bill   | Whiskey grain recipe            |
| `washback`   | WASH-back   | Fermentation vessel             |
| `bondhouse`  | BOND-house  | Bonded aging warehouse          |
| `stillhouse` | STILL-house | Distillation building           |
| `stillage`   | STILL-ij    | Spent mash residue              |
| `gauger`     | GAY-jer     | Barrel measurer / exciseman     |
| `snifter`    | SNIF-ter    | Drinking glass                  |
| `shive`      | SHIVE       | Cask plug                       |
| `highwine`   | HIGH-wine   | High-proof spirit cut           |
| `lowwine`    | LOW-wine    | First distillation output       |
| `maltster`   | MALT-ster   | One who malts grain             |
| `maltage`    | MALT-ij     | Malting + aging                 |
| `whitedog`   | WHITE-dog   | Unaged fresh-from-still whiskey |

### 🌾 T→TY (any T-ending whiskey/grain word + Y = citty rhyme)

Pattern: take a grain/whiskey word ending in `t`, double it, add `y`. Result reads like citty/kitty/ghostty (Mitchell Hashimoto's terminal — confirms this naming pattern is hot right now).

| Name          | Say it      | Origin                                                                               | Strength               |
| ------------- | ----------- | ------------------------------------------------------------------------------------ | ---------------------- |
| **`peatty`**  | PEAT-ee     | Peat-smoked whisky                                                                   | ⭐⭐⭐⭐⭐             |
| **`maltty`**  | MAL-tee     | Malt                                                                                 | ⭐⭐⭐⭐⭐             |
| **`gristty`** | GRIS-tee    | Grist (grain for mill) — "grist for the mill" idiom = raw material to process = ARGV | ⭐⭐⭐⭐ Best metaphor |
| **`yeastty`** | YEEST-ee    | Yeast (activates fermentation = activates your CLI)                                  | ⭐⭐⭐⭐               |
| **`stoutty`** | STOWT-ee    | Stout (beer style)                                                                   | ⭐⭐⭐⭐               |
| **`roastty`** | ROHST-ee    | Corn/barrel/coffee roast                                                             | ⭐⭐⭐                 |
| **`toastty`** | TOHST-ee    | Barrel toast (whiskey aging step)                                                    | ⭐⭐⭐                 |
| **`speltty`** | SPELT-ee    | Spelt (ancient grain)                                                                | ⭐⭐⭐                 |
| **`wheatty`** | WHEET-ee    | Wheat                                                                                | ⭐⭐⭐                 |
| `milletty`    | MIL-let-ee  | Millet                                                                               | ⭐⭐                   |
| `spiritty`    | SPIR-it-ee  | Spirits                                                                              | ⭐⭐                   |
| `fermentty`   | fer-MEN-tee | Fermentation                                                                         | ⭐⭐                   |
| `harvestty`   | HAR-ves-tee | Harvest                                                                              | ⭐⭐                   |
| `mastty`      | MAST-ee     | Pig food (acorns/nuts in forest)                                                     | ⭐                     |
| `bractty`     | BRACT-ee    | Corn leaf bracts                                                                     | ⭐                     |
| `meadty`      | MEAD-ee     | Mead (honey wine)                                                                    | ⭐                     |
| `crestty`     | CREST-ee    | Rooster crest                                                                        | ⭐                     |
| `nestty`      | NEST-ee     | Hen nest                                                                             | ⭐                     |
| `frostty`     | FROS-tee    | Frost (⚠️ Frosty cereal brand risk)                                                  | ⚠️                     |
| `potty`       | POT-ee      | Pot still (⚠️ bathroom association — DO NOT USE)                                     | ❌                     |

### 🐈 citty-pattern (tty embedded, like citty/kitty)

| Name           | Say it      | Origin                            |
| -------------- | ----------- | --------------------------------- |
| **`peaty`**    | PEE-tee     | Whiskey peat adjective ⭐⭐⭐⭐⭐ |
| **`barnty`**   | BAR-ntee    | Barn + tty                        |
| **`maltty`**   | MAL-tee     | Malt + tty                        |
| **`mashty`**   | MASH-tee    | Mash + tty                        |
| **`peatty`**   | PEAT-tee    | Peat (alt spelling) + tty         |
| **`oakty`**    | OAK-tee     | Oak (barrel) + tty                |
| **`bondtty`**  | BOND-tee    | Bond + tty                        |
| **`dramtty`**  | DRAM-tee    | Dram + tty                        |
| **`whisktty`** | WHIS-tee    | Whiskey + tty                     |
| **`silotty`**  | SY-lo-tee   | Silo + tty                        |
| **`siloty`**   | SY-lo-tee   | Silo + tty (single t)             |
| `mootty`       | MOO-tee     | Moo + tty                         |
| `cluckty`      | CLUCK-tee   | Cluck + tty                       |
| `hentty`       | HEN-tee     | Hen + tty                         |
| `cobtty`       | COB-tee     | Cob + tty                         |
| `silktty`      | SILK-tee    | Silk + tty                        |
| `kerntty`      | KERN-tee    | Kernel + tty                      |
| `corntty-cli`  | KORN-tee    | Corn + tty                        |
| `cowty`        | COW-tee     | Cow + tty                         |
| `henty`        | HEN-tee     | Hen + tty (single t)              |
| `pawty`        | PAW-tee     | Paw + tty (animal foot)           |
| `woolty`       | WOOL-tee    | Wool + tty                        |
| `pitty-cli`    | PIT-ee      | Pig + tty                         |
| `witty-cli`    | WIT-ee      | Witty (taken alone)               |
| `niblety`      | NIB-leh-tee | Niblet + y                        |
| `mooty`        | MOO-tee     | Moo + tty (alt)                   |
| `cluckcli`     | CLUCK-CLI   | Cluck + cli                       |

### 🥃 Whiskey adjective brands (citty-aliased)

| Name        | Say it      | Origin                        |
| ----------- | ----------- | ----------------------------- |
| **`peaty`** | PEE-tee     | Peat-smoked whisky (TOP PICK) |
| `yeasty`    | YEE-stee    | Yeasty (beer/bread)           |
| `charry`    | CHAR-ee     | Barrel char                   |
| `bondy`     | BON-dee     | Bond + y                      |
| `dramy`     | DRAM-ee     | Dram + y                      |
| `spirity`   | SPIRR-i-tee | Spirit + y                    |
| `worty`     | WOR-tee     | Wort + y                      |
| `popsy`     | POP-see     | Popcorn + y                   |
| `maizey`    | MAY-zee     | Maize + y                     |

### 🏭 Distillery / works (artisan brand)

| Name          | Say it                                   |
| ------------- | ---------------------------------------- |
| `malthouse`   | MALT-house                               |
| `mashhouse`   | MASH-house                               |
| `maltworks`   | MALT-works                               |
| `mashworks`   | MASH-works                               |
| `threshworks` | THRESH-works                             |
| `threshery`   | THRESH-er-ee                             |
| `mashery`     | MASH-er-ee                               |
| `malttery`    | MALT-er-ee                               |
| `whiskery`    | WHIS-ker-ee (⚠️ reads as `whiskery` adj) |

### 🥃 -ify family (Spotify/Shopify pattern)

| Name          | Say it         | Metaphor strength                   |
| ------------- | -------------- | ----------------------------------- |
| `maltify`     | MALT-i-fy      | ⭐⭐                                |
| `mashify`     | MASH-i-fy      | ⭐⭐⭐ Process raw grain (raw argv) |
| `threshify`   | THRESH-i-fy    | ⭐⭐⭐⭐ Separate grain from chaff  |
| `winnowify`   | WIN-no-wi-fy   | ⭐⭐⭐⭐ Filter via wind            |
| `siftify`     | SIFT-i-fy      | ⭐⭐⭐ Sift the args                |
| `gristify`    | GRIST-i-fy     | ⭐⭐ Grist for the mill             |
| `distillify`  | DIS-till-i-fy  | ⭐⭐⭐ Distill argv                 |
| `proofify`    | PROOF-i-fy     | ⭐⭐ Triple meaning                 |
| `bondify`     | BOND-i-fy      | ⭐⭐                                |
| `caskify`     | CASK-i-fy      | ⭐                                  |
| `rackify`     | RACK-i-fy      | ⭐⭐ Whiskey racking                |
| `feintsify`   | FAINTS-i-fy    | ⭐                                  |
| `stavesify`   | STAYVZ-i-fy    | ⭐                                  |
| `niblify`     | NIB-li-fy      | ⭐                                  |
| `kornify`     | KORN-i-fy      | ⭐                                  |
| `silofy`      | SY-lo-fy       | ⭐                                  |
| `stillify`    | STILL-i-fy     | ⭐⭐                                |
| `barlify`     | BAR-li-fy      | ⭐                                  |
| `barleyify`   | BAR-lee-i-fy   | ⭐                                  |
| `bourbonify`  | BOR-bon-i-fy   | ⚠️ bourbon CSS lib conflict         |
| `whitedogify` | WHITE-dog-i-fy | ⭐⭐                                |
| `mashbillify` | MASH-bil-i-fy  | ⭐⭐                                |
| `mashtunify`  | MASH-tun-i-fy  | ⭐⭐                                |

### 🥃 Args / yargs / argv lineage

| Name             | Say it         | Notes                                       |
| ---------------- | -------------- | ------------------------------------------- |
| **`threshargs`** | THRESH-args    | ⭐ **Best metaphor** — threshing IS parsing |
| **`mashargs`**   | MASH-args      | ⭐ Best balance                             |
| **`maltyargs`**  | MALT-ee-args   | ⭐ Best pun (sounds like "malty args")      |
| **`yargmash`**   | YARG-mash      | ⭐ Direct yargs riff                        |
| **`yargmalt`**   | YARG-malt      | ⭐ Direct yargs riff                        |
| `maltargs`       | MALT-args      | Cleaner than maltyargs                      |
| `maltparse`      | MALT-parse     | Argparse lineage                            |
| `mashparse`      | MASH-parse     | Argparse lineage                            |
| `threshparse`    | THRESH-parse   | Argparse + threshing                        |
| `winnowparse`    | WIN-no-parse   | Argparse + winnowing                        |
| `siftargs`       | SIFT-args      | Sift                                        |
| `siftparse`      | SIFT-parse     |                                             |
| `gristargs`      | GRIST-args     | Grist for the mill                          |
| `gristparse`     | GRIST-parse    |                                             |
| `rackargs`       | RACK-args      | Whiskey racking                             |
| `rackparse`      | RACK-parse     |                                             |
| `bondargs`       | BOND-args      |                                             |
| `bondparse`      | BOND-parse     |                                             |
| `proofargs`      | PROOF-args     |                                             |
| `proofparse`     | PROOF-parse    |                                             |
| `caskargs`       | CASK-args      |                                             |
| `caskparse`      | CASK-parse     |                                             |
| `feintsargs`     | FAINTS-args    |                                             |
| `feintsparse`    | FAINTS-parse   |                                             |
| `stavesargs`     | STAYVZ-args    |                                             |
| `maltsargs`      | MALTS-args     |                                             |
| `maltlyargs`     | MALT-lee-args  |                                             |
| `maltlyparse`    | MALT-lee-parse |                                             |
| `mashlyargs`     | MASH-lee-args  |                                             |
| `mashlyparse`    | MASH-lee-parse |                                             |
| `maltyparse`     | MALT-ee-parse  |                                             |
| `maltyargv`      | MALT-ee-argv   |                                             |
| `mashargv`       | MASH-argv      |                                             |
| `mashyparse`     | MASH-ee-parse  |                                             |
| `mashyargs`      | MASH-ee-args   |                                             |
| `distillargs`    | DIS-till-args  | Distill metaphor                            |
| `distillparse`   | DIS-till-parse |                                             |
| `stillargs`      | STILL-args     |                                             |
| `stillparse`     | STILL-parse    |                                             |
| `niblargs`       | NIB-l-args     | Corn kernel + args                          |
| `niblparse`      | NIB-l-parse    |                                             |
| `popargs`        | POP-args       | Popcorn pop                                 |
| `popparse`       | POP-parse      |                                             |
| `argsify`        | ARGS-i-fy      | -ify family                                 |
| `argify`         | ARG-i-fy       | -ify family                                 |
| `argmash`        | ARG-mash       | Inverted                                    |
| `argmalt`        | ARG-malt       | Inverted                                    |
| `argbond`        | ARG-bond       | Inverted                                    |
| `argstill`       | ARG-still      | Inverted                                    |
| `argcorn`        | ARG-corn       | Inverted                                    |
| `argbarley`      | ARG-bar-lee    | Inverted                                    |
| `argyargs`       | ARG-yargs      | yargs-doubled                               |

### 🌽 Corn — unique standalone

| Name        | Say it      | Origin                |
| ----------- | ----------- | --------------------- |
| `nixtamal`  | NIX-tah-mal | Alkaline corn process |
| `nixmal`    | NIX-mal     | Shortened nixtamal    |
| `niblet`    | NIB-let     | Corn kernel piece     |
| `hominy`    | HOM-i-nee   | Processed corn        |
| `cornmash`  | KORN-mash   | Corn-mash whiskey     |
| `cornhouse` | KORN-house  | Corn storage          |
| `cornery`   | KORN-er-ee  | Corn-place            |
| `silocorn`  | SY-lo-corn  | Corn silo             |
| `tamale`    | tah-MAH-lee | Corn dough food       |
| `masita`    | mah-SEE-tah | Small masa            |

### 🌽 Corn-modified (-r, -o, -y suffixes)

| Name     | Say it  | ⚠️ Moniker risk                         |
| -------- | ------- | --------------------------------------- |
| `huskr`  | HUS-ker | ⚠️ Too close to `husky` (git hooks lib) |
| `husko`  | HUS-ko  | ⚠️ Same                                 |
| `husken` | HUS-ken | ⚠️ Same                                 |
| `silko`  | SIL-ko  | ⚠️ Close to `silky`                     |
| `silkr`  | SIL-ker | ⚠️ Close to `silky`                     |
| `maizy`  | MAY-zee | Risk: similar to `mazzy`/etc            |
| `maizr`  | MAY-zer |                                         |
| `maizo`  | MY-zo   |                                         |
| `mayz`   | MAYZ    | Reads like "maze"                       |
| `popz`   | POPS    |                                         |
| `popko`  | POP-ko  |                                         |
| `popa`   | POP-uh  |                                         |
| `cobzy`  | COB-zee |                                         |
| `kornal` | KORN-al | Reads like "colonel"                    |
| `nibz`   | NIBZ    |                                         |
| `gritz`  | GRITS   |                                         |

### 🌾 Barley / malt

| Name        | Say it     | Origin            |
| ----------- | ---------- | ----------------- |
| `maltby`    | MALT-bee   | Malt brand suffix |
| `malter`    | MALT-er    | One who malts     |
| `maltster`  | MALT-ster  | Real trade word   |
| `barli`     | BAR-lee    | Barley shortened  |
| `barlee`    | BAR-lee    | Alt spelling      |
| `maltbash`  | MALT-bash  | Malt + bash shell |
| `maltforge` | MALT-forge | Malt + forge      |
| `maltcraft` | MALT-craft | Malt + craft      |
| `maltkit`   | MALT-kit   | Malt + kit        |
| `maltbarn`  | MALT-barn  | Malt + barn       |

### 🌽🥃 Hybrid corn + whiskey/malt

| Name         | Say it       |
| ------------ | ------------ |
| `cornmash`   | KORN-mash    |
| `mashbarn`   | MASH-barn    |
| `cornkit`    | KORN-kit     |
| `cornforge`  | KORN-forge   |
| `cornsmith`  | KORN-smith   |
| `cornbarrel` | KORN-bar-rel |
| `cornkeg`    | KORN-keg     |
| `cornstill`  | KORN-still   |
| `cornkiln`   | KORN-kiln    |

### 🌾 Rye (⚠️ Python `rye` package manager exists — confusion risk)

| Name       | Say it    |
| ---------- | --------- |
| `highrye`  | HIGH-rye  |
| `ryebash`  | RYE-bash  |
| `ryeforge` | RYE-forge |
| `ryesmith` | RYE-smith |
| `ryekit`   | RYE-kit   |
| `ryeflow`  | RYE-flow  |

---

## ⚠️ Moniker collisions — DO NOT USE

- **`cornhub`** — porn site
- **`husky`** family — git hooks library
- **`silky`** family — possible collision
- **`kilner`** — famous jar brand (since 1842)
- **`bourbon*`** — Bourbon CSS framework
- **`maize*`** standalone — Maizzle email framework
- **`rye*`** standalone — Python package manager

---

## Verified TAKEN on npm (rejected)

`corn`, `husk`, `cob`, `silk`, `shuck`, `ear`, `tassel`, `maize`, `grits`, `mill`, `kernel`, `crib`, `maze`, `patch`, `pith`, `bran`, `meal`, `hominy` (single word), `mash`, `still`, `dram`, `dunder`, `tun`, `kiln`, `peat`, `bere`, `bourbon`, `hooch`, `julep`, `islay`, `speyside`, `barrel`, `cask`, `keg`, `proof`, `cooper`, `worm`, `wort`, `chaff`, `thresh`, `sheaf`, `bushel`, `grist`

---

## My recommendation

**Ship `mashbill`.**

Backups in order: `mashargs` → `maltify` → `mashify` → `mashtun` → `feints`.

If you want maximum yargs/args-lineage clarity: **`mashargs`**.
If you want SaaS brand: **`maltify`** or **`mashify`**.
If you want 1-syllable punch: **`feints`**.
