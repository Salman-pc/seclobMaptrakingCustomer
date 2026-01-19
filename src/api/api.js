import axiosConfig from "../config/axiosConfig"


export const registerUserApi = async (userData)=>{
    try {
        const response = await axiosConfig.post("/api/user/auth/register",userData)
        return response.data
    } catch (error) {
        throw error;
    }
}

export const loginUserApi = async (userData)=>{
    try {
        const response = await axiosConfig.post("/v1/user-no/auth/login",userData)
        return response
    } catch (error) {
        throw error;
    }
}

export const addressAddApi = async (userData)=>{
    try {
        const response = await axiosConfig.post("/api/user/address/add",{"location":userData})
        return response.data
    } catch (error) {
        throw error;
    }
}

export const getMyAdressApi = async ()=>{
    try {
        const response = await axiosConfig.get("/api/user/address/list")
        return response.data
    } catch (error) {
        throw error;
    }
}

export const userBookedServiceApi = async (id)=>{
    try {
        const params={}
        if(id) params._id=id
        const response = await axiosConfig.get("/v1/vehicleServiceCustomer/booking/customer",{params})
        return response.data.data
    } catch (error) {
        throw error;
    }
}