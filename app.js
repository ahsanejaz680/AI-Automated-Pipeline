var storage = window.localStorage;
var notesContainer = document.getElementById('notes-container');
var noteForm = document.getElementById('note-form');
var titleInput = document.getElementById('title');
var bodyInput = document.getElementById('body');
var addNoteButton = document.getElementById('add-note');
var dateFilterInput = document.getElementById('date-filter');
var clearFilterButton = document.getElementById('clear-filter');
var noteCountSpan = document.getElementById('count');

var notes = JSON.parse(storage.getItem('notes')) || [];

function renderNotes() {
    notesContainer.innerHTML = '';
    var filteredNotes = notes;
    if (dateFilterInput.value !== 'none') {
        filteredNotes = notes.filter(note => note.date === dateFilterInput.value);
    }
    filteredNotes.forEach(note => {
        var noteDiv = document.createElement('div');
        noteDiv.className = 'note';
        noteDiv.innerHTML = `
            <h2 id="title-${note.id}">${note.title}</h2>
            <p id="body-${note.id}">${note.body}</p>
            <p id="date-${note.id}">${note.date}</p>
            <button id="edit-${note.id}">Edit</button>
            <button id="delete-${note.id}">Delete</button>
        `;
        notesContainer.appendChild(noteDiv);
        var editButton = document.getElementById(`edit-${note.id}`);
        var deleteButton = document.getElementById(`delete-${note.id}`);
        editButton.addEventListener('click', () => {
            var newTitle = prompt('Enter new title:', note.title);
            var newBody = prompt('Enter new body:', note.body);
            if (newTitle !== null && newBody !== null) {
                note.title = newTitle;
                note.body = newBody;
                renderNotes();
                storage.setItem('notes', JSON.stringify(notes));
            }
        });
        deleteButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this note?')) {
                notes = notes.filter(n => n.id !== note.id);
                renderNotes();
                storage.setItem('notes', JSON.stringify(notes));
            }
        });
    });
    noteCountSpan.textContent = filteredNotes.length;
}

addNoteButton.addEventListener('click', (e) => {
    e.preventDefault();
    var newNote = {
        id: Date.now(),
        title: titleInput.value,
        body: bodyInput.value,
        date: (new Date()).toISOString().split('T')[0]
    };
    notes.push(newNote);
    renderNotes();
    storage.setItem('notes', JSON.stringify(notes));
    titleInput.value = '';
    bodyInput.value = '';
});

clearFilterButton.addEventListener('click', () => {
    dateFilterInput.value = 'none';
    renderNotes();
});

dateFilterInput.addEventListener('input', renderNotes);

renderNotes();

module.exports = {
    notes,
    renderNotes,
    addNoteButton,
    titleInput,
    bodyInput,
    clearFilterButton,
    dateFilterInput
};
