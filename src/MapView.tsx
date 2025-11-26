import React from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

export type MapVenue = {
  id: string;
  venueName: string;
  lat: number;
  lng: number;
};

type MapCenter = {
  lat: number;
  lng: number;
};

type MapViewProps = {
  venues: MapVenue[];
  selectedVenue: MapVenue | null;
  cityCenter: MapCenter | null;
  cityZoom: number;
  onSelectVenue?: (id: string) => void;
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const fallbackCenter: MapCenter = { lat: 34.0522, lng: -118.2437 }; // LA default

const MapView: React.FC<MapViewProps> = ({
  venues,
  selectedVenue,
  cityCenter,
  cityZoom,
  onSelectVenue,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  if (loadError) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center px-4 text-xs text-red-600 text-center">
        Unable to load map right now.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center px-4 text-xs text-gray-600">
        <div className="uppercase tracking-wide mb-1">Loading map…</div>
        <div>Fetching Google Maps tiles.</div>
      </div>
    );
  }

  const center: MapCenter =
    selectedVenue?.lat && selectedVenue?.lng
      ? { lat: selectedVenue.lat, lng: selectedVenue.lng }
      : cityCenter ?? fallbackCenter;

  const zoom = cityZoom || 13;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={{
        disableDefaultUI: false,
        clickableIcons: false,
      }}
    >
      {venues.map((v) => (
        <Marker
          key={v.id}
          position={{ lat: v.lat, lng: v.lng }}
          onClick={() => onSelectVenue?.(v.id)}
        />
      ))}
    </GoogleMap>
  );
};

export default MapView;
