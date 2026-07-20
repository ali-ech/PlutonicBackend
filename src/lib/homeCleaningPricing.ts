/** Shared Home Cleaning package prices (1 professional). Extra pros multiply this amount. */
export const HOME_CLEANING_CATEGORY_SLUG = 'hourly-home-cleaning';
export const HOME_CLEANING_SERVICE_SLUG = 'hc-hourly-standard';
export const HOME_CLEANING_MATERIALS_SLUG = 'hc-cleaning-materials';

export const HOME_CLEANING_BASE_BY_HOURS: Record<number, number> = {
  1: 55,
  2: 78,
  3: 102,
  4: 126,
  5: 150,
  6: 174,
  7: 198,
  8: 222,
};

export const HOME_CLEANING_MATERIALS_FEE_AED = 25;
export const HOME_CLEANING_MIN_HOURS = 1;
export const HOME_CLEANING_MAX_HOURS = 8;
export const HOME_CLEANING_MAX_PROS = 4;

export function homeCleaningBasePrice(hours: number): number {
  const h = Math.min(
    HOME_CLEANING_MAX_HOURS,
    Math.max(HOME_CLEANING_MIN_HOURS, Math.floor(hours))
  );
  return HOME_CLEANING_BASE_BY_HOURS[h] ?? HOME_CLEANING_BASE_BY_HOURS[1];
}

export function computeHomeCleaningTotal(params: {
  hours: number;
  professionals: number;
  materials: boolean;
}): { laborAed: number; materialsAed: number; totalAed: number; durationMinutes: number } {
  const hours = Math.min(
    HOME_CLEANING_MAX_HOURS,
    Math.max(HOME_CLEANING_MIN_HOURS, Math.floor(params.hours) || 1)
  );
  const pros = Math.min(
    HOME_CLEANING_MAX_PROS,
    Math.max(1, Math.floor(params.professionals) || 1)
  );
  const laborAed = homeCleaningBasePrice(hours) * pros;
  const materialsAed = params.materials ? HOME_CLEANING_MATERIALS_FEE_AED : 0;
  return {
    laborAed,
    materialsAed,
    totalAed: laborAed + materialsAed,
    durationMinutes: hours * 60,
  };
}

export function formatHomeCleaningLabel(hours: number, professionals: number): string {
  const h = Math.max(1, hours);
  const p = Math.max(1, professionals);
  const hr = `${h} hr`;
  const pro = p === 1 ? '1 professional' : `${p} professionals`;
  return `Home Cleaning · ${hr} · ${pro}`;
}
