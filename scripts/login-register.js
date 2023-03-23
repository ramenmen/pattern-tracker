let submitBtn = document.querySelector('#register-button');
const username = document.querySelector('#username');
const password = document.querySelector('#password');

let isRecaptchaValidated = false;

const errorMsg = document.querySelector('#error-message');

const serverUrl = 'http://localhost:8080';
//const serverUrl = 'https://server-5acaqpvhyq-as.a.run.app';

function displayErrorMessage(message = '', hide = false) {
    errorMsg.textContent = message;
    errorMsg.style.display = hide
        ? "none"
        : "inherit";
}

function onRecaptchaSuccess() {
    isRecaptchaValidated = true;
}

function onRecaptchaError() {
    isRecaptchaValidated = false;
}

function onRecaptchaResponseExpiry() {
    isRecaptchaValidated = false;
}

if (submitBtn) {
    submitBtn.addEventListener('click',registerUser);
} else {
    submitBtn = document.querySelector('#login-button');
    submitBtn.addEventListener('click',loginUser);
}

function registerUser() {
    fetch(`${serverUrl}/register`, {
        method: 'POST',
        credentials: "include",
        headers: {
            // 'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ 
            'username':username.value, 
            'password':password.value })
    })
    .then((response)=>response.json())
    .then((data) => {
        if (data.error == null) {
            redirect('/login.html');
        } else {
            displayErrorMessage(data.error);
        }
    })
}

function loginUser() {
    if (!isRecaptchaValidated) {
        displayErrorMessage('Please fill in captcha!');
    } else {
        fetch(`${serverUrl}/login`, {
            method: 'POST',
            credentials: "include",
            headers: {
                // 'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'username': username.value,
                'password': password.value
            })
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.error == null) {
                redirect('/index.html?logged-in=true');
            } else {
                displayErrorMessage(data.error);
            }
        })
    }
}
