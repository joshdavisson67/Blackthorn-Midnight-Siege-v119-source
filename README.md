# Blackthorn: Midnight Siege

An original, single-player, first-person zombie survival game for desktop browsers. All game assets are served locally; anyone with the public game link can play and submit a score without an account.

## Play

**Play in your browser:** https://joshdavisson67.github.io/Blackthorn-Midnight-Siege-v119-source/ (published automatically from `main` by `.github/workflows/pages.yml`). This copy's shared leaderboard is stored in Supabase; see below.


Enter the estate to capture the mouse. WASD moves, mouse looks, left click fires, right click aims, Shift sprints, Space jumps, R reloads, G throws a grenade, F toggles the flashlight, E buys or interacts, 1/2/3 switch owned weapons, M opens the estate map and pauses survival, and Escape releases the mouse and pauses. Click Resume to recapture the mouse. Play begins only after the browser confirms mouse lock; permission denial leaves the run safely paused with a retry control and browser permission guidance. Escape never attempts to recapture the cursor. Closing the map with Escape returns to pause; clicking Close or pressing M attempts capture before resuming.

Survive increasingly difficult waves. Hits and kills earn essence; headshots and completed waves give bonuses. Kill awards are 50 for walkers and either dog variant, 110 for brutes, or 75 for any headshot kill. The separate 10-point hit award and wave-clear bonuses are unchanged. Four permanent perks improve health, reload speed, damage, and movement. Buy the shotgun in the library and the SMG in the dining room, refill ammunition in the courtyard, and upgrade weapons at the hall's violet forge. Zombie dogs join the mixed waves from wave one, typically one in five spawns. They trot on four articulated legs, wind up before biting, and move at 125% of the current wave’s base zombie speed. Their lower silhouette, pointed ears, snarling muzzle, collar and tail distinguish them from walkers. Dogs follow the same stair routes, support headshots and leg reactions, and collapse into dynamic ragdolls. Wave five introduces tougher brutes. From wave six, rare Ashfang hounds replace roughly one in twenty spawn slots (brutes retain priority). They move at 150% of the wave’s base zombie speed, compared with ordinary dogs at 125%. Charcoal hides, pale skull masks, swept horns, exposed ribs, dorsal spines, barbed tails and ice-blue eyes distinguish them. Both dog variants scale their movement speed with the same wave curve and late-wave cap as zombies, retaining their 1.25× and 1.5× speed multipliers. Ashfangs have twice the health of a standard dog at the same wave. Their paired-leg bounding gait, higher growl and cyan radar markers also set them apart. Occasional pickups use distinctive, camera-facing icons: a green ammo box refills ammunition, a gold ×2 doubles damage for 20 seconds, and a violet grenade grants infinite grenades for 12 seconds. Press G to throw during the grenade bonus, even with an empty reserve; throws do not consume your stored grenades. Active bonuses have matching HUD icons and countdowns. Collecting the same timed bonus refreshes its duration, and pausing freezes its timer. Personal bests are saved in the browser.

The mansion now spans 84 × 96 meters (8,064 m²), twelve times its original 28 × 24-meter footprint. Eleven new sections connect the original hall, library, and dining room to a ballroom, conservatory, portrait gallery, rotunda, music salon, archives, north gallery, infirmary, chapel, observatory, and servants’ quarters. Multiple paths connect the sections and bounded grounds. Supply crates and additional weapon stations support the distant wings. The M map shows room names, connections, supplies, perks, and the player's position on the current floor.

The grand hall staircase now has twenty visible treads and a continuous walking slope: use WASD to climb and descend without jumping. Its landing connects an explorable second floor across the 84-meter front wings. Bedrooms, a dressing room, nursery, studies, a reading room, private salon, family gallery, reliquary, and balcony galleries include furnishings, windows, warm lighting, and upper ammunition crates. The balcony rails are lowered to 0.72 meters, with matching posts and collision height. They still stop walking off the edge, but Space plus movement lets the existing jump clear the railing and drop into the first-floor grand hall. The stair banisters retain their existing protection. Height-aware collisions, ceiling clearance, jumping and gravity keep movement on the correct floor. Zombies can climb and descend the stairs to chase you; attacks and purchases cannot cross floors. Ragdolls and grenades land on upstairs surfaces, and solid floors block grenade blasts.

The estate’s stations now advertise their effects with physical exhibits: a caged heart, quick-change magazines and gears, a cartridge target, winged boots, open ammunition cases, recognizable shotgun/SMG racks, and a spectral anvil. Timed-bonus shrines sell Double Damage for 800 essence and Infinite Grenades for 900 on both floors. Upstairs now has all four perks, both purchasable weapons, two ammunition stations, both timed shrines, and a forge. Duplicate perk stations share ownership, so bonuses cannot stack. Dropped power-ups carry rotating 3D ammo-case, ×2 and grenade models beneath their matching icons. The map marks station types on each floor.

The upstairs cleanup raises clear ceiling height from 2.32 to 2.90 meters (25%). Ground-floor ornament is trimmed below the upstairs slab, doorways and headers are aligned, furniture is grouped around room edges, and flush ceiling lights replace low fittings. Fifteen lightly glazed windows have real wall openings facing the front courtyard and side grounds. Their collision boundaries keep players inside while preserving exterior sightlines.

Detailed oak and limestone textures use consistent physical scale, mipmapping, and anisotropic filtering. Subtle surface relief and rougher reflections limit shimmer. Coplanar floor decorations and doubled columns were corrected. The image is freshly cleared every frame and uses spatial multisampling; chromatic offsets, ring-shaped bloom samples, animated film noise, and depth-based screen halos were removed. Weapons render in their own depth-cleared pass with proper self-occlusion. The 15% display brightness boost and open, clear sights remain. High, Ultra, and Performance settings are available before starting.

Zombies now have five distinct estate-themed designs with modeled faces, layered clothing, curved fingers and articulated jaws. Asymmetric strides, limps, smooth turns, hit reactions and alternating wind-up attacks give them more varied motion. Impact-driven ragdolls react to bullet direction and hit location, buckle from leg hits, tumble onto either shoulder, twist or fly from grenades. Bodies collide with floors and walls, settle, and are cleaned up with a 14-corpse limit.

Combat now uses ten prebuilt enemy templates with shared geometry/materials and independent animated skeletons. Shaders and enemy buffers are prepared during loading. Pickups and explosions use a fixed four-light pool; the flashlight switches intensity without changing the lighting shader configuration. Allocation-free collision queries and ragdoll constraint math, cached navigation adjacency, staggered line-of-sight checks, and unchanged-HUD suppression reduce CPU spikes. The FPS counter uses real elapsed time, including stalls.

The expansion uses spatial collision lookup, reusable navigation buffers, local enemy spawn selection, spatial mesh batches, and eight pooled lights for the new wings. These keep cost bounded as the estate grows; real browser frame rates remain unmeasured.

## Phone-sized event HUD (version 142)

- **Phone check.** The game now tells phones from tablets and computers: a touch device whose screen's short side is 540 px or less counts as a phone. It checks at load, whenever the screen rotates or resizes, and again when you enter the mansion, and switches on a compact phone layout.
- **Smaller random-event UI on phones.** The event badge (Shroud, Surge, Grave Awakening, Blackout) shrinks from 300×114 to about 200×60 px on a landscape phone, with a 12 px countdown and a two-line description. The centre announcement drops from 44 px to 24 px and wraps in a narrower column near the top, so it no longer runs across the whole screen or over the badge.
- **Touch countdown fix.** The touch layout's big wave-number size also enlarged the event countdown to 34 px; it now applies to the wave number only, which fixes tablets too.
- Tablets and computers keep the full-size HUD.

## Double-tap to fire (version 141)

- **New touch fire.** With touch controls on, a quick tap on the right side of the screen followed by a second tap within 0.3 s, near the same spot, fires the gun. Holding the second tap holds the trigger, so automatic weapons keep firing, and dragging it still aims, just like holding FIRE. Lifting it stops. The FIRE button works as before.
- **No accidental shots.** Only short, still taps count: a look drag, a press longer than a quarter second, a second tap that comes too late or lands far from the first never fires. A double tap that has fired does not chain into the next tap.

## Sculpted arms and working elbows (version 140)

- **Arms with anatomy.** Upper arms are no longer capped tubes: a deltoid wraps the shoulder and tapers to a V, biceps and triceps bellies sit front and back, the elbow has bony knobs and a pointed olecranon, and forearms are thick under the elbow and flat at the wrist. Starved and gaunt arms are bony with veins over the biceps, the bloated caretaker's sag under the arm, the brute's are heavy and scarred, and the feral's are wiry. Every arm rolls its own muscle sizes, so the left and right arms differ.
- **Shoulders that slope.** The shoulder cap tucks under the shoulder line instead of sitting on top of it. Bare shoulders run down from the neck through a trapezius, coats gain a sloped shoulder seam, and sleeves roll over into the coat with no open hole at the top. Full sleeves close over the elbow, so a bent arm shows cloth.
- **Moving elbows.** Every zombie rests its elbows at its own bend. The elbows flex as an arm swings forward and open as it swings back, a little behind the shoulder. The forearm and hand are sprung in world space, so they trail the upper arm and follow through rather than moving rigidly with it. Reaching arms grope, clutching arms are held high, dead arms flop, and idle zombies' elbows keep shifting. Elbows never bend backwards.
- **Measured against v139:** across a stride the elbow now moves 0.4–0.65 rad (it was 0.24 rad and identical for every zombie), and peak joint accelerations stay at v139's level. Walkers have about 2,000 more triangles each (roughly 22,000) and the templates build in the same time.

## Steadier walk (version 139)

- **Steady heading.** Bodies face a smoothed walking direction (about 0.4 s) instead of each frame's raw step. The walking direction itself is eased (about 0.14 s), so routes that step from grid cell to grid cell curve instead of zig-zagging. Turns sharper than about 70° are taken at once, so nobody grinds into a wall turning round. Heading jitter on routed walks fell about 3.3×.
- **Slower, longer strides.** Walkers now take about 1.8 steps a second instead of 2.3, so the shamble reads heavier and less like a metronome. Planted feet slide even less (0.08 m per metre walked).
- **Gentler rocking.** Hip twist, pelvis roll, side sway, spine tilt and head sway are smaller and pass through softer springs. Mid-stride twitches are only a flicker; standing zombies still twitch fully.
- **Measured against v138:** pelvis roll is about 10× smoother, spine tilt about 4×, head roll about 2.6× and the knees about 1.5×.

## Smooth gait (version 138)

- **No more tick-tock.** The hip sway, pelvis roll, spine tilt, head roll and limp dip used to flip instantly from one side to the other each time the weight changed legs. They now follow a smooth weight-balance signal: each planted leg's support rises and falls through its stance, and a spring smooths the result.
- **No snapping feet.** Each swing is a Hermite curve that leaves the stance pose at the same position and speed and lands exactly on the next stance pose. The knee and ankle blend between those poses.
- **No hopping pelvis.** The pelvis height is the support-weighted reach of the planted legs, spring-smoothed.
- **Gentler twitches.** Twitch impulses are roughly halved.
- **Measured over 16 walkers:** the worst per-frame acceleration fell about 50× for pelvis sway and roll, 16× for spine tilt, 8× for the ankles and 6× for the hips. Feet still plant (0.16 m slide per metre walked).
- **Fix:** a brute crouched under an upstairs doorway now grabs instead of slamming or swiping, so its fists stay under the header.

## Attack styles and arm carriages (version 137)

- **Attack styles:** each enemy rolls its own, and every style lands on the same contact frame, so damage timing is unchanged.
  - **Grabbers** seize you with both hands and yank you in.
  - **Swipers** cock one arm high and backhand down across the body, alternating arms.
  - **Biters** pin you, rear the head back and lunge in jaw-first.
  - **Flailers** windmill both arms wildly.
  - **Brutes** usually slam both fists down overhead.
  - **Ferals** usually coil, spring and rake with both claws in turn.
  - Sir Blackthorn swipes like a swordsman, and the Gravewarden slams.
- **Arm carriages:** two new ones while walking. A **broken arm** hangs dead and flops on a slack spring. **Clawing** zombies hold both hands up and grasp at the air. They join reaching, dangling, mixed and clutching arms.
- **Blending:** attacks blend the arms toward their own pose rather than stacking on the carriage, so a reaching zombie's grab doesn't end with its arms overhead.

## Organic enemy motion (version 136)

- **Planted feet:** walkers and ferals step instead of skating. During each stance the hip angle is solved so the planted ankle travels back at exactly ground speed, against the pelvis's own pitch. The pelvis height comes from the planted leg. Planted-foot slide dropped from about 0.97 to 0.20 metres per metre walked.
- **A real limp:** the dragged leg has a shorter stance and the good leg a longer one, with one foot always down. The hips dip and roll over the bad leg, and the dragged foot scuffs toe-down.
- **Weight:** the hips sway over the planted foot and drop on the swing side, and the chest counter-twists against the pelvis. Each heel strike lurches the body and nods the chest. Bodies lean into turns.
- **Follow-through:** arms, forearms, wrists, head and shoulders ride on damped springs. Dangling arms swing heavy and loose, and reaching arms tremble.
- **Gaze:** heads track the player with a lagging neck, within limits, and roll with the stride. Irregular twitches jerk the head or a shoulder.
- **Idle:** idle enemies breathe and sway.
- **Turning:** bodies turn at a limited, eased rate (2.4–6 rad/s by type) instead of snapping to every steering wobble. Turning on the spot shuffles the feet.
- **Attacks:** a two-handed lunge. The body rears back, then lunges, and the jaw snaps. Hit timing is unchanged.
- **Hounds:** head tracking, a flexing spine, spring-trailed tails, leaning into turns and ragged panting.
- **Unchanged:** joints, hit regions, ragdolls, crawling and attack timing.

## Blackout event (version 135)

- **Blackout** joins the Shroud, the Surge and Grave Awakening in the random world-event pool. Events can still start from wave 3, with a 40% chance per eligible wave, never two waves in a row, and each type is equally likely.
- **Warning:** the lamps gutter and flicker for three seconds.
- **The blackout:** the lights stutter out, and for 30 seconds every light in the estate is dark:
  - the moon, moonlight and sky glow
  - all lamp, candle and fireplace lights
  - glowing bulbs, windows and fixtures (signs dim)
  - the fog goes black
- **What stays lit:** your flashlight, muzzle flash, zombies' red eyes, pickups and event essence. At the end the lights sputter back.
- **Reward:** kills earn 20% more essence, like every other event.
- **All events last 30 seconds.** The Surge was 25 seconds. Grave Awakening's bonus now lasts the full 30 seconds while its six reinforcements rise.
- **Cost:** no lights are added or removed, so the shader light signature stays fixed. Only intensities and colours change.

## Easter egg: Olivia and the rat dragon (version 131)

*Spoilers.* Every enemy Bella kills drops a **bone chip**: a small, spinning bone that lasts 30 s. Your own kills never drop one. A small tally appears under the wave counter once you have a chip.

- **25 chips** make a hatch creak open in the ceiling of the upstairs **west bedchamber**, where Bella's kennel is. Pull-down stairs drop tread by tread through a hole cut in the wing's ceiling and roof.
- **The attic** is a small garret on the west wing roof. You can see it from outside, with a softly glowing window. Inside are floorboards, a rug, fairy lights, posters, a toy chest and a little lamp, and **Olivia**: a little girl sitting cross-legged on a beanbag, playing a game on a tablet with a controller in her lap. She looks up when you come near.
- **Turn in 25 chips** and she makes Bella a **fire-breathing rat dragon**: crimson bat wings that beat as she runs and flare when she breathes, a segmented spiked dragon tail with a spade tip in place of her curly one, and little horns.
  - **Fire breath:** when an enemy is within 4.6 m she breathes a 1.2 s cone of fire (every 2.4 s), burning every enemy in the cone four times a second for (40 + 7 × wave) damage per second. Walls stop it.
  - **Still a good dog:** she bites between breaths. The upgrade lasts the rest of the run, and her kills stop dropping chips.
- **Climbing:** Bella and ordinary undead (walkers, hounds, ferals) can follow you up and down the narrow stairs. Brutes, Gravewardens and Sir Blackthorn are too tall. The stair and attic aren't on the navigation grid, so climbers get a short steering route: around the side of the flight (never underneath it), line up at the foot, climb, and reverse the route to come down.
- **Secret:** Olivia never appears on the floor map or radar, and the field guide doesn't mention any of this.
- **Resets:** every new run seals the hatch, clears the chips and returns Bella to a plain Maltipoo.

## Sir Blackthorn and the curse ladder (version 130)

**The curse is now a ladder.** The Great Rotunda bell no longer asks you to embrace or resist every five waves. Instead you pick your curse rank on the title screen, under Enter the Estate, and it applies to the whole run from wave 1. The selector lists every rank you've unlocked plus the next one (locked), with a one-line summary of the chosen rank's effects. Rank effects are unchanged. Unlocks and your last choice are saved on this device (`blackthorn-curse-unlocked`, `blackthorn-curse-selected`). The bell stays as the rotunda's landmark and tolls when the boss falls. The leaderboard still records each run's rank; the server now accepts any rank up to the ladder's top (25) at any wave.

**Sir Blackthorn**, the estate's first lord, is the boss. After wave 20, detonating The Last Dawn in the mausoleum (even on an empty estate) wakes him: the sarcophagus lid slides back off the tomb, he rises out of it (invulnerable while he climbs), and steps down in front of it. Regular spawns hold while he fights, and the run carries on as far as you can make it once he falls.

- **Unique zombie:** a walker rig at brute size wearing a breastplate, pauldrons, an iron crown, a cloak and a long sword, with a soul-fire glow in his casting hand. Health is 110× the wave's walker health (curse health included). He uses brute routes and collision, never staggers, and ordinary rage chains don't touch him.
- **Grave lance (ranged):** at 4.5–32 m with a clear line of sight he raises his arm (0.75 s) and throws a glowing lance at 15 m/s. It hits for 85% of the wave's contact damage if it passes within 0.62 m of you, and walls stop it. Below half health he throws three in a fan.
- **Gravewarden (summoned tank):** at 75% and 40% health a Gravewarden climbs out of the ground beside him. It's an iron-helmed, stone-plated brute with a tower shield, 4× brute health, slower than a brute and hitting 25% harder. Shots into its shield do a quarter damage.
- **War cry:** every 15 s (sooner right after a summon), if allies are near, he throws his arms wide and screams. Every undead within 18 m turns red and gets 35% faster and 30% harder-hitting for 10 s.
- **Enrage:** below 30% health he turns red, moves 30% faster and casts about 50% more often.
- **Reward:** 5,000 essence × your curse multiplier and a Max Ammo, plus a health bar while he lives. Beating him at your highest unlocked rank unlocks the next one. Beating him at a lower rank pays out but unlocks nothing.

## Gentler interior lamps (version 129)

Every wing ceiling lamp had the same strength (26) whatever its height. In the ballroom and conservatory, which sit under the second floor, the lamps hang low, about 2.3 m up, so they put roughly three times as much light on the floor as the lamps in the tall rooms. They also blew the wood ceiling just above them out to a hot orange glare.

Wing lamps are now sized by their mounting height, so the floor beneath every one gets the same gentle light. The light source also moved up into the glowing globe instead of hanging below it. Low lamps drop from 26 to about 8 and high lamps from 26 to about 21. Second-floor and cellar lamps, wall sconces and fireplaces are unchanged.

Interior oak is also a little rougher (0.76–0.98 instead of 0.66–0.96). Lamps now give it a soft sheen rather than a bright glossy streak at low viewing angles.

## Controller support (version 128)

Blackthorn plays on a game controller through the browser Gamepad API (standard layout: Xbox, PlayStation and Switch Pro controllers in current browsers). `gamepad-controls.mjs` polls the controller once per frame.

| Control | Action |
|---|---|
| Left stick (click) | Move with analog speed (click to sprint while pushing forward) |
| Right stick | Look |
| RT / R2 · LT / L2 | Fire · aim |
| A / ✕ · B / ○ | Jump · use or buy |
| X / □ · Y / △ | Reload · next weapon |
| RB / R1 · LB / L1 | Grenade · flashlight |
| D-pad | ← → switch weapons, ↑ flashlight |
| View / Share · Menu / Options | Estate map · pause and resume |

- **Look feel:** radial dead zones stop stick drift, and a curved response gives fine aim near the centre. Holding the stick at the rim speeds up turning. Aiming slows the look speed (scaled by scope zoom), and it slows a little more while the sights sit over an enemy body (light aim assist, no snapping). Triggers have press/release hysteresis.
- **Menus:** the controller drives every menu. The D-pad or left stick moves a gold focus ring between buttons (spatial, with hold-to-repeat), A presses, B goes back or resumes, Menu starts or resumes, the right stick scrolls long pages like the field guide, and left/right adjust the quality and sensitivity controls on the title screen.
- **Switching:** the last device used takes over. Any controller button hands play to the controller, and that press also does its job, so A on the title screen starts a run. A real key, click or tap hands play back. Controller play needs no mouse lock. Unplugging the controller restores the device's own scheme. Switching by use is never saved.
- **Feedback:** prompts show **B** for use and buy. The controller vibrates per weapon when firing, harder when you take damage, and with distance falloff for nearby explosions. The pause menu shows the connected controller and has a vibration switch, which is saved.

Browsers only reveal a controller after one of its buttons is pressed with the page open. In embedded previews the Gamepad API may be blocked, so play from the GitHub Pages site.

## Automatic controls (version 127)

The game now picks the control scheme when it loads. Phones and tablets start with touch controls, and computers start with mouse and keyboard. The check uses the device's primary pointer, so touchscreen laptops with a trackpad stay on mouse controls, and stylus phones (which also report a fine pointer) still get touch. It falls back to platform hints in browsers without pointer media queries, and switches live if a tablet gains or loses a trackpad.

The pause-menu switch still works. A change is now remembered per kind of device (touch or desktop) instead of globally, so a choice made on one device never sticks on another. The old global touch setting from versions 121–126 is cleared once, so a phone can no longer stay stuck on mouse controls.

`input-scheme.mjs` already supports a third scheme, controller. Browsers only reveal a gamepad after a button is pressed, so a controller is picked up from the connect event, or at load if one is already known. It takes over when connected, the player can switch away from it, and unplugging it restores the device default. It stays off (`controllerSupported:false` in `game.js`) until gamepad play is added, so a connected controller changes nothing yet.

## Lawn character (version 126)

The lawns were one repeating 3.2 m green tile with 900 identical tufts, about one per 12 m², so the grounds read as flat carpet. At load the game now bakes an estate-wide character map from layered noise and the estate layout, and the turf shader tints the tile with it: broad lush and straw-dry patches, worn earth along path and grave-slab edges, darker moss at the foot of walls and the mansion, shade under each tree, and fine mottling. The tile texture itself is unchanged, so this costs one small texture lookup.

Foliage is now 8,000 tufts in one instanced draw. They grow in clumps of two to nine, densest and longest along paths, walls, tree roots and in lush patches, sparse and short in dry ones, with varied height, width and four blade shades (some with seed heads). A vertex-shader breeze bends the tips with travelling gusts, with no per-frame CPU work. Tufts still root only on real turf, clear of paving and graves.


The flashlight used to paint a flat, overexposed disc with a hard rim on every floor: at arm's length it delivered roughly six times the lamps' light, so almost the whole pool clipped to white and the beam's falloff only showed as an abrupt edge. It now projects a torch-shaped beam: a bright core, a softer corona with a faint reflector ring, and a dim spill that fades smoothly to nothing, with a slightly irregular lens rim. The cone is a little wider and the peak a little lower, so pools on wood and stone show a gradient and their grain instead of a white plate, while zombies at 7–14 meters stay about as visible as before.

Interior oak no longer has a lacquer clearcoat. It is a satin finish whose roughness follows the actual grain and board gaps, with soft worn patches, so lamp highlights break up across boards instead of sliding along them, and the flat ambient sheen on floors is subdued. Outdoor paving, curbs and graves stay rain-wet, but water now gathers in joints and pits while stone faces stay mostly matte. All three patterns are generated at load time from the existing oak and limestone images and a small beam profile, so no new image files are added. The real-shader shadow tests pass for both shadow modes.

## Gait personalities and crawlers (version 124)

The walk cycle was already procedural: legs, calves and feet swing out of phase, arms counter-swing, hips and spine sway, the body bobs and leans forward, flinches recover per body part, and deaths are physical ragdolls driven by shot direction, hit point and weapon force. Version 124 builds on that.

Every walker and feral now rolls its own gait personality at spawn: which leg drags (either one, with a shorter stride and a toe-down scuff that barely lifts the foot), how strongly it sways, how far it hunches, how it carries its arms (reaching forward, dangling, one of each, or clutched), how much it bobs, and how far its arms and hips run behind its legs, so limbs no longer move in lockstep. Twenty zombies roll twenty different gaits from the same shared models, with no new assets.

Enough damage to the legs (40% of a walker's or feral's health) now drops it to a crawl. The fall blends continuously from its current stride over about half a second, during which it cannot attack. Crawlers lie low with their legs trailing, haul themselves forward on alternating arms at 42% speed with their head raised, use a low collision body, still bite if they reach the player, and die into the same physical ragdoll. Brutes and dogs keep their feet. The field guide describes crawlers.

Tests cover gait variety across twenty spawns, either leg dragging, measured arm lag, arm carriage and hunch, the crawl threshold and its exclusions, a continuous drop with no mid-fall attacks, the crawl pose, reduced crawl speed in play, crawler bites and crawler ragdoll deaths.

## Crowd spreading (version 123)

The horde no longer files in nose-to-tail. Within twelve meters, enemies that can reach the player share out approach angles: one directly behind another fans off to its own side, and the group arrives as a ring around the player instead of a queue. Each enemy keeps its personal left/right flank. Slots that land in a wall or have no clear walk are narrowed or dropped. On longer routes, neighbors beside each other drift apart and a crowded enemy prefers its own side, so open rooms carry two or three abreast. A small personal sway, and a blocked enemy shouldering its neighbor a little sideways on flat ground, make the press look alive. Bodies still never overlap, the player still cannot push enemies, attacks are never interrupted by a shove, and stairs still genuinely jam.

In the measured door scenario (16 walkers coming through the main door at a player in the hall), the share of enemies walking directly behind another fell from 69% to about 30%, the crowd now covers all 8 directions around the player instead of 4, and all 16 reach the fight within 20 seconds instead of 11. On the open lawn the figure fell from 21% to 10%, with the group about 25% wider. CPU cost per frame is unchanged in the stubbed harness. Real-browser frame rates remain unmeasured.

## Palladian exterior (version 122)

The front now takes its cue from an English Palladian country house. Eight giant-order Ionic columns, set in pairs on stone pedestals, rise through both storeys around the main entrance and carry a full entablature with architrave, frieze, dentils and cornice. A shallow pediment above holds the family crest in a carved roundel, with statues on its apex and ends. The ground storey is channelled rustication and the upper storey smooth ashlar, both stopping short of every door, window and exit. Pilasters frame each upper bay of the wings. A balustraded parapet with urn-topped dies runs around the whole roofline, with statues on the four corners. Behind the pediment a raised attic tower with tall windows, quoins, a balustrade and five statues stands above the slate roof, visible from the courtyard. The old front dormers and two-column porch are gone.

Only the eight column pedestals add collision. They stand clear of the main door and its open leaves, the ground-floor windows and the courtyard ammo crate, and every upper window keeps its sightlines. Balusters are one shadowless instanced draw. Facade checks cover the portico placement, pediment and crest visibility, the hidden slate gable, statue and tower heights, chimney clearance, clear doorway, landing and side-exit approaches, triangle budgets and collision count. Screenshots were taken in a software-rendered browser; real-GPU frame rates remain unmeasured.

## Storm cellar (version 16)

At wave 10, the pair of storm doors on the north grounds opens automatically. A 24-tread flight descends 4.2 meters to an 18 × 20 meter underground armory beneath the observatory. The cellar has its own floor map, clear circulation, storage crates, structural ribs, pipes and cyan fixtures. Navigation connects all three floors; players, walkers and both dog types use the same stairs. Ground terrain is cut around the stair opening. Collision, shots, grenades, ragdolls and interactions respect the underground floor and ceiling.

Press E to buy the Warden belt-fed LMG for 5,000 essence; key 4 selects it afterward. It holds 100 rounds with 500 reserve, deals 62 base damage, fires every 0.09 seconds and reloads in 5.2 seconds. Existing ammo crates, Max Ammo, Quickhands, Deadeye, Double Damage and forges work with it. Taking it once triggers a frenzy for the remainder of that wave: all live and newly spawned enemies move 40% faster, spawn intervals become 40% of normal, and half a normal wave of reinforcements (at least 12) is added. The 32-live-enemy budget remains. Claiming it during intermission reopens that current wave for the ambush. Frenzy clears when the wave ends, while the LMG stays owned.

The Aegis body armor vests in the cellar and upstairs east study each cost 2,500 essence, can each be purchased once per run, and grant a separate shield equal to maximum health: 100 normally, 200 with Ironheart. It absorbs enemy and self-grenade damage first, with excess damage spilling into health. A dedicated cyan HUD bar displays current shield/capacity. Armor does not regenerate or refill from health recovery. Buying Ironheart after armor scales capacity and remaining armor proportionally, preserving any depletion. Purchases deduct spendable essence without reducing the leaderboard score. A new run restores both vests and the LMG and closes the cellar.

## Family cemetery and mausoleum (version 18)

The east grounds now open through a seven-meter iron gateway into a 26 × 42 meter family cemetery. Fourteen marked graves, stone burial slabs, iron boundary fencing, warm fixture lenses and crossing stone paths surround a small eight-by-nine-meter Blackthorn mausoleum. The ground map fits the expanded estate and marks the cemetery and tomb. Six new reachable spawn positions keep this area integrated with normal waves.

The mausoleum remains sealed while wave 20 is active. Clearing wave 20 automatically removes the padlock and warning sign, swings both iron doors open, announces the unlock and refreshes enemy navigation. The chamber contains an ornamented sarcophagus with walkable side passages, fluted columns, a triangular pediment, an arched door surround, a family crest and a rear epitaph. It can be entered and left freely afterward; zombies follow through its doorway. The roof, walls and tomb have collision, and outdoor rain is hidden inside. A new run reseals the doors. The graveyard uses static batches and existing lighting; door transforms only update while opening.

## Verification

Run `npm test` for automated scene initialization and gameplay checks. These use the real Three.js geometry, camera, collision and raycasting with a stubbed renderer and a parsed DOM from the actual game HTML. They cover navigation, movement, waves, purchases, upgrades, shooting, reloading, death, restart, actual entry-button handlers, failed module loading, and denied or unsupported mouse capture. They also verify the 1.15 brightness multiplier, the center of each weapon's aimed reticle, clear scope sightlines, frame/depth pass ordering, weapon self-occlusion settings, full-mansion navigation, physical clearance along routes, local spawns in all twelve sections, and map pause/resume behavior. Capture tests cover successful locking, delayed permission, rejected promises, legacy event-only implementations, unavailable APIs, retry recovery, Escape event ordering, cancelled late acquisition, stale promise rejection, and losing focus. Unlocked movement and firing are disabled, and the simulation remains paused until capture succeeds. Zombie checks also verify all five designs and seven fall profiles, pose continuity, fixed-step physics, floor/wall contacts, bone lengths, settling, contact timing, corpse limits, mesh budgets, and resource cleanup. Stair checks use actual W/S controls to climb and descend, confirm smooth camera elevation and ceiling clearance, trace physically walkable routes through all ten upstairs areas, and test collision layers, railings, purchases, maps, zombie stair traversal, upper-floor ragdolls and grenades, and blast shielding. Ashfang checks cover the wave-six gate, rarity, exact 1.5× speed, distinctive geometry, bounding gait, cached resources, headshots, ragdoll settling and two-way stair traversal. Dog checks cover their silhouette, four-legged gait, bite timing, spawn sequence, speed, hit regions, kill rewards, stair traversal and ragdoll settling. Upstairs geometry checks verify the 25% ceiling increase, 180 unobstructed rays through fifteen windows, window collision containment, and twelve clear doorways after static batching. Station checks trace walkable routes from all eleven upstairs purchase approaches and verify every purchase type, duplicate perks, affordability, and floor separation. Power-up checks cover the three icon types, grenade drops, free throws at zero reserve, exact expiration, refresh without stacking, pause/resume, simultaneous bonuses, refills, restart and floor separation. Performance checks verify fixed light membership through explosions, pickups, flashlight toggles and resets; independent animated rigs backed by shared assets; and 6,000 indexed-versus-linear collision comparisons. `npm run profile` runs a CPU-only stress sample after the test suite. These checks do not validate WebGL shader compilation, pointer-lock behavior in a real browser, screenshots, audio playback, or visual quality. Browser QA was blocked by the managed preview supervisor failing to mount proc in this execution environment.

## Hosting

Game source assets are in `public/game/`. The Vinext Worker redirects the existing site root to the game and serves `/api/leaderboard`. Build through the Sites build helper; deployable output is generated in `dist/`. `.openai/hosting.json` retains the existing Site identity and persistent D1 binding `DB`. Three.js is MIT licensed; its license is included in `public/game/THREE-LICENSE.txt`. Fonts are Barlow and Barlow Condensed, licensed under the SIL Open Font License.

Generated material assets and their prompts are recorded in `GRAPHICS.md`.

Mouse capture uses the standard [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API). Browser permissions and sandboxed previews can prevent capture; the game does not attempt to override those restrictions.

Cellar regression checks cover the wave-10 gate, two moving leaves, real W/S stair traversal, two-way zombie/dog pursuit, floor-aware interaction and shooting, armor absorption/overflow and Ironheart order, LMG ammo/reload/selection, one-time rewards, actual frenzy speed, natural wave completion, grenade/corpse support, ceiling blast shielding and reset. The LMG also passes the existing clear-optic center-ray tests. Browser rendering and screenshots could not be verified in this environment.

Graveyard checks verify the actual keyboard entrance, physically walkable exit, local spawn reachability, cemetery bounds, map use, a locked mausoleum throughout wave 20, natural wave completion/unlock, animated doors, immediate navigation refresh, chamber entry/exit, sarcophagus collision, ceiling clearance, two-way zombie pursuit and fresh-run reset. The existing cellar, dog, station, scoring and upstairs behavior remains covered by the gameplay suite. Browser screenshots and rendering remain unverified.

## Shared public leaderboard (version 38)

**GitHub Pages (v132).** Pages serves only static files, so on `*.github.io` the same leaderboard UI talks to Supabase instead of `/api/leaderboard` (`public/game/leaderboard-supabase.mjs`). The database setup is `supabase/leaderboard.sql`: run it once in the Supabase SQL Editor (it is safe to re-run and never deletes scores). Players have no direct table access; the publishable key can only call `get_leaderboard()` and `submit_score(run)`, which apply the same name, number, curse-rank and run-UUID retry rules as `server/leaderboard.mjs`. The Pages board and the Cloudflare Site board are separate.

The main menu and pause screen open the shared top-50 leaderboard. Dying opens the board with an optional display-name form and an immutable snapshot of total essence earned, wave, kills and survival time. Spending essence does not reduce the submitted score. Ranking uses score, then wave, then kills, with earlier submissions breaking remaining ties. Names are displayed as text. Submissions use bound SQL parameters, strict size/type limits and same-origin browser requests. Each completed run has a UUID; retries of an identical submission return its existing row, while conflicting reuse is rejected. This is a friendly leaderboard for the browser game, not server-authoritative anti-cheat.

Scores live in the Site's persistent Cloudflare D1 database under the fixed `DB` binding, in `leaderboard_scores`. Every future game version reads the same records. The release number is stored with each run but never partitions or resets the leaderboard. `db/schema.ts` and the immutable initial Drizzle migration define the table; append future schema migrations without deleting scores. There is no runtime table recreation, seed/reset script or client-only leaderboard. The Site is public: anyone with the game link can read and submit scores without signing in. Both the landing page and standalone play tab use the same server endpoint and database.

The browser remembers the chosen name and a pending death snapshot as a retry aid. Failed or timed-out submissions retain the exact payload so an acknowledged-late retry cannot duplicate the run. A successful save clears that pending snapshot and reports its current rank. These browser copies are not the shared record of scores. While the board is open, it refreshes every 15 seconds and immediately on returning to the tab. Refreshing stops when it is closed or the tab is hidden. A temporary failure keeps the last displayed scores and schedules a retry; score submissions still require the player to press Add My Score. Old local personal-best entries cannot reconstruct past run scores and are not imported.

Server tests use real SQLite with the generated migration, close and reopen a file-backed database, and submit another release's score to verify cross-version retention. They cover ranking, the top-50 limit, duplicate/conflicting retries, input validation and unavailable storage. UI tests cover optional submission, death snapshots, offline/reload retry, name remembering, text-only rendering, concurrent requests, blocked local storage, two independent anonymous visitors using the real database handlers, automatic refresh, hidden/closed panels, and stale-response isolation. All prior game checks also run from the moved source directory. Browser rendering remains unverified in this environment.

## Grounds cleanup (version 20)

Textured grass covers the front, side and north lawns and the cemetery. World-aligned turf tiles match across terrain edges, with mipmaps, anisotropic filtering and a matte surface. Nine hundred short crossed grass tufts share one instanced draw and stay clear of stone pathways, grave plots, walls and the cellar stair opening. The cemetery entry path now connects to the east walkway. Loose paving fragments and the old graves outside the cemetery have been removed; all fourteen headstones remain inside the family cemetery. The adjoining strip is labeled East Grounds.

Geometry checks verify grass and paving surfaces, continuous UVs, foliage placement, the open terrain above the cellar stairs and headstone bounds. The gameplay, database and leaderboard UI suites remain the release checks. Supported browser rendering and screenshots remain unavailable in this environment.

## Crowd pathing and upstairs spawns (version 21)

Living walkers, brutes and both hound variants have size-appropriate body collision with each other and the player. Crowds can fill a doorway or staircase without compressing into one another or being pushed aside by sprinting. Killing a blocker immediately frees that space. Collision checks use actor height so enemies on another floor do not obstruct movement. World collision and small movement substeps still protect walls, stair treads and railings.

Individual route seeds break shortest-path ties differently, while crowd density favors a clear alternative at a junction. Left/right approach tendencies, local avoidance and bounded sidesteps around blocked neighbours add variation. Route choices always reduce the navigation distance; crowded stairs can still genuinely jam. Replanning and line-of-sight queries are staggered, the existing navigation field is reused and the 32-live-enemy limit remains.

From wave 11, one randomly chosen slot in each group of four spawns uses the second floor when a safe upstairs position is available. Candidates must be supported by the full floor footprint, outside walls and furniture, more than ten meters horizontally from the player, clear of living enemies and connected to the player by navigation. A blocked upper pool falls back to the ground pool. Spawns initialize both simulation and model height on their selected floor. Existing enemy-type frequency and wave scaling apply to both floors.

Regression checks exercise a staircase blocked by three live enemies, player sprint contact, a queue of followers, removal of a central blocker, floor-separated collision, visibly different approaches, different junction routes and crowd-aware branch selection. Spawn checks cover the wave-10/11 boundary, floor support, world/body clearance, render height and actual upstairs-to-ground pursuit. Browser rendering remains unverified in this environment.

## Readable menu and HUD (version 22)

Landing-page copy, buttons, settings and supporting labels are 50% larger; both Blackthorn wordmarks retain their original size. The gameplay overlay uses doubled text, health/shield bars, perk icons, power-up badges, radar, crosshair and hit markers. The radar has a matching 300-pixel backing canvas. Corner stacks keep equipment together and put the radar beside vitals on shorter, wider desktop screens. Landing copy can scroll on shorter screens without covering the bottom settings.

This release excludes the cancelled leaderboard changes; the existing leaderboard service, score data, submission behavior and database binding are unchanged. Browser visual QA is unavailable in this environment; the existing gameplay/startup/database/UI checks and the production build verify the update.

## Standalone launch and mouse capture (version 23)

Enter the Estate opens the canonical game URL in a new tab directly from its click handler, carrying quality, sensitivity and sound settings. The new tab prepares a paused run and presents Click to Play; that fresh click requests pointer lock and initializes audio. No capture is attempted during page load, and the launched page never opens a second tab. Esc and loss of mouse capture still pause the simulation. Focus-option failures fall back to ordinary canvas focus, and permission rejection leaves an enabled retry control. Startup tests exercise both tab roles, embedded play URLs, settings transfer and launch failures; gameplay tests cover paused preparation, capture, retry, Escape and legacy focus. Visual browser QA remains unavailable.

## Blood Rage (version 24)

Every enemy death rolls an independent 15% chance for each living, non-enraged enemy within a 6-meter 3D radius. Walkers, brutes, ordinary dogs and Ashfangs all qualify, and all kill sources use the same trigger. Blood Rage permanently doubles the enemy’s existing movement speed and multiplies its melee/bite damage by 1.25. It never stacks or expires; later nearby deaths can retry enemies that did not enrage. Killing an enraged enemy can trigger its neighbors. Wave speed, type differences, injury slows, attacks and the cellar frenzy still apply (rage plus frenzy is 2.8 times ordinary movement speed).

Cached red emissive materials and bright red radar blips identify enraged enemies without extra lights or per-kill geometry/material creation. Both normal and enraged variants are warmed during loading. Checks cover threshold/radius boundaries, independent rolls, repeated deaths, all four types, real movement and melee damage, persistent state, non-stacking, new-run cleanup and material isolation. Browser visual QA remains unavailable.

## Feral stalkers (version 25)

From wave 7, approximately one in eight total spawns is a Feral. Brute and Ashfang reserved slots keep their priority; a compensated roll on the remaining slots gives about 12.5% overall rarity. Ferals have normal walker health, three times the current wave’s base movement speed and twice standard melee damage. Wave scaling, collision, stairs, headshots, ragdolls and Blood Rage apply: an enraged Feral moves at six times baseline and deals 2.5 times baseline damage, before other applicable movement modifiers.

A tenth cached rig adds a lean pale body, exposed rib ridges, bald head, long claws, green eyes and a forward-leaning sprint. Green radar markers distinguish normal Ferals; enraged ones use the existing red palette. Tests cover the actual wave-6/7 spawn boundary, global rarity, reserved slots, asset reuse, real movement/damage, rage, wave scaling, headshots, dynamic death and stair traversal. Browser visual verification remains unavailable.

## Exterior surface cleanup (version 26)

Expansion doorway trim now projects seven centimeters beyond each wall face instead of sharing its surface. Jambs end below the lintel, and molding ends are recessed to avoid overlapping wall end caps and exterior corners. North window backing panels sit clear of the interior wall finish. Fifteen obsolete ground-floor coffer panels are explicitly removed during upstairs construction; previously they were raised into the upper ceiling slab and competed with its top surface.

Regression rays inspect the actual static batches at all ten exterior doorway jambs and all fifteen former coffer positions, checking clear depth separation and the intact ceiling slab. Existing movement, stairs, window sightlines, combat, startup and leaderboard checks remain release gates. Browser screenshots and WebGL visual confirmation are unavailable in this environment, so these geometry checks cannot confirm the precise flashing spots seen during play.

## The Enraged Pair (version 27)

After all regular wave-5 enemies are defeated, two brutes arrive as a boss finale. Both spawn permanently enraged, with twice normal brute movement speed and 25% extra brute melee damage. Their normal wave-5 brute health, kill rewards, collision, attacks and dynamic deaths remain in use. The existing cached Blood Rage materials give them a red glow without extra lights or GPU asset creation. The encounter announces its arrival and shows two independent health bars and a remaining-boss count.

Safe, reachable ground-floor spawn positions follow the player's current location, including routes to an upstairs player. Blocked placements retain their queued slots and retry. Wave 5 stays active until both bosses die; only then does the normal 550-essence wave bonus, recovery, grenade restock and 12-second intermission begin. The encounter runs once per playthrough and resets completely with a new run.

Checks cover the last regular enemy trigger, exactly two forced enraged brutes, safe placement, cached rage appearance, non-stacking buffs, health-bar damage updates, pause/resume, one surviving boss holding the wave, a single clear reward, wave-6 progression, blocked placement retries, upstairs connectivity and fresh-run reset. The cellar geometry check now holds random wave spawns during its gate/stair traversal so an unrelated crowd cannot block the test; live pursuit and crowded stairs retain their separate checks. Browser rendering and screenshots remain unverified in this environment.

## Cellar relocation and mausoleum collision (version 28)

The storm cellar flight sits in the rear-left grounds, 24 meters left of its former position and seven meters farther north. Its southern edge is eight meters from the mansion boundary, and the north fence has moved back twelve meters to provide a similarly clear approach at the top. Grass fills the former opening. Revised paving, the gate interaction, sign, floor maps, terrain cutout, collision and navigation all use the new location. A roofed seven-meter passage connects the flight to the 18-by-20-meter armory beneath the west wing. A surface end rail prevents accidentally stepping into the deep end; the underground route passes beneath it. The wave-10 unlock, LMG frenzy and separate body armor mechanics remain intact.

The mausoleum trap was reproduced by jumping toward the sarcophagus: the old body collider stopped below the visible lid, so a jump could enter the coffin footprint and fall to ground level inside the blocking box. Collision now covers the complete lid, and its top is a real landing surface. Footprint-aware support prevents falling back into the collider while walking off an edge or corner. Moving the coffin forward also widens the rear passage and gives enemy navigation a clear connected row behind it.

Actual keyboard checks traverse the rear mansion doorway, the new flat cellar approach, staircase, passage and armory. They verify the end rail, updated navigation portals, two-way zombie/dog pursuit, pickups, shooting, grenades, frenzy and maps. The reproduced mausoleum jump can exit freely; falling onto the lid lands safely, and every edge and corner can be walked off and followed by an exit through the doorway. The full gameplay, boss and persistent leaderboard suites pass. Browser screenshots and WebGL visual confirmation remain unavailable.

## Compact gameplay HUD (version 29)

Gameplay HUD text, health and shield bars, perk icons, power-up badges, ammo display, crosshair, hit markers and boss indicators are half their previous size. The compass/radar is now anchored in the top-right corner, with essence and kills directly beneath it. Its 300-pixel backing canvas renders at 150 CSS pixels to keep the smaller display sharp. The location label has its own position away from the compass stack.

The bottom HUD now correctly contains both the health/perk and equipment groups; control hints and the frame counter are also inside the gameplay overlay. All existing dynamic element IDs are retained. The landing page keeps its existing typography. Browser visual QA remains unavailable in this environment; release checks use the parsed DOM, existing game/startup/leaderboard suites and the Sites production build.

## Larger and tougher brutes (version 30)

Regular brutes and both wave-five bosses have 33% larger models in all three dimensions and 33% more current/maximum health at every wave. Their health multiplier is now 3.192 times standard wave health, compared with 2.4 previously. Their existing speed, damage, spawn frequency, kill rewards and permanent boss enrage remain in use. Both cached templates and live clones use the same uniform scale; articulation, hit regions and ragdoll particles follow the larger body without adding geometry or materials.

Body collision and safe spawn clearance match the increased width and standing height. Brutes share a separate navigation field that accounts for their larger dimensions; fields update with the normal player-target and gate changes rather than being rebuilt for each enemy. They bend their knees and hunch before entering the upstairs area or mausoleum to clear the lower headers while retaining their full model scale.

Regression checks compare rendered bounds, verify actual damage survival and existing rewards across waves 5–40, retain shared GPU assets, and exercise crouched walking/flinch/attack clearance, two-way stair pursuit, routes from four upstairs rooms, and mausoleum entry/exit. The existing boss, gameplay, startup and persistent leaderboard checks remain release gates. Browser screenshots and WebGL visual verification remain unavailable in this environment.

## Soul Forge model and weapon bonuses (version 31)

Both Soul Forges now feature a beveled iron anvil with a curved waist, flared base, polished face and tapered horn on an oak block with iron bands. A faceted violet soul stone, cyan seams and two orbiting embers hover above it. Both stones rotate and bob, with a shared emissive pulse. Static components remain batched; the stone components explicitly retain their animated transforms. The model fits the existing interaction locations and upstairs ceiling, uses the existing lighting, and creates no geometry or lights during play. Forge signs, interaction descriptions and the field guide describe all bonuses.

Forging the selected weapon still costs 4000 essence and doubles its damage. It now reduces reload duration by 25%, increases magazine capacity by 25% and increases maximum reserve ammunition by 25%. Whole-round capacities round upward. Quickhands multiplies the shortened reload duration by its existing 0.5 factor, regardless of purchase order. Forging during an active reload retains the percentage complete while shortening its remaining time and filling to the new magazine capacity. Current carried ammunition is retained on purchase; subsequent reloads, ammunition purchases and Max Ammo use the expanded capacities. Duplicate purchases cannot charge or stack. Each weapon keeps its own upgrade state until a new run restores the base inventory and timings.

| Forged weapon | Magazine | Maximum reserve | Reload without Quickhands |
| --- | ---: | ---: | ---: |
| M4 rifle | 38 | 225 | 1.725 seconds |
| M12 shotgun | 10 | 70 | 2.1 seconds |
| Raven SMG | 50 | 300 | 1.5 seconds |
| Warden LMG | 125 | 625 | 3.9 seconds |

Checks exercise the actual purchase, raycast damage, reload timing/completion, reserve transfer, pause/resume, weapon switching, refills, duplicate/insufficient purchases and restart paths. Geometry checks verify the floating air gap throughout the animation, preserved dynamic components on both floors, ceiling clearance and stable light membership. The full gameplay, boss, startup and persistent leaderboard suites remain release gates. Browser screenshots and WebGL visual verification remain unavailable in this environment.

## Release notes

The landing menu’s Change Log shows every release from v1 onward. `public/game/changelog-data.mjs` is the shared release history and source of the leaderboard’s current version. Append a dated entry for every player-facing change; preserve published entries. Update the current asset version queries and startup test, then run `npm run release:seal`, `npm test` and the Sites production build before publishing. The required release check compares all game assets and application/database source to the sealed release and rejects stale notes.
