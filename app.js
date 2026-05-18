var notes = JSON.parse(localStorage.getItem('notes')) || [];
var currentFilterDate = null;
var noteListElement = document.getElementById('note-list');
var noteCountElement = document.getElementById('note-count');
var dateFilterElement = document.getElementById('date-filter');

module.exports = {
    init: initApp,
    addNote: addNote,
    editNote: editNote,
    deleteNote: deleteNote,
    filterNotes: filterNotes,
    clearFilter: clearFilter,
    updateNoteCount: updateNoteCount
};

function initApp() {
    renderNotes();
    document.getElementById('add-note-btn').addEventListener('click', addNote);
    dateFilterElement.addEventListener('change', filterNotes);
    document.getElementById('clear-filter-btn').addEventListener('click', clearFilter);
}

function addNote(event) {
    event.preventDefault();
    var title = document.getElementById('note-title').value;
    var body = document.getElementById('note-body').value;
    var note = {
        title: title,
        body: body,
        date: new Date().toISOString().slice(0, 10)
    };
    notes.push(note);
    saveNotes();
    renderNotes();
    document.getElementById('note-title').value = '';
    document.getElementById('note-body').value = '';
}

function editNote(index) {
    var note = notes[index];
    var titleInput = document.createElement('input');
    var bodyInput = document.createElement('textarea');
    titleInput.value = note.title;
    bodyInput.value = note.body;
    var saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', function() {
        note.title = titleInput.value;
        note.body = bodyInput.value;
        saveNotes();
        renderNotes();
    });
    var noteElement = document.createElement('div');
    noteElement.appendChild(titleInput);
    noteElement.appendChild(bodyInput);
    noteElement.appendChild(saveButton);
    noteListElement.replaceChild(noteElement, noteListElement.children[index]);
}

function deleteNote(index) {
    if (confirm('Are you sure you want to delete this note?')) {
        notes.splice(index, 1);
        saveNotes();
        renderNotes();
    }
}

function filterNotes() {
    currentFilterDate = dateFilterElement.value;
    renderNotes();
}

function clearFilter() {
    currentFilterDate = null;
    dateFilterElement.value = '';
    renderNotes();
}

function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function renderNotes() {
    noteListElement.innerHTML = '';
    var filteredNotes = currentFilterDate ? notes.filter(function(note) {
        return note.date === currentFilterDate;
    }) : notes;
    filteredNotes.forEach(function(note, index) {
        var noteElement = document.createElement('div');
        noteElement.innerHTML = `
            <h2>${note.title}</h2>
            <p>${note.body}</p>
            <p>Created on ${note.date}</p>
            <button onclick="module.exports.editNote(${index})">Edit</button>
            <button onclick="module.exports.deleteNote(${index})">Delete</button>
        `;
        noteListElement.appendChild(noteElement);
    });
    updateNoteCount();
}

function updateNoteCount() {
    var noteCount = currentFilterDate ? notes.filter(function(note) {
        return note.date === currentFilterDate;
    }).length : notes.length;
    noteCountElement.textContent = `Showing ${noteCount} notes`;
}

initApp();
