import { addressAddApi } from "../api/api";

const SendLocationButton = () => {
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                console.log("Latitude:", latitude);
                console.log("Longitude:", longitude);

                // 👉 send to backend if needed
                // api.sendLocation({ latitude, longitude });
                try {
                    let res = await addressAddApi([latitude, longitude])
                } catch (error) {
                    console.log(error);
                }
            },
            (error) => {
                console.error(error);
                alert("Location permission denied");
            }
        );
    };

    return (
        <button
            onClick={getCurrentLocation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
            Send Location
        </button>
    );
};

export default SendLocationButton;
