import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import MapView, { type MapVenue } from "./MapView";

type Venue = {
  id: string;
  citySlug: string;
  venueName: string;
  address: string;
  phone: string;
  website: string;
  photoUrl: string;
  totalChargersAvailable: number;
  totalSlotsFree: number;
  status: string;
  lat: number;
  lng: number;
};

type City = {
  slug: string;
  displayName: string;
  sponsorName: string;
  logoUrl?: string;
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
};

function getCitySlugFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  // If path is just "/", fallback to demo-city
  return segments[0] || "demo-city";
}

const App: React.FC = () => {
  const citySlug = getCitySlugFromPath();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueError, setVenueError] = useState<string | null>(null);

  const [city, setCity] = useState<City | null>(null);
  const [loadingCity, setLoadingCity] = useState(true);
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCity() {
      setLoadingCity(true);
      setCityError(null);
      try {
        const cityRef = doc(db, "cities", citySlug);
        const snap = await getDoc(cityRef);
        if (cancelled) return;

        if (!snap.exists()) {
          setCity(null);
          setCityError("City configuration not found.");
          return;
        }

        const data = snap.data() as any;
        const mapCenter =
          data.mapCenter && typeof data.mapCenter.lat === "number"
            && typeof data.mapCenter.lng === "number"
            ? { lat: data.mapCenter.lat, lng: data.mapCenter.lng }
            : null;

        setCity({
          slug: data.slug ?? citySlug,
          displayName: data.displayName ?? citySlug,
          sponsorName: data.sponsorName ?? "Sponsor",
          logoUrl: data.logoUrl ?? "",
          mapCenter,
          mapZoom: typeof data.mapZoom === "number" ? data.mapZoom : 13,
        });
      } catch (err: any) {
        console.error("Error loading city", err);
        setCityError("Unable to load city configuration.");
      } finally {
        if (!cancelled) setLoadingCity(false);
      }
    }

    async function loadVenues() {
      setLoadingVenues(true);
      setVenueError(null);

      try {
        const venuesRef = collection(db, "venues");
        const q = query(
          venuesRef,
          where("citySlug", "==", citySlug),
          where("active", "==", true),
          orderBy("sortOrder", "asc")
        );

        const snapshot = await getDocs(q);
        if (cancelled) return;

        const items: Venue[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            citySlug: data.citySlug ?? "",
            venueName: data.venueName ?? "Unnamed location",
            address: data.address ?? "",
            phone: data.phone ?? "",
            website: data.website ?? "",
            photoUrl:
              data.photoUrl ??
              "https://via.placeholder.com/400x240?text=Chargedrops+Location",
            totalChargersAvailable: Number(data.totalChargersAvailable ?? 0),
            totalSlotsFree: Number(data.totalSlotsFree ?? 0),
            status: data.status ?? "unknown",
            lat: Number(data.lat ?? 0),
            lng: Number(data.lng ?? 0),
          };
        });

        setVenues(items);
        if (items.length > 0) {
          setSelectedId(items[0].id);
        } else {
          setSelectedId(null);
        }
      } catch (err: any) {
        console.error("Error loading venues", err);
        setVenueError("Unable to load locations right now.");
      } finally {
        if (!cancelled) {
          setLoadingVenues(false);
        }
      }
    }

    loadCity();
    loadVenues();

    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  const selectedVenue =
    venues.find((v) => v.id === selectedId) ?? (venues.length ? venues[0] : null);

  const mapVenues: MapVenue[] = venues.map((v) => ({
    id: v.id,
    venueName: v.venueName,
    lat: v.lat,
    lng: v.lng,
  }));

  const anyLoading = loadingVenues || loadingCity;
  const headerTitle = city?.displayName ?? citySlug;
  const sponsorName = city?.sponsorName ?? "Sponsor Name";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
            CD
          </div>
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight text-sm">
              {headerTitle}
            </span>
            <span className="text-xs text-gray-500">
              Portable charger locations
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {city?.logoUrl && (
            <img
              src={city.logoUrl}
              alt={sponsorName}
              className="h-6 w-auto object-contain"
            />
          )}
          <div className="text-[11px] text-gray-500 text-right">
            Powered by {sponsorName}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left panel: list */}
        <section className="md:w-1/3 lg:w-2/5 border-r bg-gray-50 max-h-[calc(100vh-52px)] overflow-y-auto">
          <div className="p-3 border-b bg-white">
            <h2 className="text-sm font-semibold">Charger Locations</h2>
            <p className="text-xs text-gray-500">
              Tap a location to view details and see it on the map.
            </p>
          </div>

          <div className="p-3 space-y-3">
            {anyLoading && (
              <div className="text-xs text-gray-500">
                Loading city and locations…
              </div>
            )}

            {cityError && !anyLoading && (
              <div className="text-xs text-red-600">
                {cityError}
              </div>
            )}

            {venueError && !anyLoading && (
              <div className="text-xs text-red-600">
                {venueError}
              </div>
            )}

            {!anyLoading && !venueError && venues.length === 0 && (
              <div className="text-xs text-gray-500">
                No locations found for this city yet.
              </div>
            )}

            {!anyLoading &&
              !venueError &&
              venues.map((loc) => {
                const isSelected = loc.id === selectedId;
                const inStock = loc.totalChargersAvailable > 0;

                return (
                  <article
                    key={loc.id}
                    onClick={() => setSelectedId(loc.id)}
                    className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer border transition ${
                      isSelected
                        ? "border-blue-500 shadow-md"
                        : "border-transparent hover:border-gray-200 hover:shadow-md"
                    }`}
                  >
                    <img
                      src={loc.photoUrl}
                      alt={loc.venueName}
                      className="w-full h-32 object-cover"
                    />

                    <div className="p-3 space-y-1">
                      <h3 className="text-sm font-semibold flex items-center justify-between">
                        <span>{loc.venueName}</span>
                        {inStock ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700">
                            In Stock
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-600">
                            Sold Out
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-gray-600">{loc.address}</p>
                      <p className="text-xs text-gray-500">{loc.phone}</p>

                      <div className="flex items-center justify-between mt-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                          ⚡ {loc.totalChargersAvailable} chargers
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          🧱 {loc.totalSlotsFree} slots
                        </span>
                      </div>

                      <div className="mt-2">
                        <a
                          href={loc.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View venue website
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        {/* Right: map */}
        <section className="md:w-2/3 lg:w-3/5 flex-1">
          <div className="w-full h-[260px] md:h-full">
            <MapView
              venues={mapVenues}
              selectedVenue={
                selectedVenue
                  ? {
                      id: selectedVenue.id,
                      venueName: selectedVenue.venueName,
                      lat: selectedVenue.lat,
                      lng: selectedVenue.lng,
                    }
                  : null
              }
              cityCenter={city?.mapCenter ?? null}
              cityZoom={city?.mapZoom ?? 13}
              onSelectVenue={(id) => setSelectedId(id)}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
