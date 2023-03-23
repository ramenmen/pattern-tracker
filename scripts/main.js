class Pattern {
    name;
    rows;
    currentRow;

    constructor(name, rows, currentRow = 1) {
        this.name = name;
        this.rows = rows;
        this.currentRow = currentRow;
    }

    addRow(rowNumber, row) {
        this.rows.splice(rowNumber - 1, 0, row);
    }

    deleteRow(rowNumber) {
        this.rows.splice(rowNumber - 1, 1);
    }

    getRow(rowNumber) {
        return this.rows.length >= rowNumber ? this.rows[rowNumber - 1] : null;
    }
}

class Row {
    desc;
    stCount;

    constructor(desc, stCount = 0) {
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
minusButton.addEventListener('click', decrementRowCompleted);
plusButton.addEventListener('click', incrementRowCompleted);
editButton.addEventListener('click', editPattern);
saveButton.addEventListener('click', saveEditedPattern);
discardButton.addEventListener('click', revertPattern);

//set up variables
let patternRowsDisplay;
let patternNameElement;
//li
let addPatternButtonRow;
let viewMode = 1;
let editMode = 2;
let addMode = 3;
let currentMode = viewMode;
let elementToScroll;
let previousAddedRow;
let numberOfRows = 0;

//set up variables for fetch
const urlParams = new URL(location.href).searchParams;
const patternId = urlParams.get('id');
const serverUrl = 'http://localhost:8080';
//const serverUrl = 'https://server-5acaqpvhyq-as.a.run.app';
const patternUri = `${serverUrl}/pattern`;
const savePatternUri = `${serverUrl}/pattern-list`;

let patternObject;
let updatedPatternObject;

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
    updatedPatternObject = patternObject;
}

function scrollTo() {
    if (elementToScroll != null) {
        elementToScroll.scrollIntoViewIfNeeded();
    }
}

//adding html elements
function showPatternViewForm() {
    if (patternNameElement) {
        patternNameElement.remove();
    }
    const myHead = document.createElement('h2');
    myHead.setAttribute("class", "pattern-name");
    myHead.textContent = patternObject.name;
    patternContainer.appendChild(myHead);
    patternNameElement = myHead;

    generatePatternViewRows();

    changeMode(viewMode);
}

function generatePatternViewRows() {
    if (patternRowsDisplay) {
        patternRowsDisplay.remove();
    }
    const myList = document.createElement('ol');
    myList.setAttribute("class", "pattern-rows-container");
    patternContainer.appendChild(myList);

    patternRowsDisplay = myList;
    for (i = 0; i < patternObject.rows.length; i++) {
        let rowElement = createPatternViewRow(i + 1);
        patternRowsDisplay.appendChild(rowElement);
        if (i + 1 === patternObject.currentRow) {
            elementToScroll = rowElement;
        }
    }

    numberOfRows = patternObject.rows.length;

    const myPara = document.createElement('li');
    myList.appendChild(myPara);
    myPara.classList.add("pattern-row");
    myPara.setAttribute("id", "add-pattern-row");

    const myButton = document.createElement('button');
    myButton.setAttribute('type', 'button');
    myButton.setAttribute('class', 'row-button');
    myButton.textContent = `+ Add New Row`;
    myPara.appendChild(myButton);
    myButton.addEventListener('click', addNewRow);
    addPatternButtonRow = myPara;
}

function showPatternEditForm() {
    if (patternNameElement) {
        patternNameElement.remove();
    }

    const myHead = document.createElement('input');
    myHead.type = "text";
    myHead.setAttribute("class", "pattern-name");
    myHead.value = patternObject.name;
    patternContainer.appendChild(myHead);
    patternNameElement = myHead;

    generatePatternEditRows();

    changeMode(editMode);
}

function generatePatternEditRows() {
    if (patternRowsDisplay) {
        patternRowsDisplay.remove();
    }
    const myList = document.createElement('ol');
    myList.setAttribute("class", "pattern-rows-container");
    patternContainer.appendChild(myList);

    patternRowsDisplay = myList;
    for (i = 0; i < patternObject.rows.length; i++) {
        let rowElement = createPatternEditRow(i + 1);
        patternRowsDisplay.appendChild(rowElement);
        rowElement.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { saveEditedPattern() } });
    }

    numberOfRows = patternObject.rows.length;

    const myPara = document.createElement('li');
    myList.appendChild(myPara);
    myPara.setAttribute("class", "pattern-row");
    myPara.setAttribute("id", "add-pattern-row");

    const myButton = document.createElement('button');
    myButton.setAttribute('type', 'button');
    myButton.setAttribute('class', 'row-button');
    myButton.textContent = `+ Add New Row`;
    myPara.appendChild(myButton);
    myButton.addEventListener('click', addNewRowInEditMode);
    addPatternButtonRow = myPara;
}

function createPatternViewRow(rowNumber) {
    const row = patternObject.getRow(rowNumber);
    const value = row ? row.desc : '';
    const stCount = row ? row.stCount : 0;
    const myPara = document.createElement('li');
    myPara.classList.add("pattern-row");
    myPara.classList.add("pattern-view-row");
    myPara.setAttribute("row-number", rowNumber);

    if (rowNumber < patternObject.currentRow) {
        myPara.classList.add('faded');
    }

    const myLabel = createPatternLabel(rowNumber);
    myLabel.addEventListener('click', (e) => { setRowCompleted(e.currentTarget.getAttribute('row-number')) });
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
    const value = row ? row.desc : '';
    const stCount = row ? row.stCount : 0;
    const myPara = document.createElement('li');
    myPara.classList.add("pattern-row");
    myPara.classList.add("pattern-input-row");

    const myMoveUpBtn = document.createElement('p');
    myMoveUpBtn.textContent = 'K';
    myPara.appendChild(myMoveUpBtn);
    myMoveUpBtn.classList.add("pointer-button");
    myMoveUpBtn.addEventListener('click', moveRowUp);

    const myMoveDownBtn = document.createElement('p');
    myMoveDownBtn.textContent = 'O';
    myPara.appendChild(myMoveDownBtn);
    myMoveDownBtn.classList.add("pointer-button");
    myMoveDownBtn.addEventListener('click', moveRowDown);

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
    myDeleteBtn.addEventListener('click', deleteRow);

    return myPara;
}

function createPatternAddRow(rowNumber) {
    const row = patternObject.getRow(rowNumber);
    const value = row ? row.desc : '';
    const stCount = row ? row.stCount : 0;
    const myPara = document.createElement('li');
    myPara.classList.add("pattern-row");
    myPara.classList.add("pattern-input-row");
    //this is ONLY used for add row and not used during edit mode.
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

    return myPara;
}

function createPatternLabel(rowNumber) {
    const myLabel = document.createElement('button');
    myLabel.classList.add('rowLabel');
    myLabel.setAttribute("row-number", rowNumber);
    myLabel.textContent = `Row ${rowNumber}`;
    return myLabel;
}

//called in all modes
function savePatternToStorage(refreshView = true) {
    let requestUri = `${savePatternUri}?id=${patternId}`;
    fetch(requestUri, {
        method: 'POST',
        credentials: "include",
        headers: {
            // 'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPatternObject)
    })
        .then((response) => response.json())
        .then((data) => {
            //it will return the edited pattern
            convertServerDataToPatternObject(data);
            if (refreshView) {
                showPatternViewForm();
            }
        })
}

function changeMode(newMode) {
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

//called in view mode
function editPattern() {
    showPatternEditForm();
}

function incrementRowCompleted() {
    setRowCompleted(patternObject.currentRow);
}

function decrementRowCompleted() {
    setRowCompleted(patternObject.currentRow - 1);
}

function setRowCompleted(rowNumber) {
    if (patternObject.currentRow > rowNumber) {
        rowNumber--;
    }
    patternObject.currentRow = Math.min(Math.max(parseInt(rowNumber) + 1, 1), patternObject.rows.length + 1);
    savePatternToStorage();
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

//called in edit mode
function deleteRow(e) {
    e.target.parentElement.remove();
    rewriteRowLabels();
}

function moveRowUp(e) {
    const rows = patternContainer.querySelectorAll('.pattern-input-row');
    const myRow = e.target.parentElement;
    for (i = 0; i < rows.length; i++) {
        if (rows[i] == myRow && i > 0) {
            patternRowsDisplay.insertBefore(myRow, rows[i-1]);
            break;
        }
    }
    rewriteRowLabels();
}

function moveRowDown(e) {
    const rows = patternContainer.querySelectorAll('.pattern-input-row');
    const myRow = e.target.parentElement;
    for (i = 0; i < rows.length; i++) {
        if (rows[i] == myRow && i < rows.length - 1) {
            patternRowsDisplay.insertBefore(rows[i + 1], myRow);
            break;
        }
    }
    rewriteRowLabels();
}

function rewriteRowLabels() {
    const labels = patternContainer.querySelectorAll('.rowLabel');
    for (i = 0; i < labels.length; i++) {
        let myLabel = labels[i];
        myLabel.setAttribute("row-number", i + 1);
        myLabel.textContent = `Row ${i + 1}`;
    }
}

function revertPattern() {
    showPatternViewForm();
}

function saveEditedPattern() {
    updatedPatternObject.name = patternContainer.querySelector('.pattern-name').value;

    let newRows = [];
    let rowElements = patternContainer.querySelectorAll('.pattern-input-row');
    for (i = 0; i < rowElements.length; i++) {
        let rowInput = rowElements[i].querySelector("input.pattern-row-content").value;
        let stInput = rowElements[i].querySelector("input.pattern-row-stitch-count").value;
        newRows[i] = new Row(rowInput, stInput);
    }

    updatedPatternObject.rows = newRows;
    savePatternToStorage();
}

function addNewRow() {
    if (previousAddedRow && currentMode === addMode) {
        savePreviousAddedRow(previousAddedRow);
    }
    if (currentMode === viewMode) {
        changeMode(addMode);
    }

    numberOfRows++;
    let newRow = createPatternAddRow(numberOfRows);
    previousAddedRow = newRow;
    newRow.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { addNewRow() } });
    patternRowsDisplay.insertBefore(newRow, addPatternButtonRow);
    window.scrollBy(0, newRow.offsetHeight);
    newRow.querySelector("input.pattern-row-content").focus();
}

function addNewRowInEditMode() {
    numberOfRows++;
    let newRow = createPatternEditRow(numberOfRows);
    previousAddedRow = newRow;
    newRow.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { saveEditedPattern() } });
    patternRowsDisplay.insertBefore(newRow, addPatternButtonRow);
    window.scrollBy(0, newRow.offsetHeight);
    newRow.querySelector("input.pattern-row-content").focus();
}

//only called in add mode
function savePreviousAddedRow(row) {
    let rowNo = row.getAttribute('row-number');
    let rowInput = row.querySelector('input.pattern-row-content').value;
    let stInput = row.querySelector("input.pattern-row-stitch-count").value;
    updatedPatternObject.addRow(rowNo, new Row(rowInput, stInput));
    savePatternToStorage(false);

    //replace input with view
    let myNewRow = createPatternViewRow(rowNo);
    row.replaceWith(myNewRow);

    previousAddedRow = null;
}

function stopAddingRows() {
    let rowInput = previousAddedRow.querySelector('input.pattern-row-content').value;
    if (rowInput.trim() != '') {
        savePreviousAddedRow(previousAddedRow);
    } else {
        numberOfRows--;
        previousAddedRow.remove();
    }
    changeMode(viewMode);
    previousAddedRow = null;
}

