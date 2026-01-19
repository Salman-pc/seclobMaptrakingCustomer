import React, { useEffect, useState } from 'react';
import { userBookedServiceApi } from '../api/api';
import { useNavigate } from 'react-router-dom';

const UserBookedService = () => {
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  const getBookedService = async () => {
    try {
      const result = await userBookedServiceApi();
      setBookings(result.bookings);
      console.log(result, "booked service");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getBookedService();
  }, []);

  const onTrack = (item) => {
    navigate(`/${item._id}`);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">
        Customer Booked Details
      </h1>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {bookings
          ?.filter(item => item?.bookingStatus === "confirmed")
          .map(item => (
            <div
              key={item._id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3"
            >
              {/* Service Name */}
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-900">
                  {item.subCategoryId?.name}
                </h2>

                <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                  {item.bookingStatus}
                </span>
              </div>

              {/* Date & Time */}
              <div className="text-sm text-gray-600">
                📅 {new Date(item.bookingDate).toLocaleDateString()}
                <span className="ml-2">⏰ {item.bookingTime}</span>
              </div>

              {/* Location */}
              <div className="text-sm text-gray-600">
                📍 {item.city}, {item.regionName}, {item.country}
              </div>

              {/* Track Button */}
              <button
                onClick={() => onTrack(item)}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Track Now
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UserBookedService;
