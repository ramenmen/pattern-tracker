const fileUpload = document.querySelector('#pattern-file');
const uploadBtn = document.querySelector('#upload-button');
uploadBtn.addEventListener('click', uploadFile);

const uploadUri = `${serverUrl}/upload-file`;

function uploadFile() {
    const filePath = fileUpload.value.split('\\');
    const fileName = filePath[filePath.length - 1].split('.')[0];
    const reader = new FileReader();
    reader.addEventListener(
        "load",
        () => {
            sendUploadFileRequest(fileName,reader.result)
        },
        false
    );

    reader.readAsText(fileUpload.files[0]);
}

function sendUploadFileRequest(fileName,requestBody){
    fetch(`${uploadUri}?name=${fileName}`, {
        method: "POST",
        credentials: 'include',
        body: requestBody
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.redirect != null) {
            goTo(data.redirect);
        } else {
           // displayErrorMessage(data.error);
        }
    });
}
