class Pattern {
    name;
    rows;
    currentRow;

    constructor(name,rows,currentRow = 1) {
        this.name = name;
        this.rows = rows;
        this.currentRow = currentRow;
    }

    addRow(rowNumber,row){
        this.rows.splice(rowNumber - 1, 0, row);
    }

    getRow(rowNumber) {
        return this.rows.length >= rowNumber ?this.rows[rowNumber - 1] :null;
    }
}

class Row {
    desc;
    stCount;

    constructor(desc,stCount=0){
        this.desc = desc;
        this.stCount = stCount;
    }
}

//get references to existing elements
const stopButton = document.querySelector('#stop-button');
const showStitchCountCheck = document.querySelector("#stitch-count-check");
const minusButton = document.querySelector('#minus-button');
const plusButton = document.querySelector('#plus-button');
const editButton = document.querySelector('#edit-button');
const saveButton = document.querySelector('#save-button');
const discardButton = document.querySelector('#discard-button');
const patternContainer = document.querySelector('.pattern-container');
const readUI = document.querySelector('#read-mode');
const editUI = document.querySelector('#edit-mode');
const addUI = document.querySelector('#add-mode');

//set up elements
stopButton.addEventListener('click', stopAddingRows);
showStitchCountCheck.addEventListener("change", toggleStitchCountView);
minusButton.addEventListener('click', ()=>{setRowCompleted(patternObject.currentRow - 1)});
plusButton.addEventListener('click', incrementRowCompleted);
editButton.addEventListener('click', editPattern);
saveButton.addEventListener('click', saveEditedPattern);
discardButton.addEventListener('click', revertPattern);

//set up variables
let patternRowsDisplay;
let patternNameElement;
//li
let patternRowElements = [];
let addPatternButtonRow;
let viewMode = 1;
let editMode = 2;
let addMode = 3;
let currentMode = viewMode;
let elementToScroll;
let previousAddedRow;

//set up variables for fetch
const urlParams = new URL(location.href).searchParams;
const patternId = urlParams.get('id');
const patternUri = "http://localhost:8089/pattern";
const savePatternUri = "http://localhost:8089/pattern-list";

let patternObject;

//dont scroll to previous position
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

fetch(`${patternUri}?id=${patternId}`, {
    method: 'GET',
    credentials: "include",
    headers: {
    }
})
    .then((response) => response.json())
    .then((data) => {
        convertServerDataToPatternObject(data);
        showPatternViewForm();
        if (urlParams.get('edit') == 'true') {
            changeMode(editMode);
        } else {
            changeMode(viewMode);
        }
        scrollTo();
    })


function convertServerDataToPatternObject(data) {
    patternObject = Object.assign(new Pattern(), data);
    for (i = 0; i < patternObject.rows.length; i++) {
        const row = patternObject.rows[i];
        patternObject.rows[i] = Object.assign(new Row(), row);
    }
}

//adding html elements
// function generatePatternDisplay() {
//     if (patternNameElement) {
//         patternNameElement.remove();
//     }
//     const myHead = document.createElement('h2');
//     myHead.setAttribute("class", "pattern-name");
//     myHead.textContent = patternObject.name;
//     patternContainer.appendChild(myHead);
//     patternNameElement = myHead;
//     generatePatternRows();
// }

function generatePatternRows() {
    if (patternRowsDisplay) {
        patternRowsDisplay.remove();
    }
    const myList = document.createElement('ol');
    myList.setAttribute("class", "pattern-rows-container");
    patternContainer.appendChild(myList);

    patternRowsDisplay = myList;
    patternRowElements = [];
    for (i=0;i<patternObject.rows.length;i++) {
        let rowElement = createPatternViewRow(i + 1);
        patternRowsDisplay.appendChild(rowElement);
        patternRowElements.push(rowElement);
        if (i + 1 === patternObject.currentRow) {
            elementToScroll = rowElement;
        }
    }

    const myPara = document.createElement('li');
    myList.appendChild(myPara);
    myPara.setAttribute("class", "pattern-row");
    myPara.setAttribute("id", "add-pattern-row");

    const myButton = document.createElement('button');
    myButton.setAttribute('type','button');
    myButton.setAttribute('class','row-button');
    myButton.textContent = `+ Add New Row`;
    myPara.appendChild(myButton);
    myButton.addEventListener('click',addNewRow);
    addPatternButtonRow = myPara;
}

function showPatternEditForm() {
    const myHead = document.createElement('input');
    myHead.type = "text";
    myHead.setAttribute("class", "pattern-name");
    myHead.value = patternObject.name;
    patternNameElement.replaceWith(myHead);
    patternNameElement = myHead;

    for(i=0;i<patternRowElements.length;i++) {
        const row = patternRowElements[i];
        let myNewRow = createPatternEditRow(row.getAttribute("row-number"));
        row.replaceWith(myNewRow);
        patternRowElements[i] = myNewRow;  
        myNewRow.addEventListener('keydown',(e) => {e.stopPropagation();if (e.key === 'Enter') {saveEditedPattern()}});
    }

    changeMode(editMode);
}

function showPatternViewForm() {
    if (patternNameElement) {
        patternNameElement.remove();
    }
    const myHead = document.createElement('h2');
    myHead.setAttribute("class", "pattern-name");
    myHead.textContent = patternObject.name;
    patternContainer.appendChild(myHead);
    patternNameElement = myHead;

    generatePatternRows();

    changeMode(viewMode);
}

function createPatternViewRow(rowNumber) {
    const row = patternObject.getRow(rowNumber);
    const value = row ?row.desc :'';
    const stCount = row ?row.stCount:0;
    const myPara = document.createElement('li');
    myPara.setAttribute("class", "pattern-row");
    myPara.setAttribute("row-number", rowNumber);
    
    if (rowNumber < patternObject.currentRow) {
        myPara.classList.add('faded');
    } 

    const myLabel = createPatternLabel(rowNumber);
    myLabel.addEventListener('click',(e)=>{setRowCompleted(e.currentTarget.getAttribute('row-number'))});
    myPara.appendChild(myLabel);
    
    const myItem = document.createElement('p');
    myItem.textContent = value;
    myPara.appendChild(myItem);
    myItem.setAttribute("class", "pattern-row-content");

    const myStCount = document.createElement('p');
    myStCount.textContent = stCount;
    myPara.appendChild(myStCount);
    myStCount.setAttribute("class", "pattern-row-stitch-count");

    return myPara;
}

function createPatternEditRow(rowNumber) {
    const row = patternObject.getRow(rowNumber);
    const value = row ?row.desc :'';
    const stCount = row ?row.stCount:0;
    const myPara = document.createElement('li');
    myPara.setAttribute("class", "pattern-row");
    myPara.setAttribute("row-number", rowNumber);

    const myLabel = createPatternLabel(rowNumber);
    myLabel.disabled = true;
    myPara.appendChild(myLabel);
    
    const myItem = document.createElement('input');
    myItem.type = "text";
    myItem.value = value;
    myPara.appendChild(myItem);
    myItem.setAttribute("class", "pattern-row-content");

    const myStCount = document.createElement('input');
    myStCount.type = 'text';
    myStCount.value = stCount;
    myPara.appendChild(myStCount);
    myStCount.setAttribute("class", "pattern-row-stitch-count");

    const myDeleteBtn = document.createElement('p');
    myDeleteBtn.textContent = 'T';
    myPara.appendChild(myDeleteBtn);
    myDeleteBtn.classList.add("symbol-button");
    myDeleteBtn.classList.add("delete-pattern-button");
    myDeleteBtn.setAttribute('row-number', rowNumber);
    myDeleteBtn.addEventListener('click', deleteRow);

    return myPara;
}

function createPatternLabel(rowNumber) {
    const myLabel = document.createElement('button');
    myLabel.setAttribute("row-number", rowNumber);
    myLabel.classList.add('rowLabel');
    myLabel.textContent = `Row ${rowNumber}`;
    return myLabel;
}

//button functions
function editPattern() {
    showPatternEditForm();
}

function deleteRow(e){
    let rowNumber = e.target.getAttribute('row-number');
    patternObject.rows.splice(rowNumber, 1)
    
    //TODO: regen pattern rows
    //but also then how do i go back ?

    // let requestUri = `${patternUri}?id=${id}`;
    // fetch(requestUri, {
    //     method: 'DELETE',
    //     credentials: "include",
    //     headers: {
    //         // 'Accept': 'application/json',
    //         'Content-Type': 'application/json'
    //     },
    // })
    //     .then((response) => response.json())
    //     .then((data) => {
    //         //it will return the success story
    //         if (data.success) {
    //             const row = patternRowElements[rowNumber];
    //             row.remove();
    //             patternRowElements[rowNumber] = null;
    //             patternList[rowNumber] = null;
    //         }
    //     })
}

function saveEditedPattern() {
    patternObject.name = patternNameElement.value;
    for (i=0;i<patternRowElements.length;i++) {
        let rowInput = patternRowElements[i].querySelector("input.pattern-row-content").value;
        patternObject.rows[i].desc = rowInput;
        let stInput = patternRowElements[i].querySelector("input.pattern-row-stitch-count").value;
        patternObject.rows[i].stCount = stInput;
    }
    savePatternToStorage();
}

//assumes patternObject contains the version i WANT to save
function savePatternToStorage() {
    let requestUri = `${savePatternUri}?id=${patternId}`;
    fetch(requestUri, {
        method: 'POST',
        credentials: "include",
        headers: {
            // 'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patternObject)
    })
        .then((response) => response.json())
        .then((data) => {
            //it will return the edited pattern
            convertServerDataToPatternObject(data);
            showPatternViewForm();
        })
}

function revertPattern() {
    showPatternViewForm();
}

function changeMode(newMode){
    currentMode = newMode;
    editUI.hidden = true;
    readUI.hidden = true;
    addUI.hidden = true;
    switch (currentMode) {
        case viewMode:
            readUI.hidden = false;
            break;
        case editMode:
            editUI.hidden = false;
            break;
        case addMode:
            addUI.hidden = false;
            break;
    }
}

function toggleEditMode(isEditMode) {
    editUI.hidden = !isEditMode;
    readUI.hidden = isEditMode;
}

function addNewRow() {
    if (previousAddedRow && currentMode===addMode) {
        saveNewRow(previousAddedRow);
    }
    if (currentMode===viewMode){
        changeMode(addMode);
    }
    
    let newRow = createPatternEditRow(patternObject.rows.length + 1);
    previousAddedRow = newRow;
    newRow.addEventListener('keydown',(e) => {e.stopPropagation();if (e.key === 'Enter') {addNewRow()}});
    patternRowsDisplay.insertBefore(newRow, addPatternButtonRow);
    window.scrollBy(0, newRow.offsetHeight);
    patternRowElements.push(newRow);
    newRow.querySelector("input.pattern-row-content").focus();
}

function saveNewRow(row) {
    let rowNo = row.getAttribute('row-number');
    let rowInput = row.querySelector('input.pattern-row-content').value;
    let stInput = row.querySelector("input.pattern-row-stitch-count").value;
    patternObject.addRow(rowNo, new Row(rowInput, stInput));
    savePatternToStorage();
}

function incrementRowCompleted() {
    setRowCompleted(patternObject.currentRow);
}

function setRowCompleted(rowNumber) {
    if (patternObject.currentRow > rowNumber) {
        rowNumber--;
    }
    patternObject.currentRow = Math.min(Math.max(parseInt(rowNumber) + 1, 1), patternObject.rows.length + 1);
    savePatternToStorage();
} 

function stopAddingRows() {
    let rowInp = previousAddedRow.querySelector('.pattern-row-content');
    if (rowInp.tagName === 'INPUT' && rowInp.value!='') {
        saveNewRow(previousAddedRow);
    } else {
        patternRowElements.pop();
        previousAddedRow.remove();
        changeMode(viewMode);
    }
    previousAddedRow = null;
}

function scrollTo() {
    if (elementToScroll != null) {
        elementToScroll.scrollIntoViewIfNeeded();
    }
}

function toggleStitchCountView() {
    const show = showStitchCountCheck.checked;
    const stCounts = document.querySelectorAll('.pattern-row-stitch-count');
    if (show) {
        for (const p of stCounts) {
            p.classList.remove('hidden');
        }
    } else {
        for (const p of stCounts) {
            p.classList.add('hidden');
        }
    }

}