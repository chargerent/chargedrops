import React, { useEffect, useRef } from "react";
import { GoogleMap, OverlayView } from "@react-google-maps/api";
import dropLogo from "/drop_logo.svg";

type Venue = {
  id: string;
  venueName: string;
  lat: number;
  lng: number;
  totalChargersAvailable: number;
  totalSlotsFree: number;
};

type MapViewProps = {
  // We now expect the full venue object
  venues: Venue[];
  selectedVenue: Venue | null;
  cityCenter: { lat: number; lng: number } | null;
  cityZoom: number;
  onSelectVenue: (id: string | null) => void;
  isLoaded: boolean; // Add this prop
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false, // Prevents clicks on default map POIs
};

const MapView: React.FC<MapViewProps> = ({
  venues,
  selectedVenue,
  cityCenter,
  cityZoom,
  onSelectVenue,
  isLoaded, // Receive this from the parent
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const initialLoadRef = useRef(true);

  // When a venue is selected from the list, pan the map to it
  useEffect(() => {
    // On initial load, we want the `onLoad` fitBounds to take priority.
    // We skip the first pan-to-selection to avoid overriding the initial zoom.
    if (mapRef.current && selectedVenue && !initialLoadRef.current) {
      mapRef.current.panTo({ lat: selectedVenue.lat, lng: selectedVenue.lng });
    }
    if (selectedVenue) {
      initialLoadRef.current = false;
    }
  }, [selectedVenue]);

  if (!isLoaded || !cityCenter) {
    return <div>Loading Map...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={cityCenter}
      zoom={cityZoom}
      options={mapOptions}
      onLoad={(map) => {
        mapRef.current = map;
        // Once the map loads, if we have venues, fit them to the bounds.
        if (venues.length > 0) {
          if (venues.length === 1) {
            // For a single venue, just center and set a default zoom.
            map.panTo({ lat: venues[0].lat, lng: venues[0].lng });
            map.setZoom(cityZoom);
            return;
          }

          const bounds = new window.google.maps.LatLngBounds();
          venues.forEach((venue) => {
            bounds.extend(new window.google.maps.LatLng(venue.lat, venue.lng));
          });
          // Add a bit of padding (50px) so markers aren't at the very edge.
          map.fitBounds(bounds, 50);
        }
      }}
      onClick={() => onSelectVenue(null)}
    >
      {venues.map((venue) => (
        <OverlayView
          key={venue.id}
          position={{ lat: venue.lat, lng: venue.lng }}
          // This positions the custom marker correctly above the coordinate
          getPixelPositionOffset={(width, height) => ({
            x: -(width / 2),
            y: -height,
          })}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            onClick={(e) => {
              e.stopPropagation(); // Prevent map's onClick from firing
              onSelectVenue(venue.id);
            }}
            className="flex flex-col items-center cursor-pointer"
          >
            {/* The main panel */}
            <div className="flex flex-col items-center gap-1 bg-white rounded-lg shadow-lg px-3 py-1.5 border-2 border-transparent data-[selected=true]:border-blue-500">
              <div className="text-xs font-bold text-gray-800 whitespace-nowrap">
                {venue.venueName}
              </div>
              <div className="flex items-center gap-2 text-xs font-medium whitespace-nowrap">
                <span className="flex items-center gap-1 text-blue-700">
                  <img src={dropLogo} alt="charger" className="h-4 w-4" />
                  {venue.totalChargersAvailable} charger{venue.totalChargersAvailable === 1 ? '' : 's'}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{venue.totalSlotsFree} slots</span>
              </div>
            </div>
            {/* The triangle pointing down */}
            <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white -mt-1 drop-shadow-lg data-[selected=true]:border-t-blue-500" />
          </div>
        </OverlayView>
      ))}
    </GoogleMap>
  );
};

export default MapView;