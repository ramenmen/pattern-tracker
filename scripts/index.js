const urlParams = new URL(location.href).searchParams;
const isLoggedIn = urlParams.get('logged-in');

if (isLoggedIn != 'true') {
    //ask server if you are logged in?
} else {
    redirect('patterns-list.html');
}