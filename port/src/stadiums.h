/* PES6 Vita — dynamic PS2 stadium loader and in-game picker (docs/STADIUMS.md).
 *
 * Controlled by PES6_STADIUM in ux0:data/pes6vita/env.txt:
 *   PES6_STADIUM=0       disabled completely (zero overhead, zero hooks)
 *   PES6_STADIUM=auto    automatic home-team stadium + in-game picker (L+R+Triangle in menus)
 *   PES6_STADIUM=<slug>  load <slug>.bin at boot + in-game picker (L+R+Triangle in menus)
 *   (unset)              auto if ux0:data/pes6vita/stadiums/ contains any .bin files, else off */
#ifndef PES6_VITA_STADIUMS_H
#define PES6_VITA_STADIUMS_H

#include <psp2/ctrl.h>

void stadiums_init(void);
void stadiums_vblank(const SceCtrlData *pad, int external_list_open);
int  stadiums_blocks_input(void);

#endif
