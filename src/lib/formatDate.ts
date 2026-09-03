// A listing's real posted date, rendered the way a French classifieds
// site would ("à l'instant", "il y a 2h", "hier", "18 mai") — replaces
// what used to be a hardcoded "Publié il y a 2h" on every single listing.
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
