import React, { useState, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { collection, getDocs, orderBy, query, doc, getDoc, updateDoc, addDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import chargedropsLogo from "/chargedrop_logo.svg";

type City = {
  id: string;
  displayName: string;
  slug: string;
  logoUrl?: string;
};

// More detailed type for the edit form
type FullCityData = {
  id: string;
  displayName: string;
  slug: string;
  sponsorName: string;
  logoUrl?: string;
  // Other fields like mapCenter, mapZoom can be added here
};

// Type for the venue cards
type Venue = {
  id: string;
  venueName: string;
  photoUrl: string;
}

// Type for a single station
type Station = {
  id: string;
  stationid: string; // e.g., "LAX0001"
};

// Type for Google Places search results
type PlaceSearchResult = {
  place_id: string;
  name: string;
  formatted_address: string;
};



const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

const CitiesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6M4.5 21v-3.375c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const VenuesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const StarRating: React.FC<{ rating: number; reviewCount: number }> = ({ rating, reviewCount }) => {
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
      <span>({reviewCount})</span>
    </div>
  );
};

const ManageCitiesView: React.FC<{ onBack: () => void; onSelectCity: (id: string) => void; onAddCity: () => void; }> = ({ onBack, onSelectCity, onAddCity }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesRef = collection(db, "cities");
        const q = query(citiesRef, orderBy("displayName", "asc"));
        const snapshot = await getDocs(q);
        const cityList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as City));
        setCities(cityList);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <BackIcon />
        Back to Dashboard
      </button>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? <p>Loading cities...</p> : cities.map(city => (
          <div
            key={city.id}
            onClick={() => onSelectCity(city.id)}
            className="flex items-center justify-center rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer h-32"
          >
            {city.logoUrl ? (
              <img src={city.logoUrl} alt={city.displayName} className="h-12 max-w-full object-contain" />
            ) : (
              <CitiesIcon />
            )}
          </div>
        ))}
        {/* Add New City Card */}
        <button onClick={onAddCity} className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center font-semibold text-gray-500 transition hover:bg-gray-100 hover:border-gray-400">
          <PlusIcon />
          <span>Add City</span>
        </button>
      </div>
    </div>
  );
};

const EditCityView: React.FC<{ cityId: string; onBack: () => void }> = ({ cityId, onBack }) => {
  const [city, setCity] = useState<FullCityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCity = async () => {
      setLoading(true);
      const cityRef = doc(db, "cities", cityId);
      const docSnap = await getDoc(cityRef);
      if (docSnap.exists()) {
        setCity({ id: docSnap.id, ...docSnap.data() } as FullCityData);
      } else {
        console.error("No such city!");
      }
      setLoading(false);
    };
    fetchCity();
  }, [cityId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!city) return;
    const { name, value } = e.target;
    setCity({ ...city, [name]: value });
  };

  const handleSave = async () => {
    if (!city) return;
    setSaving(true);
    const cityRef = doc(db, "cities", city.id);
    // Exclude 'id' from the data being saved to Firestore
    const { id, ...dataToSave } = city;
    try {
      await updateDoc(cityRef, dataToSave);
      alert("City updated successfully!");
      onBack();
    } catch (error) {
      console.error("Error updating city: ", error);
      alert("Failed to update city.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading city details...</p>;
  if (!city) return <p>Could not load city details.</p>;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <BackIcon />
        Back to Cities
      </button>
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Editing: {city.displayName}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Display Name</label>
          <input type="text" name="displayName" value={city.displayName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Slug (URL path)</label>
          <input type="text" name="slug" value={city.slug} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sponsor Name</label>
          <input type="text" name="sponsorName" value={city.sponsorName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Logo URL</label>
          <input type="text" name="logoUrl" value={city.logoUrl || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AddCityView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [newCity, setNewCity] = useState({
    displayName: "",
    slug: "",
    sponsorName: "",
    logoUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCity({ ...newCity, [name]: value });
  };

  const handleSave = async () => {
    if (!newCity.displayName || !newCity.slug) {
      alert("Display Name and Slug are required.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "cities"), newCity);
      alert("City added successfully!");
      onBack();
    } catch (error) {
      console.error("Error adding city: ", error);
      alert("Failed to add city.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <BackIcon />
        Back to Cities
      </button>
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Add New City</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Display Name</label>
          <input type="text" name="displayName" value={newCity.displayName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Slug (URL path)</label>
          <input type="text" name="slug" value={newCity.slug} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sponsor Name</label>
          <input type="text" name="sponsorName" value={newCity.sponsorName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Logo URL</label>
          <input type="text" name="logoUrl" value={newCity.logoUrl} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onBack} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
            {saving ? "Saving..." : "Add City"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageVenuesView: React.FC<{ onBack: () => void; onAddVenue: () => void; onSelectVenue: (id: string) => void; }> = ({ onBack, onAddVenue, onSelectVenue }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesRef = collection(db, "venues");
        const q = query(venuesRef, orderBy("venueName", "asc"));
        const snapshot = await getDocs(q);
        const venueList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
        setVenues(venueList);
      } catch (error) {
        console.error("Error fetching venues:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <BackIcon />
        Back to Dashboard
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? <p>Loading venues...</p> : venues.map(venue => (
          <div key={venue.id} onClick={() => onSelectVenue(venue.id)} className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition hover:shadow-md">
            <img src={venue.photoUrl} alt={venue.venueName} className="w-full h-32 object-cover" />
            <div className="p-3">
              <h3 className="text-sm font-semibold truncate">{venue.venueName}</h3>
            </div>
          </div>
        ))}
        <button onClick={onAddVenue} className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center font-semibold text-gray-500 transition hover:bg-gray-100 hover:border-gray-400 h-44">
          <PlusIcon />
          <span>Add Venue</span>
        </button>
      </div>
    </div>
  );
};

const placesLibraries: ("places")[] = ["places"];

const AddVenueView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // City selection state
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  // Venue search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [status, setStatus] = useState<google.maps.places.PlacesServiceStatus | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-admin", // Use a unique ID
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: placesLibraries, // Use the constant array
    nonce: (window as any).reactGoogleMapsApiNonce,
  });

  // Fetch all available stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const stationsRef = collection(db, "stations");
        const q = query(
          stationsRef,
          where("Assigned", "==", false), // Only fetch stations where 'Assigned' is false
          orderBy("stationid", "asc")
        );
        const snapshot = await getDocs(q);
        const stationList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Station));
        setStations(stationList);
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };
    if (isLoaded) {
      fetchStations();
    }
  }, [isLoaded]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery && isLoaded) { // Check if the script is loaded
        const autocompleteService = new window.google.maps.places.AutocompleteService();
        autocompleteService.getPlacePredictions({ input: searchQuery }, (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions.map(p => ({ place_id: p.place_id, name: p.structured_formatting.main_text, formatted_address: p.structured_formatting.secondary_text })));
          }
        });
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery, isLoaded]);

  // Fetch cities when the component mounts
  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const citiesRef = collection(db, "cities");
        const q = query(citiesRef, orderBy("displayName", "asc"));
        const snapshot = await getDocs(q);
        const cityList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as City));
        setCities(cityList);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  const handleSelectPlace = (place: PlaceSearchResult) => {
    if (!isLoaded || !selectedCity) return;

    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
    const fields = ['name', 'formatted_address', 'geometry', 'website', 'formatted_phone_number', 'photos', 'rating', 'reviews', 'opening_hours', 'url', 'user_ratings_total', 'editorial_summary'];

    placesService.getDetails({ placeId: place.place_id, fields }, (details, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
        // Cast to `any` to access properties not in the default type definitions
        const placeDetails = details as any;
        setSelectedPlace({
          place_id: place.place_id, // Explicitly add the place_id
          venueName: details.name || '',
          address: details.formatted_address || '',
          citySlug: selectedCity.slug, // Use the selected city's slug
          phone: details.formatted_phone_number || '',
          website: details.website || '',
          photoUrl: details.photos?.[0]?.getUrl({ maxWidth: 800 }) || 'https://via.placeholder.com/400x240?text=No+Image',
          photos: details.photos?.map(p => p.getUrl({ maxWidth: 800 })) || [],
          rating: details.rating || 0,
          user_ratings_total: details.user_ratings_total || 0, // This is correct
          reviews: details.reviews || [],
          editorial_summary: placeDetails.editorial_summary?.overview || '',
          opening_hours_text: details.opening_hours?.weekday_text || [],
          googleMapsUrl: details.url || '',
          opening_hours: details.opening_hours,
          lat: details.geometry?.location?.lat() || 0,
          lng: details.geometry?.location?.lng() || 0,
          active: true,
          sortOrder: 100,
          stationIds: [], // Initialize with empty array
          totalChargersAvailable: 0,
          totalSlotsFree: 8,
        });
        setSearchQuery("");
        setSearchResults([]);
      } else {
        setStatus(status);
      } // This is correct
    });
  };

  const handleSave = async () => {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      // Add selected stations to the place object before saving
      const placeWithStations = {
        ...selectedPlace,
        stationIds: selectedStations,
        // You might want to update totalChargersAvailable based on selected stations
        totalChargersAvailable: selectedStations.length,
      };

      // Create a clean object for Firestore, excluding non-serializable data
      const dataToSave = {
        venueName: selectedPlace.venueName,
        place_id: selectedPlace.place_id, // <-- Add this line
        address: selectedPlace.address,
        citySlug: selectedPlace.citySlug,
        phone: selectedPlace.phone,
        website: selectedPlace.website,
        photoUrl: selectedPlace.photoUrl,
        photos: selectedPlace.photos,
        rating: selectedPlace.rating,
        user_ratings_total: selectedPlace.user_ratings_total,
        editorial_summary: selectedPlace.editorial_summary,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        active: selectedPlace.active,
        sortOrder: placeWithStations.sortOrder,
        stationIds: placeWithStations.stationIds,
        totalChargersAvailable: placeWithStations.totalChargersAvailable,
        totalSlotsFree: placeWithStations.totalSlotsFree,
        opening_hours_text: selectedPlace.opening_hours_text,
      };
      await addDoc(collection(db, "venues"), dataToSave);
      alert("Venue added successfully!");
      onBack();
    } catch (error) {
      console.error("Error adding venue: ", error);
      alert("Failed to add venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleStationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedStations(selectedOptions);
  };

  const handleBackToSearch = () => {
    setSelectedPlace(null);
    setSelectedStations([]);
    setSearchQuery("");
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <BackIcon />
        Back to Venues
      </button>

      {!selectedCity ? (
        // Step 1: Choose a city
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4">Step 1: Choose a City</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loadingCities ? <p>Loading cities...</p> : cities.map(city => (
              <div key={city.id} onClick={() => setSelectedCity(city)} className="flex flex-col items-center justify-center gap-3 rounded-lg bg-gray-50 p-4 text-center font-semibold text-gray-800 shadow-sm transition hover:shadow-md cursor-pointer h-32">
                {city.logoUrl ? (
                  <img src={city.logoUrl} alt={city.displayName} className="h-12 max-w-full object-contain" />
                ) : (
                  <CitiesIcon />
                )}
                <span className="text-sm">{city.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      ) : !selectedPlace ? (
        // Step 2: Search for a venue
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4">Step 2: Find Venue in {selectedCity.displayName}</h2>
          <p className="text-sm text-gray-600 mb-4">Search for a location to begin.</p>
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`e.g., 'Coffee shop in ${selectedCity.displayName}'`}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              disabled={!isLoaded} // Disable input until script is loaded
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                {searchResults.map(place => (
                  <div key={place.place_id} onClick={() => handleSelectPlace(place)} className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0">
                    <p className="font-semibold">{place.name}</p>
                    <p className="text-sm text-gray-500">{place.formatted_address}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {status && status !== 'OK' && (
            <p className="text-sm text-red-600 mt-2">Could not fetch place details. Status: {status}</p>
          )}
          <button type="button" onClick={() => setSelectedCity(null)} className="text-sm text-gray-600 hover:underline">
            &larr; Choose a different city
          </button>
        </div>
      ) : (
        // Step 3: Confirm and save
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <h2 className="text-2xl font-bold">{selectedPlace.venueName}</h2>
          <p className="text-sm text-gray-500">{selectedPlace.address}</p>
          <div className="flex items-center gap-4">
            <StarRating rating={selectedPlace.rating} reviewCount={selectedPlace.user_ratings_total} />
            {selectedPlace.opening_hours && (
              <span className={`text-sm font-semibold ${selectedPlace.opening_hours.isOpen() ? 'text-green-600' : 'text-red-600'}`}>
                {selectedPlace.opening_hours.isOpen() ? 'Open now' : 'Closed'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={selectedPlace.googleMapsUrl} target="_blank" rel="noreferrer" className="bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200">View on Google Maps</a>
            {selectedPlace.website && <a href={selectedPlace.website} target="_blank" rel="noreferrer" className="bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200">Visit Website</a>}
            {selectedPlace.phone && <a href={`tel:${selectedPlace.phone}`} className="bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200">Call</a>}
          </div>
          
          {selectedPlace.photos?.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Photo Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedPlace.photos.map((photoUrl: string, index: number) => (
                  <a href={photoUrl} key={index} target="_blank" rel="noreferrer">
                    <img src={photoUrl} alt={`Venue photo ${index + 1}`} className="w-full h-24 object-cover rounded-md hover:opacity-90 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Assign Stations</h3>
            <p className="text-sm text-gray-500 mb-2">Select one or more stations to assign to this venue. (Use Ctrl/Cmd to select multiple)</p>
            <select multiple value={selectedStations} onChange={handleStationSelect} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm h-40">
              {stations.map(station => (
                <option key={station.id} value={station.id}>{station.stationid}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={handleBackToSearch} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              Back to Search
            </button>
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
              {saving ? "Saving..." : "Save Venue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboardPage: React.FC = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"dashboard" | "cities" | "venues">("dashboard");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [isAddingVenue, setIsAddingVenue] = useState(false);

  const handleLogout = () => {
    signOut(auth).then(() => navigate("/admin/login"));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <img src={chargedropsLogo} alt="Chargedrops" className="h-7 w-auto" />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              aria-label="Logout"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {view === "dashboard" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setView("cities")}
              className="flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-4 text-left text-lg font-semibold text-gray-800 shadow-sm transition hover:shadow-md"
            >
              <CitiesIcon />
              Manage Cities
            </button>
            <button
              type="button"
              onClick={() => setView("venues")}
              className="flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-4 text-left text-lg font-semibold text-gray-800 shadow-sm transition hover:shadow-md"
            >
              <VenuesIcon />
              Manage Venues
            </button>
          </div>
        )}

        {view === "cities" && !selectedCityId && !isAddingCity && (
          <ManageCitiesView
            onBack={() => setView("dashboard")}
            onSelectCity={(id) => setSelectedCityId(id)}
            onAddCity={() => setIsAddingCity(true)}
          />
        )}
        {view === "cities" && selectedCityId && (
          <EditCityView cityId={selectedCityId} onBack={() => setSelectedCityId(null)} />
        )}
        {view === "cities" && isAddingCity && (
          <AddCityView onBack={() => { setIsAddingCity(false); setView("cities"); }} />
        )}

        {view === "venues" && !isAddingVenue && (
          <ManageVenuesView
            onBack={() => setView("dashboard")}
            onAddVenue={() => setIsAddingVenue(true)}
            onSelectVenue={(id) => alert(`Editing venue ${id} coming soon!`)} // Placeholder
          />
        )}
        {view === "venues" && isAddingVenue && (
          <AddVenueView onBack={() => setIsAddingVenue(false)} />
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;