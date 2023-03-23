const serverUrl = 'http://localhost:8080';
//const serverUrl = 'https://server-5acaqpvhyq-as.a.run.app';

function redirect(path) {
    if (path) {
        location.replace(path);//`/pattern-tracker${path}`);
    }
}

function logout() {
    fetch(`${serverUrl}/logout`, {
        method: 'POST',
        credentials: "include",
        headers: {
        }
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error == null) {
                redirect('login.html');
            } else {
                displayErrorMessage(data.error);
            }
        })
}
