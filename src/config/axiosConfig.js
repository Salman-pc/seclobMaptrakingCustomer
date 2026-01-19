
import axios from "axios";
export const baseURL =  "https://apigateway.seclob.com/" ;
// export const baseURL =  "http://localhost:3010";
export const notificationURL = "https://notificationservice.seclob.com";
// export const notificationURL = "http://localhost:3020";


const axiosConfig = axios.create({
  baseURL,
});

export default axiosConfig;

axiosConfig.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);