export type Location = string;

function normalizeAddress(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\bNo\s*:\s*/gi, " No ")
    .trim();
}

export function buildGoogleDirectionsUrl(
  origin: Location,
  destination: Location,
  waypoints: Location[] = []
) {
  const base = "https://www.google.com/maps/dir/";
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    origin: normalizeAddress(origin),
    destination: normalizeAddress(destination)
  });
  if (waypoints.length) {
    params.set(
      "waypoints",
      waypoints.map(normalizeAddress).join("|")
    );
  }
  return `${base}?${params.toString()}`;
}

export function openDrivingRoute(addresses: Location[]) {
  if (!addresses.length) return;
  const origin = addresses[0];
  const destination = addresses.length > 1 ? addresses[addresses.length - 1] : addresses[0];
  const waypoints = addresses.slice(1, -1);

  const url = buildGoogleDirectionsUrl(origin, destination, waypoints);
  window.open(url, "_blank", "noopener,noreferrer");
}
