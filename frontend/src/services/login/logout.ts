import { api } from "../api";


export async function logoutUser(){

    const response = await api.post('/auth/logout')
    localStorage.removeItem('token');
    localStorage.removeItem('nome');
    
    return response.data

}