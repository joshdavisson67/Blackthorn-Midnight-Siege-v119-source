// Append each release at the top. Preserve the historical entries below it.
export const RELEASES=[
{
  "version": 95,
  "date": "2026-10-10",
  "title": "The Blackthorn Curse: choose at the Rotunda bell",
  "tags": [
    "Gameplay",
    "Progression",
    "UI",
    "Leaderboard"
  ],
  "changes": [
    "After the entire wave-five frenzied finale is defeated, the Rotunda bell calls. A large message directs you to its ground-floor rope, with a one-minute countdown. Click the bell or press E at the rope to choose; the offer returns after every fifth wave, even after resisting or timing out.",
    "Embrace adds one permanent curse rank; Resist keeps your current rank. Both cancel the countdown and immediately start the next wave. An expired countdown keeps your rank and starts the next wave automatically. Pausing and other menus stop the clock; reading the choice does not reset it. Choosing or timing out attempts to restore mouse capture, with a safe Resume if the browser requires another click.",
    "Each rank stacks +15% speed on every enemy type, +25% newly earned essence and score, and +10% relative special-enemy frequency. From Rank 3, every rank adds +20% enemy health; from Rank 4, every rank adds +15% enemies per wave. Rank 5 and later intensify those penalties and rewards. Speed and special-frequency bonuses cap at +100%, existing enemy unlocks remain intact, and at most 32 enemies are alive at once.",
    "Added rank titles: Uncursed, The Whispered, The Marked, The Forsaken, The Damned, Blackthorn’s Chosen and Endless Corruption at Rank 6+. The HUD, comparison menu and field guide explain your current rank, next-rank tradeoff and permanent effects. Purchases do not change earned score, existing balances are not multiplied, and new runs reset the curse.",
    "The shared leaderboard now persists the highest curse rank and its title alongside each run. An additive database migration preserves all historical scores as Rank 0 / Uncursed; legacy submissions and exact retry IDs remain compatible."
  ]
},
{
  "version": 94,
  "date": "2026-10-10",
  "title": "Nano Shield Rank 3: continuous regeneration",
  "tags": [
    "Gameplay",
    "Graphics"
  ],
  "changes": [
    "Added Nano Shield Rank 3 for 20,000 essence. Buying Rank 2 unlocks Rank 3 at both existing armor stations in the storm cellar and upstairs east study.",
    "Rank 3 continuously restores 15 shield per second with no recharge delay, even during repeated hits. It preserves current shield and capacity, recovers from zero and stops at full shield. Regeneration pauses with the game and stops on death.",
    "The Rank 3 upgrade emitter displays gold rays and an additional projector halo. Effects use a small prebuilt mesh, shared materials and no extra textures or dynamic lights.",
    "Updated armor station signs, purchase prompts, HUD, map markers and the field guide for the third rank."
  ]
},
{
  "version": 93,
  "date": "2026-10-10",
  "title": "Consistent limestone columns",
  "tags": [
    "Graphics"
  ],
  "changes": [
    "Unified the mansion, portico, ballroom, rotunda, facade and mausoleum columns in the same limestone finish, including their bases, caps, collars and fluting. Cemetery entrance pillars use the matching stone.",
    "Corrected texture scaling on round and carved columns so the stone repeats at the same physical scale as square stonework instead of stretching over each column’s full height.",
    "Reused the existing limestone texture, shared material and cached geometry. Column dimensions, collision and navigation remain unchanged."
  ]
},
{
  "version": 92,
  "date": "2026-10-10",
  "title": "Steel stairways from both upstairs wings",
  "tags": ["Map", "Graphics", "Gameplay"],
  "changes": [
    "Replaced the window at the end of each upstairs wing corridor with an open, metal-framed doorway onto a steel landing.",
    "Added all-metal exterior stairways down to the west and east grounds, with steel treads, supports, guardrails and clear ground approaches. Both routes can be used to enter or leave upstairs.",
    "Connected both stairways to zombie and Bella navigation, floor-aware collision, grenade bounces and corpse support. Updated the floor maps and field guide with the new routes.",
    "Reused the existing metal texture and static geometry batching, without adding lights or animated environment effects."
  ]
},
{
  "version": 91,
  "date": "2026-10-10",
  "title": "Clean downstairs ceilings",
  "tags": ["Map", "Graphics"],
  "changes": [
    "Removed the dark outlines of upstairs room walls showing through the downstairs ceilings by seating their bottom faces inside the floor slab.",
    "Cleaned the ceiling joins over the wing doorways by recessing the inner bottoms of exterior walls into the slab while keeping their outer joins sealed.",
    "Added checks from below at vertical and oblique angles across both wings and doorways. The cleanup reshapes existing wall geometry without adding meshes, triangles, textures or lights."
  ]
},
{
  "version": 90,
  "date": "2026-10-10",
  "title": "Sealed upstairs floor and wall joins",
  "tags": ["Map", "Graphics"],
  "changes": [
    "Closed the narrow see-through gaps above the Grand Hall's downstairs room dividers by bringing the Library and Dining Room wall tops up to the underside of the second-floor slab.",
    "Extended upstairs partition and exterior wall bases through the floor slab to meet the downstairs wall tops on one shared plane, sealing room and window-sill junctions without overlapping exterior faces. Floor height, clear window openings, doorways, stairs and balcony drop routes retain their existing layouts.",
    "Reused the existing static wall meshes and materials to keep the repair lightweight."
  ]
},
{
  "version": 89,
  "date": "2026-10-10",
  "title": "The estate's random world events",
  "tags": ["Gameplay", "Enemies", "Graphics", "Performance"],
  "changes": [
    "Added random world events from wave 4: each eligible wave has a 30% chance, event waves are never consecutive, and only one event runs at a time. Names, advance warnings and a HUD status panel explain each event; the Field Guide includes the rules.",
    "The Shroud gives an eerie audio warning before 30 seconds of dense outdoor fog, strongest in the cemetery. Interior rooms stay clear, and the fog lifts when the event expires or the wave ends.",
    "The Surge sends a supernatural pulse through the estate for 25 seconds. Standard zombies move 20% faster and recover their attacks faster, while kills of every enemy type award 20% extra essence. Existing Blood Rage and frenzy still work, and the event never changes permanent enemy stats.",
    "Grave Awakening marks three cemetery graves with a four-second glowing, trembling warning, then raises six extra zombies into the current wave. Each drops a gold crystal worth 25 bonus essence, collectible for 30 seconds. Reinforcements respect enemy collisions, safe routes and the existing 32-enemy living limit.",
    "Event timers and grave reinforcements pause with the game and clear on death, restart or wave completion. Effects use existing fog, three reusable grave markers and a bounded pool of 16 essence crystals, with no additional lights, textures or particle systems; their shaders prepare before play."
  ]
},
{
  "version": 88,
  "date": "2026-10-10",
  "title": "The silent rotunda bell",
  "tags": ["Map", "Graphics", "Performance"],
  "changes": [
    "Hung a large aged bronze bell beneath the Great Rotunda's domed ceiling, with a hollow cast shell, raised bands, an iron clapper, interlocking suspension chain and an anchor plate fitted into the dome.",
    "Added a pull rope and loop at hand height, a nearby E interaction prompt marked SILENT and a BL estate-map marker. The bell is dormant: interacting costs no essence and has no sound, ability, reward or wave effect yet.",
    "Kept the bell above normal jumps and brute heads and left the central floor route and doorways clear. Its geometry is frozen into three static mesh batches, with no new textures, lights or animation updates."
  ]
},
{
  "version": 87,
  "date": "2026-10-10",
  "title": "Subtle metal and walnut weapon textures",
  "tags": ["Weapons", "Graphics", "Performance"],
  "changes": [
    "Added fine metal grain, small scuffs and subtle finish variation to weapon receivers, steel slides, barrels, optic housings and exposed cartridges, preserving each weapon's existing metal colors.",
    "Gave the shotgun's walnut furniture flowing grain, darker pores and a softly varied finish with shallow surface relief. Grain density follows part size instead of stretching over long receivers or stocks.",
    "Held weapons and map displays share four seamless textures, with 256-pixel color maps and 128-pixel finish maps totaling about 0.83 MiB including mipmaps. Texture filtering is bounded, repeated geometry is cached, and the pass adds no meshes, triangles, lights or render passes.",
    "Upload the shared maps before gameplay begins to avoid texture uploads on the first weapon switch. Sight glass, red dots and iron-sight markings stay clear, and the textures do not regenerate during play."
  ]
},
{
  "version": 86,
  "date": "2026-10-10",
  "title": "Detailed weapons and properly fitted sights",
  "tags": [
    "Weapons",
    "Graphics",
    "Performance"
  ],
  "changes": [
    "Refined all six weapon models with receiver controls, recessed fasteners, magazine and stock details, grip texturing and better fitted mechanical parts. The M4 and Bushmaster now have open, vented handguards around visible barrels; the shotgun has loading and pump details, the Raven has a diopter sight and magazine release, and the LMG has feed-cover, gas-regulator and belt-pouch details. Held weapons and map displays share the same models.",
    "Fixed the floating Glock front sight with lower iron sights and small mounting shoes seated directly into the slide. Narrowed the rear U-notch and aligned its shoulders with the front post from the aimed camera; all sight parts continue to move with the firing slide and empty lock-back.",
    "Rebuilt the Raven, shotgun and LMG reflex sights with shaped housings and glass that follows each opening, including the rounded corners. Refined the M4 red-dot tube and Bushmaster scope with fitted lenses, adjustment caps, collar details and mounts that meet their supports. The Raven now has a red reticle; all aiming views retain clear glass and unobstructed center sightlines.",
    "Cached repeated optic geometry and finishes and batched their fixed housings separately from the lenses and reticles, keeping detailed held weapons within the existing mesh and triangle budgets without additional lights or render passes."
  ]
},
{
  "version": 85,
  "date": "2026-10-10",
  "title": "More noticeable headshot kickback",
  "tags": [
    "Combat",
    "Enemies"
  ],
  "changes": [
    "Increased backward headshot kickback by 15% for all undead types, keeping the upright body pose and the same reaction and recovery timing."
  ]
},
{
  "version": 84,
  "date": "2026-10-10",
  "title": "Headshots snap the head back",
  "tags": [
    "Combat",
    "Enemies"
  ],
  "changes": [
    "Changed surviving headshot reactions to a small backward neck snap and smooth recovery, with no torso bend or crouch from headshot stagger. The adjustment applies to walkers, brutes, Ferals and both hound variants, and also replaces a body-stagger pose when a headshot lands during it."
  ]
},
{
  "version": 83,
  "date": "2026-10-10",
  "title": "Make every bullet count",
  "tags": [
    "Combat",
    "Weapons",
    "Enemies",
    "UI",
    "Performance"
  ],
  "changes": [
    "Added distinct procedural head, torso, arm and leg flinches, including left/right limbs and front/rear dog legs. All undead types react using their existing joints; brutes resist more strongly.",
    "Headshots now give a sharp audio cue, a larger gold hit mark and a stronger head reaction even when the enemy survives. A brief HEADSHOT label can be toggled in the pause menu, with the choice saved for future visits.",
    "Gave the Glock, M4, Raven, LMG, shotgun and Bushmaster individual camera kick, side movement, gun recoil and recovery. Aiming reduces recoil, recovery is independent of frame rate, and scope reticles stay aligned with the actual shot through a clear bore.",
    "Added a hidden stagger system: precise Glock head hits can briefly interrupt ordinary zombies, while repeated powerful hits can stagger brutes. Stagger interrupts movement and an attack wind-up, decays without follow-up hits and has a recovery window. A shotgun shell has one stagger budget; Bella cannot stun-lock enemies.",
    "Varied the existing seven death patterns using impact location, direction and weapon force. Headshots add stronger head motion, arm hits favor a shoulder drop, shotgun kills favor backward recoil, and leg hits buckle the knees. Corrected corpse ground friction at wall contacts to prevent slow clipping into a wall.",
    "Added brief damage arrows around the sights that track an attacker as you turn, including melee, dog bites and your own grenade splash. Shield-only hits show blue arrows; health damage shows red. Updated the field guide and reused four HUD markers without new textures, enemy meshes, lights or a new physics system."
  ]
},
{
    "version": 82,
    "date": "2026-10-10",
    "title": "Bella, the immortal Maltipoo",
    "tags": [
        "Companions",
        "Gameplay",
        "Map",
        "UI"
    ],
    "changes": [
        "Added Bella’s kennel against the rear wall of the upstairs west bedchamber. Spend 670 essence to open its hinged door and free Bella once per run; the kennel sits clear of the bedroom entrance and has a raised brass nameplate.",
        "Built a fluffy white Maltipoo inspired by Bella’s reference photo, with floppy ears, a warm brown nose, dark eyes, a curled tail, walking and tail-wagging animations, and a lunging bite.",
        "Once freed, Bella follows you between the estate’s floors using walkable routes and automatically attacks all living undead types within 12 yards of the player. Bites cannot pass through walls or floors; her kills award regular body-kill essence and shared score. Bella has no health, is immortal and cannot block the player.",
        "Added a Bella map marker, friendly minimap blip, companion HUD badge and field-guide instructions. Movement and bites pause with the game, and new runs return her to the locked kennel. Her model is batched and warmed before gameplay, with throttled route and target updates."
    ]
},
  {
    "version": 81,
    "date": "2026-10-09",
    "title": "Soul Forge price rebalance",
    "tags": ["Gameplay", "Weapons"],
    "changes": [
      "Soul Forge Rank 1 now costs 5,000 essence, Rank 2 costs 10,000, and Rank 3 costs 15,000, for each weapon at either floor’s forge.",
      "Updated both forge displays, purchase prompts and the field guide to show the new prices. Damage, reload and ammo bonuses continue to compound over three ranks; each weapon’s progress is shared between the two forges."
    ]
  },
  {
    "version": 80,
    "date": "2026-10-09",
    "title": "Wave-five frenzied finale",
    "tags": ["Enemies", "Gameplay", "UI"],
    "changes": [
      "Replaced the two-enraged-brute encounter at the end of wave 5 with a frenzied finale of exactly 17 enemies: 13 regular zombies and four brutes. It begins after every normal wave-5 enemy is defeated.",
      "The finale uses the existing frenzy effect: 40% faster movement and accelerated spawning. Brutes are spaced through its fixed roster and retain their usual health, damage and kill rewards; normal Blood Rage can still enrage survivors. Blocked spawn locations retry without skipping enemies.",
      "Wave 5 ends only after all 17 finale enemies are killed, awarding its normal wave-clear bonus once. Replaced the pair’s health bars with a frenzy counter for remaining undead and brutes. Updated the announcement and field guide; wave 6 and new runs reset the finale and frenzy."
    ]
  },
  {
    "version": 79,
    "date": "2026-10-09",
    "title": "Choose your minimap corner",
    "tags": ["UI", "Controls"],
    "changes": [
      "Added a Minimap Position toggle to the pause menu. Choose the original top-right corner or bottom left, where the map sits above health and shield. Essence stays at the top right.",
      "Your preferred corner is saved for future visits and kept across new runs. Switching corners keeps the game paused and moves the existing minimap without resetting its contents.",
      "Enlarged the minimap by 10%, from 150 to 165 pixels, with a matching higher-resolution canvas. The pause menu now scrolls on shorter screens so all controls remain reachable. Updated the field guide with the new setting."
    ]
  },
  {
    "version": 78,
    "date": "2026-10-09",
    "title": "Glock 21 starter pistol",
    "tags": ["Weapons", "Gameplay"],
    "changes": [
      "Every new run now starts with a Glock 21 .45 pistol: a 13-round magazine and 78 reserve rounds. It fires one shot per click, with iron sights and a faster pistol reload.",
      "Added a dedicated Glock model with a bevelled steel slide, textured polymer grip, open trigger guard, flush magazine, white iron sights and recessed barrel. The slide cycles when fired, locks back when empty and closes after reloading; the weapon floats without a hand model.",
      "The M4 is no longer part of the starting loadout. Buy it in the shed after its wave-7 doors open for 4,500 essence. Key 1 equips the Glock and key 6 equips the purchased M4; keys 2 through 5 retain their existing weapons.",
      "Integrated the pistol with ammo supplies, Max Ammo, Deadeye, Quickhands and all three Soul Forge ranks. Updated the HUD, field guide and M4 purchase prompt. New runs reset the pistol’s ammo, upgrades and slide, and lock purchased weapons again."
    ]
  },
  {
    "version": 77,
    "date": "2026-10-09",
    "title": "M4 rifle in the shed",
    "tags": ["Weapons", "Map"],
    "changes": [
      "Added an M4 display to the shed’s rear workbench, with spare magazines and a clear 4,500-essence price plaque. Its purchase approach leaves the entrance, window and central aisle clear.",
      "Once the shed opens at wave 7, approach the rifle inside and press E to buy it for 4,500 essence. The purchase equips the M4 and fills its magazine and reserve to their current capacity, preserving any Soul Forge ranks. It can be bought once per run; later equips are free and key 1 still selects the M4.",
      "Added the unlocked M4 to the estate map and documented the purchase in the field guide. The rack cannot be purchased through the shed walls or before it opens, and a new run resets its purchase status."
    ]
  },
  {
    "version": 76,
    "date": "2026-10-09",
    "title": "The groundskeeper’s shed",
    "tags": ["Map", "Gameplay"],
    "changes": [
      "Added a weathered timber shed to the larger north grounds beside the storm cellar. Its windowed workshop has a workbench, a clear central aisle and room for a weapon display. A short stone approach leaves the cellar stairs, rear mansion entrances and surrounding routes clear.",
      "The shed stays barred through wave 6. When wave 7 begins, the locking bar breaks and the doors blast open, accompanied by the notification: A door has blown open somewhere… Entry is free and remains open for the rest of the run.",
      "Added the shed to the ground-floor map, field guide and location HUD. All enemy types can follow players through its wide entrance, and new runs restore its doors, bar and lock. Its interior light uses the existing light pool."
    ]
  },
  {
    "version": 75,
    "date": "2026-10-09",
    "title": "Clean wall, floor and grass shadows",
    "tags": [
      "Fixes",
      "Graphics"
    ],
    "changes": [
      "Corrected lamp, moonlight and flashlight shadow sampling on sloped surfaces, removing the repeating triangular/grid pattern that appeared across walls, floors and grass after the lighting update. Each shadow sample now accounts for the receiving surface, with wall and floor light blocking retained.",
      "Lamp-shadow offsets now use the underlying surface normals instead of bump-map detail, preventing textured plaster, flooring and grass from shifting their own shadow receivers into the surface. The existing texture detail and room assets retain their appearance."
    ]
  },
  {
    "version": 74,
    "date": "2026-10-09",
    "title": "Launch recovery after the lighting update",
    "tags": [
      "Fixes",
      "Graphics"
    ],
    "changes": [
      "Fixed the launch failure reporting that currentRenderState is null. Cached lamp shadows now render inside the normal world frame, after the renderer has initialized its frame state, instead of running before or between frames.",
      "Preserved cached lamp occlusion, the reduced light budget and gradual shadow preparation during play. Animated enemies and rewards stay out of stationary lamp caches, while moving enemies continue to cast live moonlight and flashlight shadows."
    ]
  },
  {
    "version": 73,
    "date": "2026-10-09",
    "title": "Contained lighting and smoother rendering",
    "tags": [
      "Graphics",
      "Performance"
    ],
    "changes": [
      "Added architectural shadows to room lamps, the flashlight, dropped power-ups and grenade flashes so their illumination and highlights are blocked by opaque walls, ceilings and upstairs floors. Clear doorways, windows and the stair atrium continue to transmit light.",
      "Reduced the fixed point-light budget by half and cached nearby stationary lamp shadows instead of continuously redrawing the chandelier. New lamp shadows are prepared gradually during play, with bounded memory, stable light slots and live moonlight/flashlight shadows for moving enemies. Performance quality keeps wall and floor occlusion at lower shadow resolutions.",
      "Replaced painted window reflections with a smaller, soft ambient reflection map and reduced the artificial mirror/glow effect on the original mansion glass. Reflections from local lamps now respect the same shadows as their lighting. The existing 15% screen-brightness boost remains.",
      "Added light to the existing cellar and mausoleum fixtures, opened the courtyard lantern housings and corrected sconce/bulb occlusion so fixtures can illuminate their surroundings, and excluded animated rewards and effects from cached shadows to prevent lingering silhouettes. Shadow caches refresh when the cellar or mausoleum doors finish opening or reset."
    ]
  },
  {
    "version": 72,
    "date": "2026-10-09",
    "title": "Remaining first-floor stations along the walls",
    "tags": [
      "Map"
    ],
    "changes": [
      "Turned the library's Quickhands upgrade and M12 shotgun against its inner wall, with their displays facing into the library and clear of the shelves and entrance.",
      "Moved Ballroom Double Damage and Portrait Gallery ammunition into clear outer-wall bays. Repositioned Infirmary ammunition, the Observatory's North ammunition station and the chapel shotgun along suitable walls, facing into their rooms without crowding beds, pews, windows, artwork or doorways.",
      "Preserved every previously adjusted first-floor station, including Ironheart, Deadeye, Nightstride, Raven SMG, the Soul Forge, Conservatory grenades and courtyard ammunition. Upstairs and cellar placements are unchanged."
    ]
  },
  {
    "version": 71,
    "date": "2026-10-09",
    "title": "Upstairs station placement",
    "tags": [
      "Map"
    ],
    "changes": [
      "Repositioned all 13 upstairs perk, weapon, ammunition, power-up, armor and Soul Forge stations against suitable walls, with displays and lettering facing into their rooms.",
      "Placed the bedroom perks and gallery weapons between windows, moved the gallery supplies beside clear corridor walls, and separated the East Study's rifle, armor and Deadeye stations. The upper Soul Forge now backs onto the Private Salon's inner wall.",
      "Kept room entrances, windows, furniture and purchase approaches clear. Downstairs placements remain unchanged."
    ]
  },
  {
    "version": 70,
    "date": "2026-10-09",
    "title": "Wider grenade damage radius",
    "tags": [
      "Gameplay"
    ],
    "changes": [
      "Doubled grenades' damage radius against all undead from 6 to 12 meters. Damage and knockback taper across the wider area, with the same peak damage and minimum damage.",
      "Kept the existing explosion graphic, color, size, animation and timing. Solid walls and floors still block grenade damage."
    ]
  },
  {
    "version": 69,
    "date": "2026-10-09",
    "title": "Conservatory grenades along the window wall",
    "tags": [
      "Map"
    ],
    "changes": [
      "Turned the Conservatory's grenade purchase shrine 90 degrees right and moved it against the window wall, centered in the clear bay between the middle plants and windows. Its grenade display and lettering face into the room, with a clear purchase approach."
    ]
  },
  {
    "version": 68,
    "date": "2026-10-09",
    "title": "Music Salon station cleanup",
    "tags": [
      "Map"
    ],
    "changes": [
      "Removed the Raven SMG rack from the Music Salon, including its purchase prompt, collision and map marker.",
      "Turned the Music Salon's Nightstride upgrade 180 degrees and moved it against the wall, with its boots, speed display and front lettering facing into the room."
    ]
  },
  {
    "version": 67,
    "date": "2026-10-09",
    "title": "Raven and Deadeye against the walls",
    "tags": [
      "Map"
    ],
    "changes": [
      "Turned the first-floor Raven SMG 90 degrees left and moved its weapon rack against the dining room's inner wall, facing into the room.",
      "Turned the first-floor Deadeye upgrade 180 degrees and backed it against the dining room's front wall, centered between the side walls with its target display and lettering facing the room."
    ]
  },
  {
    "version": 66,
    "date": "2026-10-09",
    "title": "Ironheart along the entrance wall",
    "tags": [
      "Map"
    ],
    "changes": [
      "Turned the first-floor Ironheart health upgrade 90 degrees left and moved it against the hall wall, centered between the nearby column and the front entrance corner. Its heart display and front lettering face into the hall, with a clear approach for purchasing the perk."
    ]
  },
  {
    "version": 65,
    "date": "2026-10-09",
    "title": "Courtyard ammunition beneath the window",
    "tags": [
      "Map"
    ],
    "changes": [
      "Moved the front entrance ammunition crate beneath the ground-floor window to the left of the main doors. It remains outside, facing the courtyard, with space from the wall and a clear approach off the entrance path."
    ]
  },
  {
    "version": 64,
    "date": "2026-10-09",
    "title": "Unclipped portrait frames",
    "tags": [
      "Map",
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Adjusted nine portrait placements while preserving the original artwork. Lowered the ballroom frames and proportionally resized the front portrait-gallery frames and east dining-room frame to fit beneath the upstairs slab.",
      "Moved the mantel portrait onto the dining room's clear north wall, moved the ballroom's window-side portrait onto solid wall, and restored the hall portrait on a clear side wall instead of the lintel where upstairs cleanup removed it.",
      "All 15 estate portraits retain their complete artwork and frames after ceiling cleanup and batching, with clearance from floors, ceilings, furnishings, signs, curtains and wall trim."
    ]
  },
  {
    "version": 63,
    "date": "2026-10-09",
    "title": "More lifelike, bloodied undead",
    "tags": [
      "Visuals",
      "Performance"
    ],
    "changes": [
      "Resculpted walker, brute and feral faces with continuous scowling brow ridges, cheekbones, hollow temples and tapered jaws; refined head proportions, ears, noses, lips and uneven teeth while keeping the estate's horror style.",
      "Reshaped shoulder sleeves, elbows, tapered forearms, hands, knuckles and calves to connect more naturally through walking, strikes and dynamic ragdoll falls.",
      "Added mottled skin, pores, bruising, veins, worn cloth weave, fur and bone surface detail, plus blood around mouths, facial cuts, limbs, uniforms and both dog variants. Blood sits on the model surfaces and has a wetter finish without floating decals.",
      "Kept glowing red eyes on all enemy types and added bright iris cores with darker edges. Shared mipmapped surface maps and enemy shaders are prepared during loading; live enemies reuse the cached assets and humanoid models use fewer triangles."
    ]
  },
  {
    "version": 62,
    "date": "2026-10-09",
    "title": "Three Soul Forge ranks per weapon",
    "tags": [
      "Gameplay",
      "Interface",
      "Visuals"
    ],
    "changes": [
      "Added three Soul Forge ranks for every weapon at both forges: 4,000 essence for Rank 1, 5,000 for Rank 2 and 6,000 for Rank 3. Each weapon keeps its own progress, shared between floors.",
      "Each rank reapplies the existing bonuses: damage reaches 2×, 4× and 8× base damage; magazine and reserve capacities multiply by 1.25 per rank, rounded up from their base capacities; reload time multiplies by 0.75 per rank and still stacks with Quickhands.",
      "Forge plaques and interaction prompts now show the next rank and price for your equipped weapon, the HUD shows its current rank, and fully forged weapons cannot be charged again. Switching weapons updates both forges.",
      "Forging preserves carried rounds and partial reload progress; reloads, purchased ammo and Max Ammo use the correct rank capacity. All forge ranks reset with a new run, and the field guide explains the progression."
    ]
  },
  {
    "version": 61,
    "date": "2026-10-09",
    "title": "Sharper, better placed estate signage",
    "tags": [
      "Visuals",
      "Map",
      "Fixes"
    ],
    "changes": [
      "Rebuilt signs with aspect-correct, higher-resolution textures, measured lettering, consistent margins and properly separated lines; angled signs use improved texture filtering.",
      "Realigned room names on both floors, restored plaques below the upstairs slab and separated station names from descriptions and prices without crowding cabinet trim.",
      "Remounted the mansion crest, cellar and cemetery signs, mausoleum plaques and nuke console labels to clear roof faces, windows, artwork and decorative stonework; the downstairs Soul Forge now has its own wall plaque."
    ]
  },
  {
    "version": 60,
    "date": "2026-10-09",
    "title": "Clear doorways and room circulation",
    "tags": [
      "Map",
      "Fixes"
    ],
    "changes": [
      "Moved library and archive shelves, library furniture, the dining set and the downstairs Soul Forge away from entrances and their approach paths.",
      "Aligned the library entrance and upstairs rear landing doors with the staircase so the openings stay clear of banisters; fully opened the front doors and stopped entrance trim at the jambs.",
      "Kept loose debris out of doorway approaches and added clearance checks for all 40 mansion, cellar, mausoleum and cemetery entrances, including low and eye-height visibility and movement in both directions."
    ]
  },
  {
    "version": 59,
    "date": "2026-10-09",
    "title": "Furnishing the haunted estate",
    "tags": [
      "Visuals",
      "Gameplay"
    ],
    "changes": [
      "Rebuilt room furniture with padded sofas, open oak bookshelves, paneled cabinets, detailed beds, writing desks and properly proportioned chairs and benches.",
      "Replaced oversized room props with a curved 88-key grand piano, music stands, potted plants, brass tripod telescopes, terrestrial globes and sculpted busts.",
      "Arranged furnishings for bedrooms, nursery, study, archives, infirmary and galleries while keeping doors, windows, stairs and supply stations clear.",
      "Fixed stretched rugs on both floors with uniformly scaled woven patterns, consistent-width borders and fringes; portrait artwork now keeps its proportions.",
      "Matched furniture collision to its actual rotation and added solid landing support for low furnishings; shared static model geometry keeps the new assets reusable."
    ]
  },
  {
    "version": 58,
    "date": "2026-10-08",
    "title": "Nano Shield Rank 2",
    "tags": [
      "Gameplay",
      "Visuals",
      "Interface"
    ],
    "changes": [
      "Added Nano Shield Rank 2 for 7,500 essence, unlocked at both original armor stations after Rank 1 is purchased.",
      "Rank 2 regenerates 10 shield per second after 3 seconds without a hit; every hit restarts the delay. Upgrading keeps current shield and capacity.",
      "Added gold twin-halo Rank 2 emitters, rank labels, map markers and updated armor instructions; both ranks reset with a new run."
    ]
  },
  {
    "version": 57,
    "date": "2026-10-08",
    "title": "Larger FPS counter",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Increased the in-game FPS counter text size by 50%, from 8 to 12 pixels."
    ]
  },
  {
    "version": 56,
    "date": "2026-10-08",
    "title": "Higher brute headshot bounty",
    "tags": [
      "Gameplay"
    ],
    "changes": [
      "Increased brute headshot kill rewards from 100 to 200 essence."
    ]
  },
  {
    "version": 55,
    "date": "2026-10-08",
    "title": "The estate’s complete changelog",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Added a Change Log button to the main landing menu with the complete history from version 1 onward.",
      "Added searchable release notes, category filters, oldest/newest ordering and expandable updates in a scrolling panel.",
      "Made release notes part of the required update checks so future game changes must include a new changelog entry."
    ]
  },
  {
    "version": 54,
    "date": "2026-10-08",
    "title": "Nano Shield armor upgrade",
    "tags": [
      "Gameplay",
      "Visuals",
      "Interface"
    ],
    "changes": [
      "Buying Aegis body armor now unlocks Nano Shield at both original armor locations for 5,000 essence.",
      "Nano Shield regenerates 5 shield per second after 5 seconds without a hit, up to full capacity, including recovery from zero.",
      "Every hit stops regeneration and restarts the delay, even when fully absorbed by armor; pause freezes recovery.",
      "Added glowing nanite emitters and a HUD recharge countdown; the upgrade keeps current shield and supports Ironheart."
    ]
  },
  {
    "version": 53,
    "date": "2026-10-08",
    "title": "The Last Dawn mausoleum nuke",
    "tags": [
      "Gameplay",
      "World",
      "Visuals"
    ],
    "changes": [
      "Added a modeled nuke device inside the mausoleum after its wave-20-clear unlock.",
      "Press E to spend 20,000 essence on one activation per run, killing every currently living enemy across all floors.",
      "Award normal body-kill essence for each victim; queued enemies continue spawning.",
      "Added armed/spent states and a brief blast flash; an empty map does not waste the device."
    ]
  },
  {
    "version": 52,
    "date": "2026-10-08",
    "title": "AR-15 / .450 Bushmaster",
    "tags": [
      "Weapons",
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added the upstairs .450 Bushmaster rack for 2,500 essence, selectable with key 5.",
      "Added semi-automatic fire, a 15-round magazine, 90 reserve and twice the M4 base damage.",
      "Added a true 10× scope with a clear viewing bore, precision reticle and proportionally slower scoped mouse aim.",
      "Created a heavy-barrel AR model and integrated its ammo, reloads, perks, pickups and Soul Forge upgrades."
    ]
  },
  {
    "version": 51,
    "date": "2026-10-08",
    "title": "Brute headshot bounty",
    "tags": [
      "Gameplay"
    ],
    "changes": [
      "Changed brute headshot kills to award 100 essence.",
      "Kept brute body kills at 110, other headshots at 75 and the separate hit award unchanged."
    ]
  },
  {
    "version": 50,
    "date": "2026-10-08",
    "title": "Bloody claw-slashed Blackthorn title",
    "tags": [
      "Visuals",
      "Interface"
    ],
    "changes": [
      "Gave the Blackthorn landing title visible zombie claw cuts, blood staining and drips.",
      "Kept the title readable and accessible without adding animation overhead."
    ]
  },
  {
    "version": 49,
    "date": "2026-10-08",
    "title": "Call of Zombies on the landing page",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Added CALL OF ZOMBIES beneath THE HOUSE REMEMBERS on the main menu."
    ]
  },
  {
    "version": 48,
    "date": "2026-10-08",
    "title": "Angrier faces and glowing red eyes",
    "tags": [
      "Visuals"
    ],
    "changes": [
      "Updated every zombie and hound face with meaner brows, narrowed eyes and snarling expressions.",
      "Gave all ten enemy designs glowing red eyes through movement, attacks, rage and ragdoll deaths."
    ]
  },
  {
    "version": 47,
    "date": "2026-10-08",
    "title": "General FPS and smoothness pass",
    "tags": [
      "Performance",
      "Fixes"
    ],
    "changes": [
      "Reduced rendering and update work by batching enemy colors, pooling effects and using a fixed environment-light pool.",
      "Froze static world transforms and reduced collision and ragdoll allocations.",
      "Prepared lighting, weapon and enemy rendering during loading to reduce first-use hitches.",
      "Preserved the existing combat, animation and graphics settings."
    ]
  },
  {
    "version": 46,
    "date": "2026-10-08",
    "title": "Infinite Grenades recovery time",
    "tags": [
      "Gameplay"
    ],
    "changes": [
      "Added a 0.5-second cooldown after each Infinite Grenades throw.",
      "Refreshing the bonus cannot bypass the cooldown; timers pause and reset with the run."
    ]
  },
  {
    "version": 45,
    "date": "2026-10-08",
    "title": "Readable field guide",
    "tags": [
      "Interface",
      "Fixes"
    ],
    "changes": [
      "Rebuilt the controls and field guide inside a viewport-sized panel with its own scrolling reading area.",
      "Added section jump links, clearer type, responsive layouts, contained keyboard focus and reliable close controls.",
      "Opening from a run pauses safely; closing returns to the opener without recapturing the mouse."
    ]
  },
  {
    "version": 44,
    "date": "2026-10-08",
    "title": "Animated grenade throws",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added a modeled arm with throwing windup, grenade release and follow-through; the gun lowers during the throw.",
      "Grenades now launch from the hand using the current aim, with safe wall clearance.",
      "Integrated the animation with pause, death, restart and the Infinite Grenades bonus."
    ]
  },
  {
    "version": 43,
    "date": "2026-10-08",
    "title": "Floating guns restored",
    "tags": [
      "Weapons",
      "Visuals"
    ],
    "changes": [
      "Removed the small hand and forearm graphics from all gun models, restoring the floating-weapon view."
    ]
  },
  {
    "version": 42,
    "date": "2026-10-08",
    "title": "More recognizable weapon models",
    "tags": [
      "Weapons",
      "Visuals"
    ],
    "changes": [
      "Rebuilt the M4, M12, Raven and Warden with distinct receivers, stocks, magazines, barrels, controls and accessories.",
      "Updated matching weapon-rack exhibits, muzzle positions and clear, centered optics."
    ]
  },
  {
    "version": 41,
    "date": "2026-10-08",
    "title": "Larger reload and grenade text",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Doubled the reload and grenade HUD text size for better readability."
    ]
  },
  {
    "version": 40,
    "date": "2026-10-08",
    "title": "Matching stair rails and safe drops",
    "tags": [
      "World",
      "Fixes"
    ],
    "changes": [
      "Lowered stair banisters to match the 0.72-meter upstairs railing height.",
      "Fixed partial and diagonal jumps into the stairwell so players land and can escape instead of falling into a trapped gap."
    ]
  },
  {
    "version": 39,
    "date": "2026-10-08",
    "title": "Jumpable upstairs balcony rails",
    "tags": [
      "World",
      "Gameplay"
    ],
    "changes": [
      "Lowered second-floor railings so players can jump over them and drop into the first-floor hall.",
      "Kept ordinary walking guards and floor landing checks."
    ]
  },
  {
    "version": 38,
    "date": "2026-10-08",
    "title": "Public leaderboard reliability",
    "tags": [
      "Interface",
      "Fixes"
    ],
    "changes": [
      "Made the shared game and leaderboard usable by anyone with the game link without signing in.",
      "Added automatic leaderboard refresh every 15 seconds while open and on returning to the tab.",
      "Kept previous scores visible on temporary errors and preserved pending submissions for safe retries.",
      "Preserved all shared scores across releases."
    ]
  },
  {
    "version": 37,
    "date": "2026-10-08",
    "title": "Armor and LMG purchase prices",
    "tags": [
      "Gameplay",
      "Weapons"
    ],
    "changes": [
      "Set both Aegis vests to 2,500 essence and the cellar Warden LMG to 5,000 essence.",
      "Added affordability checks and price labels; denied purchases cannot grant armor, the weapon or frenzy.",
      "Kept purchases separate from total essence earned for leaderboard scoring."
    ]
  },
  {
    "version": 36,
    "date": "2026-10-08",
    "title": "Upstairs body armor",
    "tags": [
      "World",
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added an Aegis vest in the upstairs east study using the same separate shield mechanic as the cellar armor.",
      "Added modeled vest plates, straps and pouches, a floor-map marker and guarded upstairs-only interaction.",
      "Kept shield capacity compatible with Ironheart."
    ]
  },
  {
    "version": 35,
    "date": "2026-10-08",
    "title": "Obstructing forge box removed",
    "tags": [
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Removed a separate wooden cabinet beside the downstairs Soul Forge that remained after the pedestal change.",
      "Cleared its collision so the floor-level anvil is unobstructed."
    ]
  },
  {
    "version": 34,
    "date": "2026-10-08",
    "title": "Clean dark front roof",
    "tags": [
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Removed the front stone fascia block that interrupted the dark roof, exposing the roof finish behind it."
    ]
  },
  {
    "version": 33,
    "date": "2026-10-08",
    "title": "More exterior surface cleanup",
    "tags": [
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Recessed ceiling end caps at exposed roof joins.",
      "Separated window crossbars from mullions to reduce competing faces and flashing."
    ]
  },
  {
    "version": 32,
    "date": "2026-10-08",
    "title": "Downstairs forge pedestal removal",
    "tags": [
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Removed the downstairs forge display plinth and lowered the anvil and hovering stone to their floor-level presentation.",
      "Adjusted the forge exhibit collision to its smaller footprint."
    ]
  },
  {
    "version": 31,
    "date": "2026-10-08",
    "title": "Anvil Soul Forge and expanded upgrades",
    "tags": [
      "Weapons",
      "Visuals"
    ],
    "changes": [
      "Rebuilt both Soul Forges as iron anvils beneath hovering, animated violet soul stones.",
      "Forging now adds 25% magazine and reserve capacity and 25% faster reloads alongside doubled damage.",
      "Rounded ammo capacities upward and supported Quickhands, purchases during reload and separate upgrades for each weapon."
    ]
  },
  {
    "version": 30,
    "date": "2026-10-08",
    "title": "Larger, tougher brutes",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Increased brute model size and health by 33%, including both wave-five bosses.",
      "Matched body collision, spawn clearance and navigation to the larger dimensions.",
      "Added crouched movement under upstairs and mausoleum headers so larger brutes still traverse the map."
    ]
  },
  {
    "version": 29,
    "date": "2026-10-08",
    "title": "Compact HUD and corner compass",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Reduced gameplay HUD text, bars, icons and indicators by 50% from their enlarged size.",
      "Moved the compass to the top right with essence and kills directly below it.",
      "Regrouped bottom vitals and equipment and separated the location label from the compass."
    ]
  },
  {
    "version": 28,
    "date": "2026-10-08",
    "title": "Clear cellar approaches; tomb escape fixes",
    "tags": [
      "World",
      "Fixes"
    ],
    "changes": [
      "Moved the storm cellar out of the rear doorway and added generous level space on both sides of its stairs.",
      "Connected the relocated stairs to the armory with an underground passage and protected the surface drop with an end rail.",
      "Fixed the mausoleum coffin trap with full-height collision, a supported lid and walkable escape routes around every edge.",
      "Widened the rear tomb passage and updated maps, paving and enemy routes."
    ]
  },
  {
    "version": 27,
    "date": "2026-10-08",
    "title": "Wave-five boss finale",
    "tags": [
      "Gameplay",
      "Interface"
    ],
    "changes": [
      "Added The Enraged Pair: two permanently enraged brutes at the end of wave 5.",
      "Added independent boss health bars, encounter announcements and safe spawn retries.",
      "Wave 5 now ends only after both bosses are defeated."
    ]
  },
  {
    "version": 26,
    "date": "2026-10-07",
    "title": "Exterior clipping cleanup",
    "tags": [
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Separated doorway trim, lintels, molding and window backing from competing wall surfaces.",
      "Removed old coffer panels that overlapped the upstairs ceiling slab to reduce exterior flashing."
    ]
  },
  {
    "version": 25,
    "date": "2026-10-07",
    "title": "Feral stalkers",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added Feral zombies from wave 7 at roughly one in eight total spawns.",
      "Ferals move three times as fast and hit twice as hard as standard zombies at that wave.",
      "Added a gaunt, ribbed model with long claws and a forward-leaning sprint; Ferals support rage, headshots, stairs and ragdolls."
    ]
  },
  {
    "version": 24,
    "date": "2026-10-07",
    "title": "Permanent Blood Rage",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Each enemy death gives nearby living enemies within six meters an independent 15% chance to become enraged.",
      "Rage permanently doubles movement speed and increases melee or bite damage by 25%, for every enemy type.",
      "Added red rage materials and radar markers; rage does not stack and lasts until that enemy dies."
    ]
  },
  {
    "version": 23,
    "date": "2026-10-07",
    "title": "Direct game-tab launch and capture fixes",
    "tags": [
      "Interface",
      "Fixes"
    ],
    "changes": [
      "Enter the Estate now opens the game directly in a new tab and carries over quality, sensitivity and sound settings.",
      "The game tab prepares a paused run; Click to Play requests mouse capture without launching another tab.",
      "Improved capture retry, legacy focus handling and safe pause when mouse capture is lost."
    ]
  },
  {
    "version": 22,
    "date": "2026-10-07",
    "title": "Larger menu and gameplay text",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Increased landing-page copy, buttons, settings and supporting text by 50%, preserving the Blackthorn title size.",
      "Doubled gameplay HUD text and elements, including bars, icons, radar and crosshair.",
      "Added scrolling for shorter landing screens and sharper radar backing resolution."
    ]
  },
  {
    "version": 21,
    "date": "2026-10-07",
    "title": "Crowds that block routes; upstairs spawns",
    "tags": [
      "Gameplay",
      "Fixes"
    ],
    "changes": [
      "Added size-appropriate collision between living enemies and the player; dense crowds can block doors and stairs until a gap is cleared.",
      "Varied route tie-breaking, approach sides and local avoidance, with preference for less crowded alternatives.",
      "Enabled safe, connected second-floor spawns from wave 11, respecting floor support, distance and occupied spaces."
    ]
  },
  {
    "version": 20,
    "date": "2026-10-07",
    "title": "Grass grounds and cemetery boundaries",
    "tags": [
      "World",
      "Visuals"
    ],
    "changes": [
      "Covered mansion lawns and cemetery ground with textured grass while retaining clear stone paths.",
      "Added 900 grass tufts and connected the cemetery entry path to the east walkway.",
      "Removed loose paving and old graves outside the cemetery; all headstones now sit inside its boundary."
    ]
  },
  {
    "version": 19,
    "date": "2026-10-07",
    "title": "Persistent shared leaderboard",
    "tags": [
      "Interface"
    ],
    "changes": [
      "Added a shared top-50 leaderboard accessible from the landing and pause menus.",
      "Death now offers optional name entry and explicit score submission, recording total essence earned, wave, kills and survival time.",
      "Kept scores in persistent shared storage across game versions; purchases do not reduce the recorded score.",
      "Added one submission identity per run so retries do not duplicate entries."
    ]
  },
  {
    "version": 18,
    "date": "2026-10-07",
    "title": "Family cemetery and mausoleum",
    "tags": [
      "World",
      "Gameplay"
    ],
    "changes": [
      "Added the east family cemetery with fourteen marked graves, fencing, stone paths and reachable enemy spawns.",
      "Added the Blackthorn mausoleum, sealed until wave 20 is cleared, then opened its twin doors automatically.",
      "Created an explorable tomb with sarcophagus, columns, crest and epitaph, plus map labels and enemy pursuit through the doorway."
    ]
  },
  {
    "version": 17,
    "date": "2026-10-07",
    "title": "Kill rewards halved",
    "tags": [
      "Gameplay"
    ],
    "changes": [
      "Reduced all kill bounties by 50%: normal body kills to 50 essence, brute body kills to 110 and headshot kills to 75.",
      "Kept the separate 10-essence hit award and wave-clear bonuses."
    ]
  },
  {
    "version": 16,
    "date": "2026-10-07",
    "title": "Storm cellar, Warden LMG and Aegis armor",
    "tags": [
      "World",
      "Weapons",
      "Gameplay"
    ],
    "changes": [
      "Added twin storm doors that open at wave 10, stairs and an 18 × 20 meter underground armory with its own floor map.",
      "Introduced the Warden belt-fed LMG with a 100-round magazine, 500 reserve and weapon key 4.",
      "Taking the LMG triggers faster enemies, accelerated spawning and extra reinforcements for the rest of the current wave.",
      "Added a one-time Aegis vest and separate shield bar; shield absorbs damage before health and supports Ironheart.",
      "Connected player and enemy navigation across all three floors with floor-aware combat and pickups."
    ]
  },
  {
    "version": 15,
    "date": "2026-10-07",
    "title": "Hound scaling and durability",
    "tags": [
      "Gameplay"
    ],
    "changes": [
      "Both hound variants now speed up with the same wave progression as standard zombies while retaining their type speed multipliers.",
      "Made Ashfangs exactly twice as durable as ordinary dogs at the same wave."
    ]
  },
  {
    "version": 14,
    "date": "2026-10-06",
    "title": "Rare Ashfang hounds",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added rare Ashfang hounds from wave 6, roughly one in twenty spawn slots, moving at 150% of standard zombie speed.",
      "Created a charcoal, horned model with a pale skull mask, exposed ribs, dorsal spines and barbed tail.",
      "Added a bounding gait, distinctive growl and cyan radar markers."
    ]
  },
  {
    "version": 13,
    "date": "2026-10-06",
    "title": "Themed supplies on both floors",
    "tags": [
      "Visuals",
      "World",
      "Weapons"
    ],
    "changes": [
      "Replaced generic station displays with hearts, magazines and gears, cartridge targets, winged boots, ammo cases, weapon racks and a spectral forge.",
      "Added rotating 3D ammo-case, ×2 and grenade models to dropped power-ups.",
      "Placed all four perks, shotgun and SMG racks, ammo stations, timed-bonus shrines and a Soul Forge upstairs.",
      "Added map station symbols and shared perk ownership so duplicate locations do not stack bonuses."
    ]
  },
  {
    "version": 12,
    "date": "2026-10-06",
    "title": "Distinct power-up icons; Infinite Grenades",
    "tags": [
      "Gameplay",
      "Interface"
    ],
    "changes": [
      "Gave Max Ammo an ammo-box icon and Double Damage a gold ×2 icon.",
      "Added a violet grenade power-up granting infinite grenade throws for 12 seconds, including when stored grenades are empty.",
      "Added matching active-bonus HUD icons and countdowns; repeated drops refresh their duration and pausing freezes timers."
    ]
  },
  {
    "version": 11,
    "date": "2026-10-06",
    "title": "Combat hitch reduction",
    "tags": [
      "Performance",
      "Fixes"
    ],
    "changes": [
      "Cached enemy models and shared their geometry while keeping each animated skeleton independent.",
      "Prepared shaders and enemy buffers during loading, pooled combat lights and kept flashlight toggles from rebuilding lighting shaders.",
      "Reduced repeated collision, navigation, ragdoll and HUD work; made the FPS counter include stall time."
    ]
  },
  {
    "version": 10,
    "date": "2026-10-06",
    "title": "Upstairs room cleanup",
    "tags": [
      "World",
      "Visuals",
      "Fixes"
    ],
    "changes": [
      "Increased upstairs clear ceiling height by 25%, from 2.32 to 2.90 meters.",
      "Realigned doorways and headers, cleared intrusive ornament, moved furniture toward room edges and replaced low ceiling fittings.",
      "Added fifteen real window openings looking onto the front courtyard and side grounds."
    ]
  },
  {
    "version": 9,
    "date": "2026-10-06",
    "title": "Zombie dogs",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added ordinary zombie dogs to mixed waves from wave 1, typically one in five spawns, moving at 125% of standard zombie speed.",
      "Created a distinct four-legged model with ears, snarling muzzle, collar and tail, plus trotting, bite windups and canine ragdolls.",
      "Gave dogs stair traversal, headshots and leg hit reactions."
    ]
  },
  {
    "version": 8,
    "date": "2026-10-06",
    "title": "Walkable stairs and explorable upstairs",
    "tags": [
      "World",
      "Gameplay",
      "Fixes"
    ],
    "changes": [
      "Rebuilt the grand staircase with twenty visible treads and a smooth walking slope for normal ascent and descent.",
      "Opened bedrooms, nursery, studies, reading room, salons, reliquary and balcony galleries across the second floor.",
      "Added upstairs ammo, furnishings, windows and lighting, with height-aware walls, railings, gravity and ceiling clearance.",
      "Enabled enemies to chase between floors; kept attacks, purchases, grenades and corpses on the correct floor."
    ]
  },
  {
    "version": 7,
    "date": "2026-10-06",
    "title": "New zombie models and dynamic deaths",
    "tags": [
      "Gameplay",
      "Visuals"
    ],
    "changes": [
      "Added five estate-themed zombie designs with modeled faces, layered clothing, curved fingers and moving jaws.",
      "Improved limping strides, asymmetric movement, turning, hit reactions and telegraphed attacks.",
      "Added seven impact-driven fall profiles, directional ragdolls, leg buckling and grenade tumbles with floor and wall collision.",
      "Limited lingering corpses to 14 and cleaned up settled bodies."
    ]
  },
  {
    "version": 6,
    "date": "2026-10-06",
    "title": "Reliable mouse lock",
    "tags": [
      "Fixes",
      "Interface"
    ],
    "changes": [
      "Required confirmed mouse capture before movement, firing or the simulation could run.",
      "Made Esc release the cursor and pause without immediately recapturing it; Resume and map closing request capture safely.",
      "Added retry handling for rejected, delayed, cancelled and legacy capture requests, and pause on lost focus."
    ]
  },
  {
    "version": 5,
    "date": "2026-10-06",
    "title": "A much larger mansion; cleaner rendering",
    "tags": [
      "World",
      "Visuals",
      "Performance"
    ],
    "changes": [
      "Expanded the mansion to 84 × 96 meters—12 times its original footprint—with connected galleries, ballroom, conservatory, chapel, observatory and other wings.",
      "Added a floor map on M, distant supply stations, local enemy spawning and connected routes throughout the estate.",
      "Reduced texture shimmer, overlapping decorations and doubled columns; removed effects contributing to ghosting and halos.",
      "Cleared each frame explicitly and gave weapons their own depth pass; added spatial batching, collision lookup and pooled wing lights."
    ]
  },
  {
    "version": 4,
    "date": "2026-10-06",
    "title": "Lighting, materials and clear optics",
    "tags": [
      "Visuals",
      "Weapons"
    ],
    "changes": [
      "Added detailed oak and limestone materials, reflections, wet stone, carved arches, coffered ceilings, grass, dust and animated fireplace flames.",
      "Brightened the final image by 15%.",
      "Rebuilt rifle and reflex sights with open frames, nearly clear lenses and illuminated reticles aligned with shots."
    ]
  },
  {
    "version": 3,
    "date": "2026-10-06",
    "title": "Launch crash fixed",
    "tags": [
      "Fixes",
      "Interface"
    ],
    "changes": [
      "Fixed a startup crash caused by the HUD updating a grenade element that had already been replaced.",
      "Checked startup against the real page markup and refreshed game asset versions."
    ]
  },
  {
    "version": 2,
    "date": "2026-10-06",
    "title": "Entry and startup recovery",
    "tags": [
      "Fixes",
      "Interface"
    ],
    "changes": [
      "Made the Enter button wait for the game to finish loading, then launch through a reliable ready handler.",
      "Added visible startup errors, a loading timeout and a reload button instead of leaving players at a stalled menu.",
      "Handled denied or unsupported mouse capture and closed audio sessions more safely."
    ]
  },
  {
    "version": 1,
    "date": "2026-10-06",
    "title": "The first night",
    "tags": [
      "Gameplay",
      "World",
      "Weapons"
    ],
    "changes": [
      "Launched the haunted mansion and bounded grounds with mouse look, keyboard movement, sprinting, jumping, flashlight, aiming, reloading and grenades.",
      "Added escalating zombie waves, tougher brutes from wave 5, essence for hits and kills, headshot bonuses and wave-clear rewards.",
      "Introduced the M4, purchasable M12 shotgun and Raven SMG, ammo stations and the original damage-doubling Soul Forge.",
      "Added Ironheart, Quickhands, Deadeye and Nightstride perks, Max Ammo and Double Damage drops, death/restart, local personal bests and three graphics settings.",
      "Established nighttime shadows, fog, rain, clouds, muzzle lighting and the original hall, library, dining room and courtyard."
    ]
  }
];
export const CURRENT_VERSION=RELEASES[0].version;
