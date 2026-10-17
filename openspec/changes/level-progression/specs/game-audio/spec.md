# Spec Delta

## MODIFIED Requirements

### Requirement: Event-based sound cues
Cryptbound SHALL use a restrained catalog of 4 to 10 event-based sound effects and classify each cue as diegetic or non-diegetic in project documentation. A cue SHALL play only for its corresponding event and obey its bus volume and Mute All state.

#### Scenario: Diegetic game event
- **WHEN** a listed world action or combat event occurs
- **THEN** its documented diegetic cue may play once for that event, subject to audio settings

#### Scenario: Equipment drag result
- **WHEN** an equipment drag is accepted or rejected
- **THEN** the corresponding documented non-diegetic confirmation or rejection cue plays, subject to audio settings

#### Scenario: Level gain
- **WHEN** an XP award increases the character level
- **THEN** the documented non-diegetic level-gain chime plays once, subject to audio settings

#### Scenario: Muted event
- **WHEN** any documented event occurs while its bus or Mute All is muted
- **THEN** gameplay proceeds normally without audible output

The initial cue inventory is:

| Classification | Event | Cue intent |
|---|---|---|
| Diegetic | Player moves one tile | Quiet, short stone footstep; avoid a continuous walking loop |
| Diegetic | Player hits an enemy | Brief weapon impact |
| Diegetic | Enemy hits the player | Muted impact with light armor variation |
| Diegetic | Enemy is defeated | Short fall or dissolve cue |
| Diegetic | Potion is collected | Small glass and liquid chime |
| Diegetic | Chest opens | Brief latch and hinge sound |
| Diegetic | Player enters stairs to descend | Stone mechanism and short descending transition |
| Non-diegetic | Character gains a level | Clear, brief chime paired with the inward sparkle celebration |
| Non-diegetic | Compatible equipment drop is accepted | Quiet confirmation click |
| Non-diegetic | Equipment drop is rejected | Soft, short rejection tick |
