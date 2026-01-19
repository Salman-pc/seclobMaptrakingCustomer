import { useState } from "react";
import { loginUserApi, registerUserApi } from "../api/api";
import { useNavigate } from "react-router-dom";

const AuthForm = ({ mode = "login" }) => {
    const isSignup = mode === "signup";
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "customer" });
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let response;
            if (isSignup) {
                response = await registerUserApi(formData);
            } else {
                response = await loginUserApi(formData)
            }
            console.log("Authentication successful:", response.data);
            localStorage.setItem("accessToken", response.data.accessToken);
            navigate("/");
        } catch (error) {
            console.error("Authentication failed:", error);
            alert(error.response?.data?.message || "An error occurred");
        }

    };

    return (
        <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-6 space-y-4 shadow rounded-2xl">
            <h2 className="text-xl font-semibold text-center">
                {isSignup ? "Create Account" : "Login"}
            </h2>


            {isSignup && (
                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    required
                    className="w-full border p-2 rounded"
                    onChange={handleChange}
                />
            )}


            <input
                type="email"
                name="email"
                placeholder="Email"
                required
                className="w-full border p-2 rounded"
                onChange={handleChange}
            />


            <input
                type="password"
                name="password"
                placeholder="Password"
                required
                className="w-full border p-2 rounded"
                onChange={handleChange}
            />


            {isSignup && (
                <select
                    name="role"
                    className="w-full border p-2 rounded"
                    onChange={handleChange}
                >
                    <option value="customer">Customer</option>
                    <option value="provider">Provider</option>
                </select>
            )}


            <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded"
            >
                {isSignup ? "Sign Up" : "Login"}
            </button>
             <p>{mode == "login" ? <div
                onClick={() => navigate('/signup')}

            >
                sign up
            </div> :
                <div
                    onClick={() => navigate('/login')}
                >
                    sign in
                </div>
            }</p>
        </form>
    );
};


export default AuthForm;