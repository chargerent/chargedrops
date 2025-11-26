import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVenues() {
      setLoading(true);
      setError(null);

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

        const items: Venue[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
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
        setError("Unable to load locations right now.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVenues();

    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  const selectedVenue =
    venues.find((v) => v.id === selectedId) ?? (venues.length ? venues[0] : null);

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
              Chargedrops
            </span>
            <span className="text-xs text-gray-500">
              City: {citySlug}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-gray-500">
          Powered by Sponsor Name
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
            {loading && (
              <div className="text-xs text-gray-500">
                Loading locations…
              </div>
            )}

            {error && !loading && (
              <div className="text-xs text-red-600">
                {error}
              </div>
            )}

            {!loading && !error && venues.length === 0 && (
              <div className="text-xs text-gray-500">
                No locations found for this city yet.
              </div>
            )}

            {!loading &&
              !error &&
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

        {/* Right: map placeholder */}
        <section className="md:w-2/3 lg:w-3/5 flex-1">
          <div className="w-full h-[260px] md:h-full bg-gray-200 flex flex-col items-center justify-center text-center px-4">
            {loading && (
              <>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Loading map data…
                </div>
                <div className="text-xs text-gray-500">
                  Fetching locations for {citySlug}.
                </div>
              </>
            )}

            {!loading && error && (
              <div className="text-xs text-red-600">
                {error}
              </div>
            )}

            {!loading && !error && selectedVenue && (
              <>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Map preview (coming soon)
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {selectedVenue.venueName}
                </div>
                <div className="text-xs text-gray-500 mt-1 max-w-xs">
                  This area will show an interactive map with markers for each
                  venue. Clicking a card or marker will center the map on that location.
                </div>
              </>
            )}

            {!loading && !error && !selectedVenue && (
              <div className="text-xs text-gray-500">
                No locations available to display.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
