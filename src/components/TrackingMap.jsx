import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom purple circle marker for provider (smaller)
const providerIcon = L.divIcon({
  className: 'custom-provider-marker',
  html: `
    <div style="position: relative;">
      <div style="width: 32px; height: 32px; background: #7c3aed; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.5); display: flex; align-items: center; justify-content: center;">
        <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Custom purple pin marker with checkmark for customer (compact)
const customerIcon = L.divIcon({
  className: 'custom-customer-marker',
  html: `
    <div style="position: relative; width: 30px; height: 40px;">
      <div style="width: 30px; height: 38px; background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 3px 10px rgba(124, 58, 237, 0.5); display: flex; align-items: center; justify-content: center; border: 2px solid white; position: absolute; top: 0; left: 0;">
        <svg style="width: 12px; height: 12px; transform: rotate(45deg);" fill="white" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div style="position: absolute; top: 38px; left: 50%; transform: translateX(-50%); width: 60px; height: 60px; background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.08) 50%, transparent 70%); border-radius: 50%; animation: pulse 2s infinite;"></div>
    </div>
  `,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

const MapUpdater = ({ providerPos, customerPos }) => {
  const map = useMap();
  useEffect(() => {
    if (providerPos && customerPos) {
      const bounds = L.latLngBounds([providerPos, customerPos]);
      map.fitBounds(bounds, { 
        padding: [100, 100],
        maxZoom: 12,
        animate: true,
        duration: 1
      });
    } else if (customerPos) {
      map.setView(customerPos, 11);
    }
  }, [providerPos, customerPos, map]);
  return null;
};

export const TrackingMap = ({ providerPos, customerPos, route, roadRoute, alternativeRoutes = [] }) => {
  const center = customerPos || [40.7128, -74.0060];
  
  console.log('🗺️ MAP: Rendering - Provider:', providerPos, 'Customer:', customerPos, 'Route points:', route.length);
  
  return (
    <MapContainer 
      key="map" 
      center={center} 
      zoom={11} 
      className="h-full w-full" 
      scrollWheelZoom={true}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      zoomControl={false}
      style={{ background: '#f5f5f5' }}
      maxBounds={null}
      maxBoundsViscosity={0}
    >
      <TileLayer 
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {/* Road route between provider and customer */}
      {roadRoute && roadRoute.length > 0 && (
        <Polyline 
          positions={roadRoute} 
          color="#2563eb" 
          weight={4} 
          opacity={0.8}
        />
      )}
      
      {/* Alternative routes */}
      {alternativeRoutes.map((altRoute, index) => (
        <Polyline 
          key={index}
          positions={altRoute} 
          color="#94a3b8" 
          weight={3} 
          opacity={0.5}
          dashArray="5, 10"
        />
      ))}
      

      
      {/* Customer marker (destination) */}
      {customerPos && (
        <Marker position={customerPos} icon={customerIcon} />
      )}
      
      {/* Provider marker (current location) */}
      {providerPos && (
        <Marker position={providerPos} icon={providerIcon} />
      )}
      
      <MapUpdater providerPos={providerPos} customerPos={customerPos} />
    </MapContainer>
  );
};
