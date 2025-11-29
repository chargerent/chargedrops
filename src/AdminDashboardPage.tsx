import React, { useState, useEffect, useMemo } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { collection, getDocs, orderBy, query, doc, getDoc, updateDoc, addDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import chargedropsLogo from "/chargedrop_logo.svg";

type City = {
  id: string;
  displayName: string;
  slug: string;
  logoUrl?: string;
};

// More detailed type for the edit form
type FullCityData = City & {
  id: string;
  displayName: string;
  slug: string;
  sponsorName: string;
  logoUrl?: string;
  sponsorLogoUrl?: string;
  // Other fields like mapCenter, mapZoom can be added here
};

// Type for the venue cards
type Venue = {
  id: string;
  venueName: string;
  stationDetails?: VenueStation[];
  citySlug?: string; // Add citySlug to group venues by city
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
          <label className="block text-sm font-medium text-gray-700">Sponsor Logo URL</label>
          <input type="text" name="sponsorLogoUrl" value={city.sponsorLogoUrl || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
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

const AddCityView: React.FC<{ onBack: () => void; isLoaded: boolean }> = ({ onBack, isLoaded }) => {
  const [newCity, setNewCity] = useState({
    displayName: "",
    slug: "",
    sponsorName: "",
    logoUrl: "",
    sponsorLogoUrl: "",
  });
  
  // State for city search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<google.maps.places.PlacesServiceStatus | null>(null);


  const [mapCenter, setMapCenter] = useState({ lat: "", lng: "" });
  const [mapZoom, setMapZoom] = useState("12");
  const [primaryColor, setPrimaryColor] = useState("#0F172A");
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCity({ ...newCity, [name]: value });
    if (name === 'displayName') {
      setSearchQuery(value); // Sync search query with display name
    }
  };

  // Autocomplete search for cities
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery && isLoaded) {
        const autocompleteService = new window.google.maps.places.AutocompleteService();
        autocompleteService.getPlacePredictions({ input: searchQuery, types: ['(cities)'] }, (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions.map(p => ({ place_id: p.place_id, name: p.structured_formatting.main_text, formatted_address: p.structured_formatting.secondary_text || p.description })));
            setSearchStatus(status);
          } else {
            setSearchResults([]);
            setSearchStatus(status);
          }
        });
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery, isLoaded]);

  const handleSelectCityFromSearch = (place: PlaceSearchResult) => {
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
    placesService.getDetails({ placeId: place.place_id, fields: ['name', 'geometry'] }, (details, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
        setNewCity(prev => ({ ...prev, displayName: details.name || '' }));
        setMapCenter({ lat: details.geometry?.location?.lat().toString() || '', lng: details.geometry?.location?.lng().toString() || '' });
        setSearchResults([]);
        setSearchQuery(details.name || '');
      }
    });
  };

  const handleMapCenterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMapCenter({ ...mapCenter, [name]: value });
  };

  const handleSave = async () => {
    if (!newCity.displayName || !newCity.slug) {
      alert("Display Name and Slug are required.");
      return;
    }
    if (!mapCenter.lat || !mapCenter.lng || !mapZoom) {
      alert("Map Center coordinates and Map Zoom are required.");
      return;
    }
    setSaving(true);
    const dataToSave = {
      ...newCity,
      mapCenter: {
        lat: parseFloat(mapCenter.lat),
        lng: parseFloat(mapCenter.lng),
      },
      mapZoom: parseInt(mapZoom, 10),
      primaryColor: primaryColor,
    };

    try {
      await addDoc(collection(db, "cities"), dataToSave);
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
          <label className="block text-sm font-medium text-gray-700">City Name</label>
          <div className="relative">
            <input type="text" name="displayName" value={newCity.displayName} onChange={handleInputChange} placeholder="Search for a city..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" disabled={!isLoaded} />
            {searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                {searchResults.map(place => (
                  <div key={place.place_id} onClick={() => handleSelectCityFromSearch(place)} className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0">
                    <p className="font-semibold">{place.name}</p>
                    <p className="text-sm text-gray-500">{place.formatted_address}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!isLoaded && <p className="text-xs text-gray-500 mt-1">Loading map services...</p>}
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Sponsor Logo URL</label>
          <input type="text" name="sponsorLogoUrl" value={newCity.sponsorLogoUrl} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">Map Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Latitude</label>
              <input type="number" name="lat" value={mapCenter.lat} onChange={handleMapCenterChange} placeholder="e.g., 34.0522" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Longitude</label>
              <input type="number" name="lng" value={mapCenter.lng} onChange={handleMapCenterChange} placeholder="e.g., -118.2437" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Map Zoom</label>
              <input type="number" name="mapZoom" value={mapZoom} onChange={(e) => setMapZoom(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
          </div>
          <input type="text" name="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
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
  const [cities, setCities] = useState<City[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        // Fetch all necessary data in parallel
        const [venuesSnapshot, citiesSnapshot, stationsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "venues"), orderBy("venueName", "asc"))),
          getDocs(query(collection(db, "cities"), orderBy("displayName", "asc"))),
          getDocs(collection(db, "stations"))
        ]);

        const venueList = venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
        const cityList = citiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as City));
        const stationList = stationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Station));

        setVenues(venueList);
        setCities(cityList);
        setStations(stationList);
      } catch (error) {
        console.error("Error fetching venues:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const groupedVenues = useMemo(() => {
    return venues.reduce((acc, venue) => {
      const citySlug = venue.citySlug || 'unassigned';
      if (!acc[citySlug]) {
        acc[citySlug] = [];
      }
      acc[citySlug].push(venue);
      return acc;
    }, {} as Record<string, Venue[]>);
  }, [venues]);

  const stationsMap = useMemo(() => {
    return stations.reduce((acc, station) => {
      acc[station.id] = station.stationid;
      return acc;
    }, {} as Record<string, string>);
  }, [stations]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <BackIcon />
        Back to Dashboard
      </button>
      <div className="space-y-8">
        {loading ? <p>Loading venues...</p> : Object.keys(groupedVenues).sort().map(citySlug => {
          const city = cities.find(c => c.slug === citySlug);
          return (
            <div key={citySlug}>
              <h2 className="text-xl font-bold mb-4 border-b pb-2">{city?.displayName || 'Unassigned Venues'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {groupedVenues[citySlug].map(venue => (
                  <div key={venue.id} onClick={() => onSelectVenue(venue.id)} className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition hover:shadow-md flex flex-col">
                    <img src={venue.photoUrl} alt={venue.venueName} className="w-full h-32 object-cover" />
                    <div className="p-3 flex-grow flex flex-col">
                      <h3 className="text-sm font-semibold truncate">{venue.venueName}</h3>
                      {venue.stationDetails && venue.stationDetails.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <h4 className="text-xs font-bold text-gray-500 mb-1">Stations</h4>
                          <ul className="space-y-1 text-xs">
                            {venue.stationDetails.map((station, index) => (
                              <li key={index} className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 truncate">
                                {stationsMap[station.stationId] || station.stationId}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <button onClick={onAddVenue} className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center font-semibold text-gray-500 transition hover:bg-gray-100 hover:border-gray-400 h-44">
          <PlusIcon />
          <span>Add Venue</span>
        </button>
      </div>
    </div>
  );
};

const EditVenueView: React.FC<{ venueId: string; onBack: () => void }> = ({ venueId, onBack }) => {
  const [venue, setVenue] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [venueStations, setVenueStations] = useState<VenueStation[]>([{ stationId: '', stationLocation: '' }]);

  // Fetch all stations (assigned and unassigned)
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const stationsRef = collection(db, "stations");
        const q = query(stationsRef, orderBy("stationid", "asc"));
        const snapshot = await getDocs(q);
        const stationList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Station));
        setStations(stationList);
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };
    fetchStations();
  }, []);

  // Fetch the specific venue to edit
  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      const venueRef = doc(db, "venues", venueId);
      const docSnap = await getDoc(venueRef);
      if (docSnap.exists()) {
        const venueData = { id: docSnap.id, ...docSnap.data() } as Venue;
        setVenue(venueData);
        if (venueData.stationDetails && venueData.stationDetails.length > 0) {
          setVenueStations(venueData.stationDetails);
        } else {
          setVenueStations([{ stationId: '', stationLocation: '' }]);
        }
      } else {
        console.error("No such venue!");
      }
      setLoading(false);
    };
    fetchVenue();
  }, [venueId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!venue) return;
    const { name, value } = e.target;
    setVenue({ ...venue, [name]: value });
  };

  const handleSave = async () => {
    if (!venue) return;
    setSaving(true);

    try {
      const batch = writeBatch(db);
      const venueRef = doc(db, "venues", venue.id);

      const originalStationIds = new Set(venue.stationDetails?.map((s: VenueStation) => s.stationId) || []);
      const newStationIds = new Set(venueStations.filter(vs => vs.stationId).map(vs => vs.stationId));

      // Stations to be marked as unassigned
      originalStationIds.forEach(stationId => {
        if (!newStationIds.has(stationId)) {
          const stationRef = doc(db, "stations", stationId);
          batch.update(stationRef, { Assigned: false });
        }
      });

      // Stations to be marked as assigned
      newStationIds.forEach(stationId => {
        if (!originalStationIds.has(stationId)) {
          const stationRef = doc(db, "stations", stationId);
          batch.update(stationRef, { Assigned: true });
        }
      });

      // Update the venue document
      const dataToSave = { ...venue, stationDetails: venueStations.filter(vs => vs.stationId) };
      delete dataToSave.id; // Don't save the id inside the document
      batch.update(venueRef, dataToSave);

      await batch.commit();
      alert("Venue updated successfully!");
      onBack();
    } catch (error) {
      console.error("Error updating venue: ", error);
      alert("Failed to update venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleVenueStationChange = (index: number, field: keyof VenueStation, value: string) => {
    const updatedStations = [...venueStations];
    updatedStations[index][field] = value;
    setVenueStations(updatedStations);
  };

  const addVenueStation = () => {
    setVenueStations([...venueStations, { stationId: '', stationLocation: '' }]);
  };

  const removeVenueStation = (index: number) => {
    setVenueStations(venueStations.filter((_, i) => i !== index));
  };

  if (loading) return <p>Loading venue details...</p>;
  if (!venue) return <p>Could not load venue details.</p>;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <BackIcon />
        Back to Venues
      </button>
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Editing: {venue.venueName}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Venue Name</label>
          <input type="text" name="venueName" value={venue.venueName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Assign Stations</h3>
          <div className="space-y-3">
            {venueStations.map((vs, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Station ID</label>
                  <select value={vs.stationId} onChange={(e) => handleVenueStationChange(index, 'stationId', e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    <option value="">Select a station</option>
                    {stations.map(station => (
                      <option key={station.id} value={station.id}>{station.stationid}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Station Location</label>
                  <input type="text" placeholder="e.g., 'Near front entrance'" value={vs.stationLocation} onChange={(e) => handleVenueStationChange(index, 'stationLocation', e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                {venueStations.length > 1 && (
                  <button type="button" onClick={() => removeVenueStation(index)} className="p-2 text-red-500 hover:text-red-700 self-end">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addVenueStation} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Add Another Station</button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onBack} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

type VenueStation = {
  stationId: string;
  stationLocation: string;
};

const AddVenueView: React.FC<{ onBack: () => void; isLoaded: boolean }> = ({ onBack, isLoaded }) => {
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
  const [venueStations, setVenueStations] = useState<VenueStation[]>([{ stationId: '', stationLocation: '' }]);
  const [status, setStatus] = useState<google.maps.places.PlacesServiceStatus | null>(null);

  useEffect(() => {
    const fetchUnassignedStations = async () => {
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
        console.error("Error fetching unassigned stations:", error);
      }
    };
    if (isLoaded) {
      fetchUnassignedStations();
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
          stationDetails: [], // Initialize with empty array
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

  const handleSaveVenue = async () => {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      // Add selected stations to the place object before saving
      const placeToSave = {
        ...selectedPlace,
        stationDetails: venueStations.filter(vs => vs.stationId), // Filter out empty entries
        totalChargersAvailable: venueStations.filter(vs => vs.stationId).length,
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
        sortOrder: placeToSave.sortOrder,
        stationDetails: placeToSave.stationDetails,
        totalChargersAvailable: placeToSave.totalChargersAvailable,
        totalSlotsFree: placeToSave.totalSlotsFree,
        opening_hours_text: selectedPlace.opening_hours_text,
      };

      // 1. Add the new venue to the batch
      const newVenueRef = doc(collection(db, "venues"));
      batch.set(newVenueRef, dataToSave);

      // 2. Update each assigned station in the batch
      placeToSave.stationDetails.forEach(stationDetail => {
        const stationRef = doc(db, "stations", stationDetail.stationId);
        batch.update(stationRef, { Assigned: true });
      });

      await batch.commit();
      alert("Venue added successfully!");
      onBack();
    } catch (error) {
      console.error("Error adding venue: ", error);
      alert("Failed to add venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleVenueStationChange = (index: number, field: keyof VenueStation, value: string) => {
    const updatedStations = [...venueStations];
    updatedStations[index][field] = value;
    setVenueStations(updatedStations);
  };

  const addVenueStation = () => {
    setVenueStations([...venueStations, { stationId: '', stationLocation: '' }]);
  };

  const removeVenueStation = (index: number) => {
    setVenueStations(venueStations.filter((_, i) => i !== index));
  };

  const handleBackToSearch = () => {
    setSelectedPlace(null);
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
            <div className="space-y-3">
              {venueStations.map((vs, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Station ID</label>
                    <select value={vs.stationId} onChange={(e) => handleVenueStationChange(index, 'stationId', e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                      <option value="">Select a station</option>
                      {stations.map(station => (
                        <option key={station.id} value={station.id}>{station.stationid}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Station Location</label>
                    <input type="text" placeholder="e.g., 'Near front entrance'" value={vs.stationLocation} onChange={(e) => handleVenueStationChange(index, 'stationLocation', e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                  </div>
                  {venueStations.length > 1 && (
                    <button type="button" onClick={() => removeVenueStation(index)} className="p-2 text-red-500 hover:text-red-700 self-end">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addVenueStation} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Add Another Station</button>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={handleBackToSearch} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              Back to Search
            </button>
            <button onClick={handleSaveVenue} disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
              {saving ? "Saving..." : "Save Venue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const placesLibraries: ("places")[] = ["places"];

const AdminDashboardPage: React.FC = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"dashboard" | "cities" | "venues">("dashboard");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isAddingVenue, setIsAddingVenue] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script-admin", // Use a unique ID
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: placesLibraries,
    nonce: (window as any).cspNonce, // This nonce must be passed from the server.
  });

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
          <AddCityView onBack={() => { setIsAddingCity(false); setView("cities"); }} isLoaded={isLoaded} />
        )}

        {view === "venues" && !isAddingVenue && !selectedVenueId && (
          <ManageVenuesView
            onBack={() => setView("dashboard")}
            onAddVenue={() => setIsAddingVenue(true)}
            onSelectVenue={(id) => setSelectedVenueId(id)}
          />
        )}
        {view === "venues" && selectedVenueId && (
          <EditVenueView venueId={selectedVenueId} onBack={() => setSelectedVenueId(null)} />
        )}
        {view === "venues" && isAddingVenue && (
          <AddVenueView onBack={() => setIsAddingVenue(false)} isLoaded={isLoaded} />
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;