import React, { useState } from "react";

type Location = {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  chargersAvailable: number;
  slotsFree: number;
  photoUrl: string;
};

const sampleLocations: Location[] = [
  {
    id: "1",
    name: "Downtown Kiosk",
    address: "123 Main St, City Center",
    phone: "(555) 123-4567",
    website: "https://example.com/downtown",
    chargersAvailable: 12,
    slotsFree: 4,
    photoUrl: "https://via.placeholder.com/400x240?text=Downtown+Kiosk",
  },
  {
    id: "2",
    name: "Mall Entrance Kiosk",
    address: "456 Shopping Ave, Westside Mall",
    phone: "(555) 987-6543",
    website: "https://example.com/mall",
    chargersAvailable: 3,
    slotsFree: 1,
    photoUrl: "https://via.placeholder.com/400x240?text=Mall+Entrance",
  },
  {
    id: "3",
    name: "Stadium Gate Kiosk",
    address: "22 Arena Blvd, Gate B",
    phone: "(555) 555-2222",
    website: "https://example.com/stadium",
    chargersAvailable: 0,
    slotsFree: 8,
    photoUrl: "https://via.placeholder.com/400x240?text=Stadium+Gate",
  },
];

function getCitySlugFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[0] || "demo-city";
}

const App: React.FC = () => {
  const citySlug = getCitySlugFromPath();
  const [selectedId, setSelectedId] = useState<string>(sampleLocations[0].id);

  const selectedLocation =
    sampleLocations.find((loc) => loc.id === selectedId) ?? sampleLocations[0];

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
            <span className="text-xs text-gray-500">City: {citySlug}</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-500">Powered by Sponsor Name</div>
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
            {sampleLocations.map((loc) => {
              const isSelected = loc.id === selectedId;
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
                    alt={loc.name}
                    className="w-full h-32 object-cover"
                  />

                  <div className="p-3 space-y-1">
                    <h3 className="text-sm font-semibold flex items-center justify-between">
                      <span>{loc.name}</span>
                      {loc.chargersAvailable > 0 ? (
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
                        ⚡ {loc.chargersAvailable} chargers
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        🧱 {loc.slotsFree} slots
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
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
              Map preview (coming soon)
            </div>
            <div className="text-sm font-medium text-gray-700">
              {selectedLocation.name}
            </div>
            <div className="text-xs text-gray-500 mt-1 max-w-xs">
              This area will show an interactive map with markers for each
              kiosk.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;