import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom"; // Correct import
import { useJsApiLoader } from "@react-google-maps/api";
import {
  collection,
  getDocs,
  query, // Keep these imports
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { MdDirections, MdPhone, MdLanguage } from "react-icons/md";
import MapView from "./MapView";
import chargedropsLogo from "/chargedrop_logo.svg"; // large logo
import dropLogo from "/drop_logo.svg"; // small logo

// Define types for raw Firestore data to avoid using `any`
type FirestoreCity = {
  slug: string;
  displayName: string;
  sponsorName: string;
  logoUrl?: string;
  mapCenter?: { lat: number; lng: number };
  mapZoom?: number;
};

type Venue = {
  id: string;
  place_id?: string; // Google Place ID for live data fetching
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
  rating?: number;
  user_ratings_total?: number;
  photos?: string[];
  editorial_summary?: string;
  opening_hours_text?: string[];
};

type City = {
  slug: string;
  displayName: string;
  sponsorName: string;
  logoUrl?: string;
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number;
};

const StarRating: React.FC<{ rating: number; reviewCount: number }> = ({ rating, reviewCount }) => {
  if (!rating || rating === 0) return null;
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));
  return (
    <div className="flex items-center gap-1 text-sm text-gray-600">
      <span className="font-semibold text-gray-800">{rating.toFixed(1)}</span>
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>)}
        {halfStar && <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" clipPath="url(#half)"/><defs><clipPath id="half"><path d="M0 0h10v20H0z"/></clipPath></defs></svg>}
        {[...Array(emptyStars)].map((_, i) => <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>)}
      </div>
      <span className="text-xs">({reviewCount})</span>
    </div>
  );
};

/**
 * Custom hook to fetch city configuration from Firestore.
 */
const useCity = (citySlug: string) => {
  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCity = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query for the city document where the 'slug' field matches the citySlug from the URL
        const citiesRef = collection(db, "cities");
        const q = query(citiesRef, where("slug", "==", citySlug));
        const querySnapshot = await getDocs(q);

        if (cancelled) return;

        if (querySnapshot.empty) {
          setError("City configuration not found.");
          return;
        }

        const cityDoc = querySnapshot.docs[0];
        const data = cityDoc.data() as FirestoreCity;
        const mapCenter =
          data.mapCenter &&
          typeof data.mapCenter.lat === "number" &&
          typeof data.mapCenter.lng === "number"
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
      } catch (err) {
        console.error("Error loading city", err);
        setError("Unable to load city configuration.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCity();
    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  return { city, loading, error };
};

/**
 * Custom hook to fetch venues for a given city from Firestore.
 */
const useVenues = (citySlug: string) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadVenues = async () => {
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

        const items: Venue[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            place_id: data.place_id,
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
            rating: Number(data.rating ?? 0),
            user_ratings_total: Number(data.user_ratings_total ?? 0),
            photos: Array.isArray(data.photos) ? data.photos : [],
            editorial_summary: data.editorial_summary ?? "",
            opening_hours_text: Array.isArray(data.opening_hours_text) ? data.opening_hours_text : [],
          };
        });
        setVenues(items);
      } catch (err) {
        console.error("Error loading venues", err);
        setError("Unable to load locations right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVenues();
    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  return { venues, loading, error };
};

const ActionButton: React.FC<{ href: string; label: string; icon: React.ReactNode; }> = ({ href, label, icon }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="flex flex-col items-center justify-center gap-1 text-blue-600 hover:bg-blue-50 rounded-md pt-2 pb-1 px-2 transition w-20"
  >
    {icon}
    <span className="text-xs font-semibold">{label}</span>
  </a>
);

const placesLibrary: ("places")[] = ["places"];

const PublicMapPage: React.FC = () => {
  const params = useParams();
  const citySlug = params.citySlug || "demo-city"; // Use slug from URL or fallback

  const { city, loading: loadingCity, error: cityError } = useCity(citySlug);
  const {
    venues,
    loading: loadingVenues,
    error: venueError,
  } = useVenues(citySlug);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-public",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: placesLibrary,
  });

  const [liveVenueData, setLiveVenueData] = useState<{ open_now?: boolean; rating?: number; user_ratings_total?: number; } | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);


  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedId) ?? null,
    [venues, selectedId]
  );

  // Set initial selected venue and main photo when venues load or selection changes
  useEffect(() => {
    if (selectedVenue) {
      setMainPhoto(selectedVenue.photoUrl);
    }
  }, [selectedVenue]);


  // HYBRID APPROACH: Fetch live data for the selected venue
  useEffect(() => {
    if (selectedVenue && selectedVenue.place_id && isLoaded) {
      setLoadingLive(true);
      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      placesService.getDetails({
        placeId: selectedVenue.place_id,
        fields: ['opening_hours', 'rating', 'user_ratings_total'] // Only fetch what's needed
      }, (details, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
          setLiveVenueData({
            open_now: details.opening_hours?.isOpen(),
            rating: details.rating,
            user_ratings_total: details.user_ratings_total,
          });
        }
        setLoadingLive(false);
      });
    } else {
      setLiveVenueData(null); // Clear live data if no venue is selected
    }
  }, [selectedVenue, isLoaded]);

  const anyLoading = loadingVenues || loadingCity;
  const sponsorName = city?.sponsorName ?? "Sponsor Name";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          {/* Small logo for mobile (hidden on md screens and up) */}
          <img
            src={dropLogo}
            alt="Chargedrops"
            className="h-8 w-8 object-contain md:hidden"
          />
          {/* Large logo for desktop (hidden on small screens) */}
          <img
            src={chargedropsLogo}
            alt="Chargedrops"
            className="hidden h-7 w-auto object-contain md:block"
          />
          <div className="text-[11px] text-gray-500">
            Powered by <span className="font-semibold">{sponsorName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* City/Sponsor Logo now on the right */}
          {city?.logoUrl && (
            <img
              src={city.logoUrl}
              alt={sponsorName}
              className="h-7 w-auto object-contain"
            />
          )}
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 relative">
        {/* "How to" section floating over the map */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-sm md:left-auto md:right-3 md:top-3 md:translate-x-0 md:w-64">
          <div className="bg-white rounded-lg shadow-lg">
            <button onClick={() => setInstructionsExpanded(!instructionsExpanded)} className="w-full flex justify-between items-center text-left p-3">
              <h2 className="text-sm font-semibold">
                How to Borrow a Charger
              </h2>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 text-gray-400 transition-transform ${instructionsExpanded ? 'rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {instructionsExpanded && <div className="px-3 pb-3">
              <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                <li>Find a location on the map and visit the kiosk.</li>
                <li>Scan the QR code on the kiosk to borrow the charger free for 1 hour.</li>
                <li>Take your portable charger and return it to any location when done!</li>
              </ol>
            </div>}
          </div>
        </div>

        {/* Floating panel for locations */}
        {/* On mobile, it's a bottom sheet. On desktop, a left sidebar. */}
        <section className="hidden md:block absolute top-0 bottom-0 left-0 z-10 md:w-96 lg:w-1/3 bg-gray-50">
          {/* Location list container - shown only if no venue is selected on desktop */}
          <div className={`p-3 flex-col gap-3 overflow-y-auto h-full ${selectedId ? 'hidden' : 'flex'}`}>
            {anyLoading && !venues.length && (
              <div className="text-xs text-gray-500">
                Loading city and locations…
              </div>
            )}

            {cityError && !anyLoading && (
              <div className="text-xs text-red-600">{cityError}</div>
            )}

            {venueError && !anyLoading && (
              <div className="text-xs text-red-600">{venueError}</div>
            )}

            {!anyLoading && !venueError && venues.length === 0 && (
              <div className="text-xs text-gray-500">
                No locations found for this city yet.
              </div>
            )}

            {venues.map((loc) => (
              <article
                key={loc.id}
                onClick={() => setSelectedId(loc.id)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer border border-transparent hover:border-gray-200 hover:shadow-md transition md:w-full"
              >
                <div className="flex items-center">
                  <img src={loc.photoUrl} alt={loc.venueName} className="w-24 h-24 object-cover flex-shrink-0" />
                  <div className="p-3 flex-1 flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold">{loc.venueName}</h3>
                      <p className="text-xs text-gray-500 mt-1">{loc.address}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-xs">
                        <img src={dropLogo} alt="charger" className="h-3 w-3" />
                        {loc.totalChargersAvailable} charger{loc.totalChargersAvailable === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium text-xs whitespace-nowrap">
                        S {loc.totalSlotsFree} slots
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Expanded view for selected venue on desktop */}
          {selectedVenue && (
            <div className="overflow-y-auto h-full bg-white">
              <button onClick={() => setSelectedId(null)} className="sticky top-0 z-10 flex items-center gap-2 p-3 bg-gray-50 w-full text-left hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-600">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">Back to all locations</span>
              </button>
              <article className="bg-white overflow-hidden">
                {selectedVenue.photos && selectedVenue.photos.length > 1 ? (
                  <div className="grid grid-cols-4 gap-1 p-1">
                    <div className="col-span-4">
                      <img
                        src={mainPhoto ?? selectedVenue.photoUrl}
                        alt={selectedVenue.venueName}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                    {selectedVenue.photos.slice(0, 4).map((photo, index) => (
                      <div key={index} className="col-span-1">
                        <img src={photo} alt={`Thumb ${index + 1}`} onClick={(e) => { e.stopPropagation(); setMainPhoto(photo); }} className="h-16 w-full object-cover rounded-md cursor-pointer" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <img
                    src={selectedVenue.photoUrl}
                    alt={selectedVenue.venueName}
                    className="w-full h-48 object-cover"
                  />
                )}

                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedVenue.venueName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedVenue.address}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    {loadingLive ? (
                      <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    ) : liveVenueData?.open_now !== undefined ? (
                      liveVenueData.open_now ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
                          Open now
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
                          Closed
                        </span>
                      )
                    ) : (
                      <div className="h-7 w-20"></div> // Placeholder
                    )}
                    
                    <StarRating rating={liveVenueData?.rating ?? selectedVenue.rating ?? 0} reviewCount={liveVenueData?.user_ratings_total ?? selectedVenue.user_ratings_total ?? 0} />
                  </div>

                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold">Availability</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                        <img src={dropLogo} alt="charger" className="h-4 w-4" />
                        {selectedVenue.totalChargersAvailable} charger{selectedVenue.totalChargersAvailable === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium whitespace-nowrap">S {selectedVenue.totalSlotsFree} slots</span>
                    </div>
                  </div>

                  {selectedVenue.editorial_summary && (
                    <div>
                      <h4 className="text-sm font-bold mb-1">About</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedVenue.editorial_summary}</p>
                    </div>
                  )}

                  {selectedVenue.opening_hours_text && selectedVenue.opening_hours_text.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold mb-2">Hours</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedVenue.opening_hours_text.map((line, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{line.split(': ')[0]}</span>
                            <span className="font-medium">{line.split(': ')[1]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-around items-center pt-3 border-t">
                    <ActionButton href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.lat},${selectedVenue.lng}`} label="Directions" icon={<MdDirections className="w-6 h-6" />} />
                    {selectedVenue.phone && <ActionButton href={`tel:${selectedVenue.phone}`} label="Call" icon={<MdPhone className="w-6 h-6" />} />}
                    {selectedVenue.website && <ActionButton href={selectedVenue.website} label="Website" icon={<MdLanguage className="w-6 h-6" />} />}
                  </div>
                </div>
              </article>
            </div>
          )}
        </section>

        {/* Full screen venue card on mobile */}
        {selectedVenue && (
          <div className={`fixed inset-0 z-20 md:hidden transition-transform duration-300 ease-in-out ${selectedId ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="bg-white h-full w-full overflow-y-auto">
              <button 
                onClick={() => setSelectedId(null)} 
                className="absolute top-4 right-4 z-30 bg-gray-200 rounded-full p-1"
                aria-label="Close venue details"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Re-using the article content structure */}
              <article className="bg-white overflow-hidden">
                {selectedVenue.photos && selectedVenue.photos.length > 1 ? (
                  <div className="grid grid-cols-4 gap-1 p-1">
                    <div className="col-span-4">
                      <img
                        src={mainPhoto ?? selectedVenue.photoUrl}
                        alt={selectedVenue.venueName}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                    {selectedVenue.photos.slice(0, 4).map((photo, index) => (
                      <div key={index} className="col-span-1">
                        <img src={photo} alt={`Thumb ${index + 1}`} onClick={(e) => { e.stopPropagation(); setMainPhoto(photo); }} className="h-16 w-full object-cover rounded-md cursor-pointer" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <img
                    src={selectedVenue.photoUrl}
                    alt={selectedVenue.venueName}
                    className="w-full h-48 object-cover"
                  />
                )}

                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{selectedVenue.venueName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedVenue.address}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    {loadingLive ? (
                      <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    ) : liveVenueData?.open_now !== undefined ? (
                      liveVenueData.open_now ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
                          Open now
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
                          Closed
                        </span>
                      )
                    ) : (
                      <div className="h-7 w-20"></div> // Placeholder
                    )}
                    
                    <StarRating rating={liveVenueData?.rating ?? selectedVenue.rating ?? 0} reviewCount={liveVenueData?.user_ratings_total ?? selectedVenue.user_ratings_total ?? 0} />
                  </div>

                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold">Availability</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                        <img src={dropLogo} alt="charger" className="h-4 w-4" />
                        {selectedVenue.totalChargersAvailable} charger{selectedVenue.totalChargersAvailable === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium whitespace-nowrap">S {selectedVenue.totalSlotsFree} slots</span>
                    </div>
                  </div>

                  {selectedVenue.editorial_summary && (
                    <div>
                      <h4 className="text-sm font-bold mb-1">About</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedVenue.editorial_summary}</p>
                    </div>
                  )}

                  {selectedVenue.opening_hours_text && selectedVenue.opening_hours_text.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold mb-2">Hours</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedVenue.opening_hours_text.map((line, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{line.split(': ')[0]}</span>
                            <span className="font-medium">{line.split(': ')[1]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-around items-center pt-3 border-t">
                    <ActionButton href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.lat},${selectedVenue.lng}`} label="Directions" icon={<MdDirections className="w-6 h-6" />} />
                    {selectedVenue.phone && <ActionButton href={`tel:${selectedVenue.phone}`} label="Call" icon={<MdPhone className="w-6 h-6" />} />}
                    {selectedVenue.website && <ActionButton href={selectedVenue.website} label="Website" icon={<MdLanguage className="w-6 h-6" />} />}
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* Map view in the background */}
        <section className="absolute inset-0 z-0">
          <MapView
            venues={venues}
            selectedVenue={selectedVenue}
            cityCenter={city?.mapCenter ?? null}
            cityZoom={city?.mapZoom ?? 13}
            onSelectVenue={(id) => setSelectedId(id)}
            isLoaded={isLoaded}
          />
        </section>
      </main>
    </div>
  );
};

export default PublicMapPage;