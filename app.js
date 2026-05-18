var notes = JSON.parse(localStorage.getItem('notes')) || [];
var notesElement = document.getElementById('notes');
var noteCountElement = document.getElementById('note-count');
var dateFilterElement = document.getElementById('date-filter');
var clearDateFilterButton = document.getElementById('clear-date-filter');

module.exports = {
    init: function() {
        renderNotes();
        document.getElementById('add-note').addEventListener('click', addNote);
        clearDateFilterButton.addEventListener('click', clearDateFilter);
        dateFilterElement.addEventListener('change', filterNotesByDate);
    }
};

function addNote(event) {
    event.preventDefault();
    var title = document.getElementById('title').value;
    var body = document.getElementById('body').value;
    var note = {
        title: title,
        body: body,
        date: new Date().toISOString().split('T')[0]
    };
    notes.push(note);
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
    document.getElementById('title').value = '';
    document.getElementById('body').value = '';
}

function renderNotes() {
    notesElement.innerHTML = '';
    var filteredNotes = filterNotesByCurrentFilter();
    filteredNotes.forEach(function(note, index) {
        var noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.innerHTML = `
            <h2>${note.title}</h2>
            <p>${note.body}</p>
            <p>Created on: ${note.date}</p>
            <button class="edit-note">Edit</button>
            <button class="delete-note">Delete</button>
        `;
        noteElement.querySelector('.edit-note').addEventListener('click', function() {
            editNote(index, noteElement);
        });
        noteElement.querySelector('.delete-note').addEventListener('click', function() {
            deleteNote(index);
        });
        notesElement.appendChild(noteElement);
    });
    noteCountElement.textContent = `${filteredNotes.length} notes`;
}

function editNote(index, noteElement) {
    var titleInput = document.createElement('input');
    titleInput.value = notes[index].title;
    var bodyTextarea = document.createElement('textarea');
    bodyTextarea.value = notes[index].body;
    noteElement.innerHTML = `
        <h2>${titleInput.outerHTML}</h2>
        <p>${bodyTextarea.outerHTML}</p>
        <button class="save-note">Save</button>
    `;
    noteElement.querySelector('.save-note').addEventListener('click', function() {
        notes[index].title = titleInput.value;
        notes[index].body = bodyTextarea.value;
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
    });
}

function deleteNote(index) {
    if (confirm('Are you sure you want to delete this note?')) {
        notes.splice(index, 1);
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
    }
}

function clearDateFilter() {
    dateFilterElement.value = '';
    renderNotes();
}

function filterNotesByDate() {
    renderNotes();
}

function filterNotesByCurrentFilter() {
    var filteredNotes = notes.slice();
    if (dateFilterElement.value !== '') {
        filteredNotes = filteredNotes.filter(function(note) {
            return note.date === dateFilterElement.value;
        });
    }
    return filteredNotes;
}

module.exports.init();
