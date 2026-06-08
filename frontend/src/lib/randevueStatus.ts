/** Tailwind classes for randevue blocks on schedule grids. */
export function randevueStatusCellClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === 'requested') {
    return 'bg-amber-400 hover:bg-amber-500 text-amber-950';
  }
  if (s === 'rejected') {
    return 'bg-red-500 hover:bg-red-600 text-white';
  }
  if (s === 'scheduled' || s === 'booked' || s === 'approved') {
    return 'bg-emerald-500 hover:bg-emerald-600 text-white';
  }
  return 'bg-slate-500 hover:bg-slate-600 text-white';
}

export function randevueStatusLegendClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === 'requested') return 'bg-amber-400';
  if (s === 'rejected') return 'bg-red-500';
  if (s === 'scheduled' || s === 'booked' || s === 'approved') {
    return 'bg-emerald-500';
  }
  return 'bg-slate-500';
}

export function randevueStatusLabelKey(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === 'requested') return 'randevueStatusRequested';
  if (s === 'rejected') return 'randevueStatusRejected';
  if (s === 'scheduled') return 'randevueStatusScheduled';
  if (s === 'booked') return 'randevueStatusBooked';
  if (s === 'approved') return 'randevueStatusApproved';
  return 'randevueStatusOther';
}

/** Occupancy grey blocks should not cover the patient's own coloured randevues. */
export function randevueOverlapsOccupancySlot(
  randevue: { date: string; endTime: string; dentist?: { id?: number } | null },
  slot: { date: string; endTime: string; dentistId: number | null },
): boolean {
  const dentistId = randevue.dentist?.id ?? null;
  if (dentistId == null || slot.dentistId !== dentistId) return false;
  const rStart = new Date(randevue.date).getTime();
  const rEnd = new Date(randevue.endTime).getTime();
  const sStart = new Date(slot.date).getTime();
  const sEnd = new Date(slot.endTime).getTime();
  return rStart < sEnd && rEnd > sStart;
}
