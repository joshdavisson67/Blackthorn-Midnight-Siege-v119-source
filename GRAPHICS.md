# Graphics pass — October 6, 2026

## Generated material assets

Both textures were generated using the built-in image-generation tool and inspected before integration. The saved images are 1254 × 1254 RGB PNGs. Original generated files were preserved; these project copies are served with the game. Procedural fallback textures remain available if either image fails to load.

Current source asset paths:

- `/workspace/sites/blackthorn-zombies/public/game/assets/limestone-v1.png`
- `/workspace/sites/blackthorn-zombies/public/game/assets/oak-v1.png`

### Limestone prompt

Use case: photorealistic-natural. Asset type: seamless albedo texture for a realistic first-person haunted Victorian mansion game. Create one square 2048x2048 straight-on orthographic seamless tile of weathered carved limestone ashlar masonry: medium sized staggered rectangular blocks, believable tiny chips, fine porous stone grain, dark mortar recesses, mineral staining, subtle moss at some joins. Neutral medium gray warm limestone, very subtle irregular differences between blocks. Completely flat diffuse even studio illumination, no cast shadows, no perspective, no vignette, no directional light, no objects, no text. Photographic scanned material fidelity, visible microtexture; intended to tile on large 3D walls. Pattern continues cleanly across all four edges.

### Oak prompt

Use case: photorealistic-natural. Asset type: seamless albedo texture for the wooden floors and woodwork of a realistic first-person haunted Victorian mansion game. Create one square 2048x2048 orthographic directly-overhead seamless tile of eight narrow staggered antique oak floor planks with fine physically believable wood grain, small knots, worn varnish, tiny scratches, oxidized nail heads, narrow dark gaps. Warm medium brown aged oak, readable rather than nearly black, subtle differences between boards. Completely flat diffuse even illumination, no cast shadows, no reflections painted into the texture, no vignette, no perspective, no objects, no text. Photographic scanned material fidelity; intended to tile on a 3D floor. Pattern continues cleanly across all four edges.

## First graphics pass (version 4)

The display shader multiplies output RGB by 1.15 after tone mapping and color conversion, with highlights clamped to the display range. New lighting and materials also change scene appearance, so individual pixels are not an exact before/after brightness comparison.

The pass adds environment reflections, clearcoat on wet paving and oak floors, depth-based contact shading, multisample antialiasing, carved stonework, coffered ceilings, 900 instanced grass planes, drifting dust, and animated flame silhouettes. Enemies use smoother articulated shapes and gun receivers have beveled edges. Performance mode disables contact shading, multisampling, dust, and dynamic shadows.

The rifle's tube is open-ended. Shotgun and SMG optics use open reflex frames. All lenses have 3.5% opacity. The physical reticle replaces the HUD crosshair while aiming. Each weapon's height and scale are accounted for so the reticle lies at the camera's firing center.

## Texture cleanup and estate expansion (version 5)

The mansion is now 84 × 96 meters, or 8,064 m²: exactly 12 times the original 672 m² footprint. Eleven new connected sections add furnished rooms, multiple routes, exterior exits, remote supply stations, and an estate map on M. Automated navigation finds 6,788 reachable one-meter grid cells within the mansion, each tested with a collision-clearance radius; all twelve section centers have physically walkable routes to the original courtyard.

The cleanup removes chromatic fringing, the sparse ring-sampled bloom, animated grain, and screen-space depth occlusion halos. Every frame explicitly clears color and depth. The weapon is drawn separately after clearing depth, with normal depth testing and writing restored for its opaque parts. This fixes the known gun self-occlusion defect without allowing nearby walls to hide the weapon. Scope glass stays almost transparent and reticle alignment is preserved.

Material relief was reduced, noisy bump maps were removed from skin/fabric/metal, and roughness was increased on reflective surfaces to reduce shimmer. Texture minification uses mipmaps and anisotropic filtering. The rug was raised above the floor, duplicate column surfaces were removed, roof gable UVs were corrected, large transparent light cards were removed, and three overlapping flame cards were replaced by one. Spatial multisampling is retained without a temporal history buffer.

No new raster assets were generated for version 5. Browser screenshots and actual rendering still require visual confirmation; the source audit identified likely causes rather than proving which artifact the user observed.

## Verification limits

Automated checks use actual game HTML and real Three.js scene math, geometry and raycasting with a stubbed renderer. They verify gameplay startup, purchases, combat, progression, restart, brightness configuration, reticle alignment, and open scope sightlines. Real WebGL compilation, screenshots, and graphics quality remain unverified because browser preview infrastructure was unavailable. No claim of console-equivalent fidelity or a numerical order-of-magnitude improvement is made.

## Zombie models and animation (version 7)

Five procedural character designs replace the original capsule-like enemies: groundskeeper, footman, fallen guest, caretaker, and estate brute. Ring-profile garments have shaped shoulders, waists, hems and seams. Faces include modeled brow ridges, sunken sockets, cheekbones, noses, ears, uneven teeth, and an articulated jaw. Hands include curved fingers and thumbs; boots include soles and laces. Low-frequency vertex colors add surface variation without transparent overlays or noisy bump maps. Material batches preserve vertex colors and head/limb hit regions. A sampled ordinary zombie uses 34 mesh batches and 29,112 triangles; no real GPU frame-rate claim is made.

Movement uses distance-driven asymmetric strides, knee and ankle articulation, torso counter-rotation, head drift, wrist drag, smooth turning, and localized hit reactions. Attacks alternate arms with a wind-up, one contact event, and recovery; brutes use both arms. A leg hit causes a brief stumble. The attack only damages a nearby player with a clear path at the contact moment.

Deaths preserve the current animated pose and switch to a fixed 120 Hz constrained-particle ragdoll. Seven initial momentum profiles cover recoil, forward stumble, left/right shoulder collapse, twisting falls, knee buckles, and grenade throws. Shot direction, impact position and weapon impulse contribute momentum and torque. Limb constraints, floor contacts, friction and mansion collision prevent the former identical rigid backward fall. Ragdolls sleep after settling and remain opaque; corpses last 8–10 seconds with a 14-body budget. Cleanup releases per-enemy geometry and materials. Indoor floors, the porch, paths and lower grounds use their respective surface heights.

Focused checks cover animated-to-physics pose continuity, all character/fall variants, frame-rate independence, floor and wall contacts, finite positions, bounded bone lengths, settling, corpse expiry, attacks, batching and disposal. A nonuniform-scale pose discontinuity found by the checks was corrected. Browser screenshots and actual visual quality remain unverified under the preview limitation described above.


## Walkable stairs and second floor (version 8)

The old staircase's tall collision boxes were replaced by twenty 21.5-centimeter risers with 34-centimeter treads, sloped stringers, and handrails. A continuous walking surface rises 4.3 meters from the hall to the landing. Movement resolves height and wall clearance in short horizontal substeps; gravity, jumping and ceilings operate at the actor's actual elevation. Step-height checks reject entry through the side of a tall tread while leaving headroom beneath the upper flight.

An 84 × 24-meter second-floor extent covers the front wings, with an open atrium and stairwell reducing supported floor area to 1,885.6 m². Ten named upstairs areas connect bedrooms, dressing room, nursery, studies, galleries and private rooms to the landing. The build adds furnishings, framed plaques, inset windows, runners, four pooled upper lights, protective railings, and two ammunition crates. Existing front-wing hanging fixtures were lowered below the new floor. The decorative column inside the old stair flight was removed.

Collision objects carry vertical extents. A two-layer navigation field connects the floors through the stair endpoints; zombies preserve their current elevation while moving. The map and radar show the current floor, and supplies and attacks check vertical distance. Ragdoll particles, grenades, pickups, floor raycasts and grenade blast shielding account for elevation.

Automated checks find 1,428 reachable upper-floor grid cells and physically trace routes from every upstairs area to the landing. Actual movement handlers ascend and descend with less than ten centimeters of per-frame elevation change at the checked rate. Upstairs jumping respects ceiling clearance. Tests also confirm that zombies climb and descend, upper ragdolls remain supported, grenades bounce on the upper floor, and floor geometry blocks grenade damage below it. Browser rendering and screenshots remain unavailable; the same verification limit applies.


## Zombie dogs (version 9)

A new canine rig adds a gaunt torso, raised rib contours, coarse fur tufts, scars, pointed ears, glowing eyes, an articulated snarling jaw and fangs, a collar, four jointed legs with paws and claws, and a two-part tail. Three muted coat palettes vary the pack. The sampled model uses 38 material/joint batches and 20,896 triangles. All materials remain opaque, with low-frequency vertex-color variation.

Dogs enter mixed waves at every fifth spawn, beginning in wave one; scheduled brutes retain priority. Their speed is 1.25 times the wave's base walker speed, exceeding the ordinary walker range of 0.85–1.15. Dogs have 85% of ordinary health and bite damage. Diagonal trot pairs, body motion, paw articulation, tail movement, head motion and wind-up/lunge/recovery bites replace the humanoid animation. Bites damage once at contact and respect floor separation. The existing ragdoll solver uses canine torso and paw anchors; headshots, leg reactions, pickups, scoring, cleanup and stair traversal apply to dogs. Dogs appear violet on the current-floor radar.

Automated checks verify shape and mesh budgets, gait, attack timing, real headshot geometry, tagged limbs, speed, mixed-wave spawns, rewards, pose continuity, finite/settled ragdolls, and chasing up and down the staircase. Existing gameplay and two-floor checks also pass. Actual browser graphics and audio playback remain unverified under the preview limitation.


## Upstairs cleanup (version 10)

Clear upstairs height increases from 2.32m to 2.90m, with the ceiling underside at 7.20m. The inherited shell is normalized before adding upstairs geometry: 183 legacy meshes are clipped below the floor slab, 142 overlapping pieces are removed, and 32 roof details are raised. The staircase and atrium remain open, with their existing protective rails.

Aligned 2.8m-wide doorways connect the private rooms and wing corridors. Consistent oak skirting, cream/blue plaster, compact overhead fixtures, signs mounted above doors, complete chair legs, and fewer perimeter furniture groups replace the previous overlapping details. Fifteen exterior openings contain low-opacity, non-emissive glass, slim mullions and modeled frames/sills; no opaque window backing remains. Transparent panes stay outside static opaque batching. Full-height window collision boundaries prevent exiting through the panes.

All ten upstairs areas retain physically walkable routes to the landing (1,452 reachable upper navigation cells). Automated checks verify a ceiling at the new height in every named area, 180 clear window sightlines against the actual batched opaque geometry, twelve unobstructed doorways, window containment, and existing player/enemy stair traversal. The complete gameplay suite passes. Browser rendering, screenshots, WebGL shaders and frame rates remain unverified because supported browser QA is unavailable in this environment.


## Performance pass (version 11)

A likely source of intermittent stalls was adding/removing PointLights for each pickup and explosion: the bundled Three.js renderer includes light counts in its shader-program parameters. Four permanent combat lights now represent the strongest nearby effects. Pickups remain emissive when outside the four-light selection. Flashlight toggles use zero intensity instead of visibility, and the muzzle light stays attached to the camera so entering/exiting the menu does not alter light counts. Both camera lighting configurations compile during loading against the actual offscreen render target, followed by an initial upload/render of cached enemies before the entry button becomes available. Browser-side GPU timings remain unavailable, so the reported two-second stall is not claimed to be reproduced or conclusively resolved.

Eight prepared rigs cover four human variants, brutes and three dog palettes. Spawns clone only transforms and per-enemy state, reusing 192 bounded cached geometries and their materials. Animation phases, proportions and gait parameters still vary. Corpses can detach their own joints without touching other enemies or templates. Restart and corpse expiry retain the reusable assets. Pickup geometry/materials are shared, and reset cleans up transient blast materials.

Collision tests no longer create a Set for every AI sample or ragdoll particle. The fixed-step ragdoll constraint solver uses scalar arithmetic and a retained particle list instead of per-constraint vector clones. Navigation precomputes adjacency, skips unchanged targets, and checks direct AI sightlines on staggered intervals within twelve meters. A landing-grid seam now explicitly routes descending enemies onto the stair flight. Static collision and shared enemy geometry bounds are prepared before play. Repeated HUD markup is not replaced unless its contents change, and FPS uses unclamped wall-clock intervals.

Local CPU samples with the real geometry/physics and stubbed WebGL renderer (milliseconds, medians):

| Operation | Before | After |
| --- | ---: | ---: |
| Spawn an enemy | 11.50 | 0.33 |
| Frame with 32 live enemies | 1.83 | 0.86 |
| Frame after killing 14 enemies | 3.98 | 1.71 |
| Navigation rebuild | 0.35 | 0.18 |

These short samples are indicative, not browser FPS or GPU measurements; randomized combat can change individual sample timings. `npm run profile` reproduces the current CPU stress workflow. Checks also cover warmup sequencing, unchanged scene light identities through combat/expiry/reset, 64 independently owned enemy hierarchies using only cached mesh assets, 6,000 collision-equivalence samples, and both-floor gameplay. All gameplay and architecture checks pass.


## Distinct power-ups (version 12)

The generic pickup gem is replaced by three camera-facing vector badges: a green ammunition box with a bullet stencil, a gold ×2, and a violet segmented grenade with a pull ring and lever. A shared vector recipe supplies matching HUD icons. Each type has one cached 512px texture and sprite material, prepared during the existing shader warmup; pickups keep depth testing and reuse the fixed combat-light pool.

The new Infinite Grenades pickup grants 12 seconds of free G-key throws, including at zero reserve. Stored grenades remain unchanged by those throws, normal consumption resumes at expiration, another grenade pickup refreshes the timer to 12 seconds, and pause/map screens freeze the timer. Double Damage remains 20 seconds; both bonuses display independently with icons and countdowns. The overall 13% enemy-drop chance is unchanged; successful drops select 60% Max Ammo, 20% Double Damage and 20% Infinite Grenades.

Automated checks cover icon differentiation and shared assets, new drops, free throwing and expiry, empty reserves, pause/resume, refresh, overlapping bonuses, ammunition refills, restart cleanup and floor separation. Browser screenshots and GPU rendering remain unavailable.


## Themed exhibits and upstairs equipment (version 13)

Generic cabinets become distinct low-poly exhibits. Ironheart has a glowing heart protected by brass cage bars; Quickhands shows twin feed magazines, gears and a reload bolt; Deadeye has a concentric target, crosshairs and heavy cartridge; Nightstride has winged boots and speed chevrons. Weapon racks display a pump shotgun with spare shells or a compact SMG with an extended magazine. Open ammunition cases show cartridges, while forge stations have an anvil, electrodes and a violet core. Timed-bonus shrines present a modeled ×2 or grenade in a relic halo. Labels and effect captions accompany each exhibit.

Dropped power-ups now include small rotating 3D models beneath their retained camera-facing icon badges. Geometry and materials are cached, station meshes enter static batching, and no extra runtime lights are introduced. The initialization sample has 699 mesh batches before live pickups/enemies. The fixed combat-light and shader-warmup checks still pass.

Eleven upstairs stations comprise four perks, two weapon purchases, two ammo stations, two timed-bonus shrines and a forge. Each has a clear, physically traced path to the landing. Prices and perk ownership match downstairs; timed shrines cost 800 for 20 seconds of Double Damage and 900 for 12 seconds of Infinite Grenades. Duplicate perk stations do not stack bonuses. Ground-floor counterparts for the two timed shrines sit in the front wings. Both floor maps use distinct station symbols and a legend.

All purchase types, affordability, upstairs-only interaction, duplicate ownership, room routes, stair traversal, window sightlines, pickup timers and performance invariants pass automated checks. Ground-floor reachability is 6,784 grid cells and upstairs reachability is 1,429. Browser rendering and screenshots remain unavailable.


## Ashfang hounds (version 14)

A second canine model combines charcoal hide and cool skin with a pale armored skull, extended muzzle, paired swept horns, cheek/shoulder plates, exposed ribs, a six-spike dorsal ridge, saber fangs and a barbed tail. Ice-blue eyes and subdued spectral seams distinguish it from the warmer-eyed ordinary dog. It is slightly larger, uses a paired-leg bounding gait with stronger body motion, has a higher growl, and appears cyan on the radar. Materials remain opaque; there are no added lights.

Ashfangs begin in wave 6 at every twentieth spawn slot, replacing an ordinary dog slot; existing brute priority is preserved. Consequently they remain less frequent than standard dogs. Speed is exactly 1.5 times the wave’s base zombie speed, versus 1.25 for ordinary dogs. Health, bite damage and rewards retain ordinary dog rules. The wave-six banner and field guide introduce the variant.

A ninth prebuilt template shares its cached geometry/materials across all Ashfang spawns and participates in startup shader/buffer warmup. The sampled model uses 43 mesh batches and 28,112 triangles; the full enemy cache contains 212 unique geometries. Tests verify no early spawns, rarity and brute priority through wave 40, actual wave-six spawning, exact speed, silhouette features, paired front-leg gait, single telegraphed bites, real skull-mask headshots, shared assets, ragdoll contacts/settling, and chasing up and down stairs. The existing gameplay suite passes. Browser rendering and screenshots remain unverified.


## Dog scaling and Ashfang durability (version 15)

Both dog variants already derive movement speed from the shared wave configuration at spawn. This progression is now explicitly regression-tested through wave 40: standard dogs retain a 1.25× baseline multiplier and Ashfangs retain 1.5×, with proportional increases and the same wave-17 baseline cap as zombies. Ashfang health is now exactly twice standard dog health at every wave (1.70× the baseline zombie health, versus 0.85× for an ordinary dog). Bite damage and spawn rarity are unchanged. Tests apply identical damage to both variants: a hit lethal to a standard dog leaves the Ashfang at half health; a second identical hit kills it.


## Storm cellar and Warden LMG (version 16)

An actual cutout in the rear grounds leads down 24 nosed treads into an 18 × 20 meter masonry armory. Twin iron leaves with brass straps, panel seams and handles rotate outward on independent hinges at wave 10. Railings, ceiling beams, wall columns, conduits, cyan fixture lenses and perimeter supply crates frame an open combat lane. A north-facing sign and ground-map marker identify the entrance; the underground map marks the two rewards and the exit stairs.

The Warden rack displays a heavy barrel, shroud, ammunition belt, box feed and bipod; the held weapon adds a belt box, brass links, larger shroud and folded bipod while retaining an unobstructed reticle. Body armor is a modeled plate carrier with shoulder straps, cyan front plate, webbing and lower pouches. Both exhibits disappear once claimed and reset on a new run. Static cellar surfaces join the existing material/spatial batching; doors and reward models stay separate. No new lights are added, no models are built during combat, and door transforms stop updating once fully opened. Rendering and screenshots remain unverified; gameplay/geometry verification uses the existing stub-renderer suite.


## Family cemetery and mausoleum (version 18)

The east fence has a real seven-meter opening bounded by stone gateposts, an iron header and a cemetery sign. A 26 × 42 meter extension adds fourteen individually inscribed headstones with semicircular caps, burial slabs and occasional memorial boxes. Crossing stone paths leave open approaches to a small eight-by-nine-meter family mausoleum. Iron-topped masonry fences contain the area. Warm emissive lantern lenses mark the path and crypt walls without adding lights.

The mausoleum uses masonry walls, a flush floor, fluted front columns, layered cornices, a triangular pediment with sloped edge moldings, an arched door surround and a family crest. Twin iron doors retain independent hinges for their opening animation. A visible padlock and wave-20 seal disappear when the wave is cleared. A raised stone sarcophagus with brass bands and a cross sits inside, leaving side circulation routes; a rear epitaph gives the tomb context. Static surfaces participate in the existing batching, while the doors, lock and seal remain separate. The map was rescaled to include the cemetery. Gameplay and geometry checks pass; browser rendering and screenshots remain unavailable.
