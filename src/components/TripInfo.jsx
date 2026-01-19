export const TripInfo = ({ provider, distance, eta }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {provider?.name?.[0] || 'P'}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{provider?.name || 'Service Provider'}</h2>
          <p className="text-gray-600">{provider?.vehicle || 'Vehicle Info'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Distance</p>
          <p className="text-2xl font-bold text-blue-600">{distance.toFixed(1)} km</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-sm">ETA</p>
          <p className="text-2xl font-bold text-green-600">{eta} min</p>
        </div>
      </div>
      
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 pt-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live tracking active</span>
      </div>
    </div>
  );
};
