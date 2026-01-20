import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSocket } from '../hooks/useSocket';
import { calculateDistance, calculateETA } from '../utils/tracking';
import SendLocationButton from './SendLocationbutton';
import { getMyAdressApi, userBookedServiceApi } from '../api/api';
import { Link, useNavigate, useParams } from "react-router-dom";


// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Customer marker icon
const customerIcon = L.divIcon({
  className: 'custom-customer-marker',
  html: `
    <div style="position: relative; width: 30px; height: 40px;">
      <div style="width: 30px; height: 38px; background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 3px 10px rgba(124, 58, 237, 0.5); display: flex; align-items: center; justify-content: center; border: 2px solid white; position: absolute; top: 0; left: 0;">
        <svg style="width: 12px; height: 12px; transform: rotate(45deg);" fill="white" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

const CustomerView = ({ tripId }) => {
  const socket = useSocket();
  const { id } = useParams()
  const navigate = useNavigate()
  const [providerLocation, setProviderLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [roadRoute, setRoadRoute] = useState([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [tripData, setTripData] = useState(null);
  const [distance, setDistance] = useState(0);
  const [eta, setEta] = useState(0);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [rideTime, setRideTime] = useState(0);

  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [lastRouteFetch, setLastRouteFetch] = useState(0);
  const [waitingForProvider, setWaitingForProvider] = useState(true);
  const [providerTimeout, setProviderTimeout] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [actualTripId, setActualTripId] = useState(null);

  useEffect(() => {
    // Set fixed customer location
    setCustomerLocation([15.838993, 73.568532]);

    const getBookedService = async () => {
      if (id) {
        try {
          const result = await userBookedServiceApi(id);
          setBookings(result.bookings);
          console.log(result, "booked service result");

          const booking = result?.bookings[0];
          if (booking) {
            setActualTripId(booking._id);
            setCustomerLocation([booking.lat, booking.lon]);
            console.log('Trip ID:', booking._id, 'Customer location:', booking.lat, booking.lon);
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    getBookedService();
  }, [id]);

  useEffect(() => {
    if (providerLocation && customerLocation && roadRoute.length === 0) {
      getRoadRoute(providerLocation[0], providerLocation[1], customerLocation[0], customerLocation[1]);
    }
  }, [providerLocation, customerLocation]);

  const handleRouteSelect = (index) => {
    setSelectedRouteIndex(index);
    setRoadRoute(alternativeRoutes[index]);
  };

  const getRoadRoute = async (startLat, startLng, endLat, endLng) => {
    const now = Date.now();
    if (roadRoute.length > 0 && now - lastRouteFetch < 5000) return;
    
    setLastRouteFetch(now);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=2`
      );
      if (!response.ok) return;
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const mainRoute = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoadRoute(mainRoute);
        
        const altRoutes = data.routes.slice(1).map(route => 
          route.geometry.coordinates.map(coord => [coord[1], coord[0]])
        );
        setAlternativeRoutes(altRoutes);
      }
    } catch (error) {
      // Silently fail
    }
  };

  useEffect(() => {
    if (customerLocation && socket) {
      // Send fixed customer location to provider
      socket.emit('customer:location', { id, lat: customerLocation[0], lng: customerLocation[1] });
    }
  }, [customerLocation, socket, id]);

  useEffect(() => {
    if (!socket) {
      console.log('⏳ Socket not ready yet');
      return;
    }

    console.log('👤 CUSTOMER: Joining trip with ID:', actualTripId || id);
    socket.emit('customer:join', actualTripId || id);
    
    // Request current provider location
    setTimeout(() => {
      socket.emit('request:provider:location', actualTripId || id);
      console.log('📍 CUSTOMER: Requested provider location for trip:', actualTripId || id);
    }, 1000);

    // Debug: Listen for any events
    const originalEmit = socket.emit;
    const originalOn = socket.on;
    
    socket.onAny((eventName, ...args) => {
      console.log('🔊 CUSTOMER: Received event:', eventName, args);
    });

    socket.on('trip:data', (data) => {
      console.log('✅ CUSTOMER: Trip data received:', data);
      setTripData(data);
    });

    socket.on('location:update', (data) => {
      console.log('📍 CUSTOMER: Provider location update received:', JSON.stringify(data));
      if (data && data.lat && data.lng) {
        const newPos = [data.lat, data.lng];
        setProviderLocation(newPos);
        setWaitingForProvider(false);
        setProviderTimeout(false);
        
        if (customerLocation) {
          const dist = calculateDistance(data.lat, data.lng, customerLocation[0], customerLocation[1]);
          setDistance(dist);
          setEta(calculateETA(dist));
          getRoadRoute(data.lat, data.lng, customerLocation[0], customerLocation[1]);
        }
      } else {
        console.log('⚠️ CUSTOMER: Invalid location data received');
      }
    });

    socket.on('provider:location', (data) => {
      console.log('📍 CUSTOMER: Provider location received:', JSON.stringify(data));
      console.log('🔍 CUSTOMER: My trip ID:', actualTripId || id, 'Provider trip ID:', data.tripId);
      if (data && data.lat && data.lng) {
        console.log('✅ CUSTOMER: Setting provider location to:', data.lat, data.lng);
        const newPos = [data.lat, data.lng];
        setProviderLocation(newPos);
        setRoute(prev => [...prev, newPos]);
        setWaitingForProvider(false);
        setProviderTimeout(false);

        if (customerLocation) {
          const dist = calculateDistance(data.lat, data.lng, customerLocation[0], customerLocation[1]);
          setDistance(dist);
          setEta(calculateETA(dist));
          getRoadRoute(data.lat, data.lng, customerLocation[0], customerLocation[1]);
        }
      } else {
        console.log('⚠️ CUSTOMER: Invalid provider location data received');
      }
    });

    socket.on('trip:ended', () => {
      console.log('🛑 CUSTOMER: Trip ended');
      alert('Trip has ended');
    });

    return () => {
      console.log('🧹 CUSTOMER: Cleaning up socket listeners');
      socket.off('trip:data');
      socket.off('location:update');
      socket.off('provider:location');
      socket.off('trip:ended');
    };
  }, [socket, actualTripId, id, customerLocation]);

  // Add timeout for provider location
  useEffect(() => {
    if (waitingForProvider && socket) {
      const timeout = setTimeout(() => {
        setProviderTimeout(true);
      }, 30000); // 30 seconds timeout
      
      return () => clearTimeout(timeout);
    }
  }, [waitingForProvider, socket]);

  useEffect(() => {
    if (providerLocation) {
      const interval = setInterval(() => {
        setRideTime(prev => prev + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [providerLocation]);

  if (!customerLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="text-2xl font-bold mb-2">Location Required</h2>
          <p className="text-gray-600 mb-4">
            {locationError ? (
              <span className="text-red-600">❌ {locationError}</span>
            ) : (
              'Please allow location access to use the tracker'
            )}
          </p>
          <p className="text-sm text-gray-500">Waiting for your location...</p>
        </div>
      </div>
    );
  }

  const getMyaddress = async () => {
    try {
      const result = await getMyAdressApi()
      console.log(result, "result");

      setCustomerLocation({ lat: result?.UserLocation?.location[0], lng: result?.UserLocation?.location[1] });

    } catch (error) {
      console.log(error);

    }
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  console.log('👤 CUSTOMER VIEW: Provider location:', providerLocation, 'Route length:', route.length);

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center px-4 py-3">
          <button className="mr-3" onClick={() => window.history.back()}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1 text-center mr-9">Track Live Location</h1>
        </div>
        <div>
          <button
            onClick={handleLogout}
            className='border-2 rounded-sm mx-4 px-3 py-3'>
            Logout
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ touchAction: 'pan-y' }}>
        {providerLocation ? (
          <div style={{ height: '100%', width: '100%' }}>
            <MapContainer
              center={[providerLocation[0], providerLocation[1]]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {alternativeRoutes.map((altRoute, index) => (
                <Polyline
                  key={index}
                  positions={altRoute}
                  color={index === selectedRouteIndex ? "#2563eb" : "#94a3b8"}
                  weight={index === selectedRouteIndex ? 4 : 3}
                  opacity={index === selectedRouteIndex ? 0.8 : 0.5}
                  dashArray={index === selectedRouteIndex ? "" : "5, 10"}
                  eventHandlers={{
                    click: () => handleRouteSelect(index)
                  }}
                />
              ))}

              <Marker position={[providerLocation[0], providerLocation[1]]}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong>📍 Provider Location</strong><br />
                    Lat: {providerLocation[0]}<br />
                    Lng: {providerLocation[1]}<br />
                    <span style={{ color: '#22c55e', fontSize: '12px' }}>• Live Tracking</span>
                  </div>
                </Popup>
              </Marker>
              {customerLocation && (
                <Marker position={[customerLocation[0], customerLocation[1]]} icon={customerIcon}>
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong>👤 Customer Location</strong><br />
                      Lat: {customerLocation[0]}<br />
                      Lng: {customerLocation[1]}<br />
                      <span style={{ color: '#7c3aed', fontSize: '12px' }}>• Destination</span>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
              {providerTimeout ? (
                <>
                  <p style={{ color: '#dc2626', fontWeight: 'bold' }}>Provider not found</p>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>The service provider may not be online or tracking may not have started yet.</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Refresh
                  </button>
                </>
              ) : (
                <>
                  <p style={{ color: '#6b7280' }}>Getting provider location...</p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px' }}>Trip ID: {id}</p>
                  <p style={{ color: '#9ca3af', fontSize: '12px' }}>Socket: {socket ? '✅ Connected' : '❌ Disconnected'}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Card */}
      <div className="flex-shrink-0">
        {/* Green Provider Card */}
        <div className="bg-green-500 text-white px-5 py-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              <div>
                <h2 className="text-lg font-bold">{tripData?.provider?.name || 'John Doe'}</h2>
                <p className="text-xs opacity-90">Service Provider</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="bg-white text-green-500 p-2.5 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button className="bg-white/20 border-2 border-white text-white p-2.5 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="opacity-90">{tripData?.provider?.vehicle || 'Toyota Camry - ABC123'}</span>
          </div>
        </div>

        {/* White Stats Card */}
        <div className="bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Arriving in</p>
              <p className="text-xl font-bold text-gray-900">{eta} Mins</p>
            </div>
            <div className="text-center border-l border-r border-gray-200">
              <p className="text-gray-500 text-xs mb-1">Ride Time</p>
              <p className="text-xl font-bold text-gray-900">{rideTime} Mins</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs mb-1">Total KM</p>
              <p className="text-xl font-bold text-gray-900">{distance.toFixed(1)} km</p>
            </div>
          </div>

          {/* Cancel Button */}
          <div className='space-y-2'>
            {/* Notes Section */}
            <div className="mb-3">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="w-full bg-gray-100 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                📝 {showNotes ? 'Hide Notes' : 'Add Notes'}
              </button>
              {showNotes && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add trip notes or special instructions..."
                  className="w-full mt-2 p-3 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={3}
                />
              )}
            </div>
            {/* <SendLocationButton /> */}
            {/* <button
              onClick={getMyaddress}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Track Now
            </button> */}

            <Link to={'/bookedservice'}>
              <button
                onClick={getMyaddress}
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors">
                Booked History
              </button>
            </Link>

            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Cancel Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerView