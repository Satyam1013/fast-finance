import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { INDIA_STATES, INDIA_STATES_CITIES } from "./india-states-cities.data";

/**
 * Static reference data for form dropdowns (Create/Edit Profile state & city).
 * Not admin-manageable — this is fixed geography, not business content.
 */
@ApiTags("masters")
@ApiBearerAuth()
@Controller("masters")
export class MastersController {
  @Get("states")
  states() {
    return INDIA_STATES;
  }

  @Get("cities")
  cities(@Query("state") state?: string) {
    if (!state) return [];
    const match = INDIA_STATES.find(
      (s) => s.toLowerCase() === state.toLowerCase(),
    );
    return match ? INDIA_STATES_CITIES[match] : [];
  }
}
