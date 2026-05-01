

export function logoutUser(){

    localStorage.removeItem('token');
    localStorage.removeItem('nome');

}