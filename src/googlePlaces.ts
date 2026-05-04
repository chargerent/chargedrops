export const DEFAULT_VENUE_PHOTO_URL =
  "https://via.placeholder.com/400x240?text=Chargedrops+Location";

export const NO_VENUE_PHOTO_URL =
  "https://via.placeholder.com/400x240?text=No+Image";

export type PlacePhotoPreview = {
  url: string;
  attributions: string[];
};

export async function fetchPlaceById(
  placeId: string,
  fields: string[]
): Promise<google.maps.places.Place> {
  const { Place } = (await google.maps.importLibrary(
    "places"
  )) as google.maps.PlacesLibrary;
  const place = new Place({ id: placeId });
  await place.fetchFields({ fields });
  return place;
}

export function getPhotoPreviews(
  photos: google.maps.places.Photo[] | undefined,
  maxWidth: number,
  limit = 10
): PlacePhotoPreview[] {
  return (photos ?? []).slice(0, limit).map((photo) => ({
    url: photo.getURI({ maxWidth }),
    attributions: photo.authorAttributions.map(
      (attribution) => attribution.displayName
    ),
  }));
}

export function isGoogleGeneratedPhotoUrl(url: string | undefined): boolean {
  if (!url) return false;

  return (
    url.includes("maps.googleapis.com/maps/api/place") ||
    url.includes("places.googleapis.com/v1/") ||
    url.includes("lh3.googleusercontent.com")
  );
}

export function getCustomPhotoUrl(url: string | undefined): string {
  return url && !isGoogleGeneratedPhotoUrl(url) ? url : "";
}

export function getVenueFallbackPhotoUrl(url: string | undefined): string {
  return getCustomPhotoUrl(url) || DEFAULT_VENUE_PHOTO_URL;
}
