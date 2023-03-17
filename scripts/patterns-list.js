const patternUri = "http://localhost:8089/pattern-list";
const patternContainer = document.querySelector('.pattern-container');
const editBtn = document.querySelector('#edit-button');
editBtn.addEventListener('click',toggleDeleteBtns);
let showDeleteBtn = false;
let patternRowsDisplay;
let patternRowElements;
let patternList;
let addPatternButtonRow;

fetch(patternUri, {
    method: 'GET',
    credentials: "include",
    headers: {
        // 'Accept': 'application/json',
        //'Content-Type': 'application/x-www-form-urlencoded'
    }//,
    // body: new URLSearchParams({
    //     'username': username.value,
    //     'password': password.value
    // })
})
.then((response) => response.json())
.then((data) => {
    patternList = data;
    generatePatternRows();
})

function getPatternJSON (patternId){
    return localStorage.getItem(`${storagePatternPrefix}${patternId}`);
}

function generatePatternRows() {
    if (patternRowsDisplay) {
        patternRowsDisplay.remove();
    }
    patternRowElements = [];
    const myList = document.createElement('ul');
    myList.setAttribute("class", "pattern-rows-container");
    patternContainer.appendChild(myList);

    patternRowsDisplay = myList;
    for (i=0;i<patternList.length;i++) {
        let rowElement = createPatternViewRow(i);
        patternRowsDisplay.appendChild(rowElement);
        patternRowElements[i] = rowElement;
    }

    const myPara = document.createElement('li');
    myList.appendChild(myPara);
    myPara.setAttribute("class", "pattern-row");
    myPara.setAttribute("id", "add-pattern-row");

    const myButton = document.createElement('button');
    myButton.setAttribute('type', 'button');
    myButton.setAttribute('class', 'row-button');
    myButton.textContent = `+ Add New Pattern`;
    myPara.appendChild(myButton);
    myButton.addEventListener('click', addNewRow);
    addPatternButtonRow = myPara;
}

function createPatternViewRow(rowNumber) {  
    let patternObject = patternList[rowNumber];  
    const name = patternObject.name;
    const finished = patternObject.finished;
    
    const myPara = document.createElement('li');
    myPara.setAttribute("class", "pattern-row");
    
    if (finished) {
        myPara.classList.add('faded');
    } 
    
    // const myItem = document.createElement('p');
    // myItem.textContent = name;
    // myPara.appendChild(myItem);
    // myItem.setAttribute("class", "pattern-row-content");

    const myItem = document.createElement('a');
    myItem.textContent = name;
    myPara.appendChild(myItem);
    myItem.setAttribute("href", `pattern.html?id=${patternObject._id}`);
    myItem.setAttribute("class", "pattern-row-content");

    const myDeleteBtn = document.createElement('p');
    myDeleteBtn.textContent = 'T';
    myPara.appendChild(myDeleteBtn);
    myDeleteBtn.classList.add("symbol-button");
    myDeleteBtn.classList.add("delete-pattern-button");
    myDeleteBtn.classList.add("hidden");
    myDeleteBtn.setAttribute('row-number', rowNumber);
    myDeleteBtn.addEventListener('click', deletePattern);

    // const myEditButton = document.createElement('p');
    // myEditButton.textContent = 'L';
    // myPara.appendChild(myEditButton);
    // myEditButton.setAttribute("class", "edit-pattern-button");
    // myEditButton.setAttribute('row-number', rowNumber);
    // myEditButton.addEventListener('click', editPatternName);

    return myPara;
}

function addNewRow() {
    let newRow = createPatternEditRow(patternRowElements.length);
    patternRowsDisplay.insertBefore(newRow, addPatternButtonRow);
    window.scrollBy(0, newRow.offsetHeight);
    patternRowElements.push(newRow);
    newRow.querySelector("input.pattern-row-content").focus();
}

function editPatternName(e) {
    let rowNumber = e.target.getAttribute('row-number');
    const row = patternRowElements[rowNumber];
    let myNewRow = createPatternEditRow(rowNumber);
    row.replaceWith(myNewRow);
    patternRowElements[rowNumber] = myNewRow;
    myNewRow.querySelector("input.pattern-row-content").focus();
}

function deletePattern(e) {
    let rowNumber = e.target.getAttribute('row-number');
    let id = patternList[rowNumber]._id;
    
    let requestUri = `${patternUri}?id=${id}`;
    fetch(requestUri, {
        method: 'DELETE',
        credentials: "include",
        headers: {
            // 'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    })
        .then((response) => response.json())
        .then((data) => {
            //it will return the success story
            if (data.success) {
                const row = patternRowElements[rowNumber];
                row.remove();
                patternRowElements[rowNumber] = null;
                patternList[rowNumber] = null;
            }
        })
}

function createPatternEditRow(rowNumber) {
    if (patternList[rowNumber] == null) {
        patternList[rowNumber] = {name:'my pattern', finished:false};
    }
    let patternObject = patternList[rowNumber];

    const myPara = document.createElement('li');
    myPara.setAttribute("class", "pattern-row");

    const myItem = document.createElement('input');
    myItem.type = "text";
    myItem.value = patternObject.name;
    myPara.appendChild(myItem);
    myItem.setAttribute("class", "pattern-row-content");

    const cancelBtn = document.createElement('p');
    cancelBtn.textContent = '✖';
    myPara.appendChild(cancelBtn);
    cancelBtn.setAttribute('row-number', rowNumber);
    cancelBtn.addEventListener('click', cancelEdit);
    cancelBtn.setAttribute('class', 'end-button');

    const saveBtn = document.createElement('p');
    saveBtn.textContent = '✔';
    myPara.appendChild(saveBtn);
    saveBtn.setAttribute('row-number', rowNumber);
    saveBtn.addEventListener('click', savePattern);
    saveBtn.setAttribute('class', 'end-button');

    return myPara;
}

function savePattern(e) {
    let rowNumber = e.target.getAttribute('row-number');
    let id = patternList[rowNumber]._id;
    let rowInput = patternRowElements[rowNumber].querySelector("input.pattern-row-content").value;

    if (rowInput) {
        let requestUri = id ? `${patternUri}?id=${id}` : `${patternUri}`;
        fetch(requestUri, {
            method: 'POST',
            credentials: "include",
            headers: {
                // 'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'name':rowInput})
        })
            .then((response) => response.json())
            .then((data) => {
                //it will return the created pattern
                patternList[rowNumber] = data;
                const row = patternRowElements[rowNumber];
                let myNewRow = createPatternViewRow(rowNumber);
                row.replaceWith(myNewRow);
                patternRowElements[rowNumber] = myNewRow;
            })
    } else {
        //idk some error
    }
}

function cancelEdit(e) {
    let rowNumber = e.target.getAttribute('row-number');
    const row = patternRowElements[rowNumber];
    if (patternList[rowNumber]._id) {
        let myNewRow = createPatternViewRow(rowNumber);
        row.replaceWith(myNewRow);
        patternRowElements[rowNumber] = myNewRow;
    } else {
        row.remove();
        patternRowElements[rowNumber] = null;
    }
}

function toggleDeleteBtns(){
    showDeleteBtn = !showDeleteBtn;
    const delBtns = document.querySelectorAll('.delete-pattern-button');
    if (showDeleteBtn) {
        for (const p of delBtns) {
            p.classList.remove('hidden');
        }
    } else {
        for (const p of delBtns) {
            p.classList.add('hidden');
        }
    }
}

