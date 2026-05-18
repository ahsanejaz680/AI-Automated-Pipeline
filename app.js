var notes = [];
var noteList = document.getElementById('notes-list');
var noteCountElement = document.getElementById('note-count');
var dateFilterElement = document.getElementById('date-filter');
var clearFilterElement = document.getElementById('clear-filter');
var noteForm = document.getElementById('add-note-form');
var addNoteButton = document.getElementById('add-note');
var titleInput = document.getElementById('title');
var bodyInput = document.getElementById('body');
var noteManagerSection = document.getElementById('note-manager');
var noteFormSection = document.getElementById('note-form');

function Note(title, body, date) {
    this.title = title;
    this.body = body;
    this.date = date;
    this.editing = false;
}

function renderNote(note, index) {
    var liElement = document.createElement('LI');
    liElement.id = 'note-' + index;
    liElement.innerHTML = `
        <h3>${note.title}</h3>
        <p>${note.body}</p>
        <span class="date">${note.date}</span>
        <button class="edit" data-index="${index}">Edit</button>
        <button class="delete">Delete</button>
    `;
    liElement.querySelector('.edit').addEventListener('click', function() {
        editNote(note, index);
    });
    liElement.querySelector('.delete').addEventListener('click', function() {
        deleteNote(index);
    });
    return liElement;
}

function addNote(title, body) {
    var note = new Note(title, body, new Date().toLocaleDateString());
    notes.push(note);
    renderNote(note, notes.length - 1);
    updateCount();
    saveNotes();
}

function editNote(note, index) {
    if (note.editing) {
        noteFormSection.style.display = 'none';
        note.ManagerSection.style.display = 'block';
    } else {
        note.editing = true;
        var liElement = document.getElementById('note-' + index);
        var inputs = liElement.querySelectorAll('input, textarea');
        inputs.forEach(function(element) {
            element.value = note.title;
        });
        inputs[1].value = note.body;
        noteFormSection.style.display = 'block';
        noteManagerSection.style.display = 'none';
    }
}

function saveNote(note, index) {
    note.title = document.getElementById('title').value;
    note.body = document.getElementById('body').value;
    note.editing = false;
    document.getElementById('note-' + index).querySelector('h3').textContent = note.title;
    document.getElementById('note-' + index).querySelector('p').textContent = note.body;
    updateCount();
    saveNotes();
}

function deleteNote(index) {
    if (confirm('Are you sure you want to delete this note?')) {
        notes.splice(index, 1);
        document.getElementById('note-' + index).remove();
        updateCount();
        saveNotes();
    }
}

function updateCount() {
    noteCountElement.textContent = notes.length + ' notes';
}

function filterNotes(date) {
    document.querySelectorAll('.note').forEach(function(element) {
        var dateElement = element.querySelector('.date');
        var noteDate = dateElement.textContent;
        if (noteDate === date) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

function saveNotes() {
    var notesString = JSON.stringify(notes);
    localStorage.setItem('notes', notesString);
}

function loadNotes() {
    var notesString = localStorage.getItem('notes');
    if (notesString) {
        notes = JSON.parse(notesString);
        notes.forEach(function(note, index) {
            renderNote(note, index);
        });
    } else {
        notes = [];
    }
}

addNoteButton.addEventListener('click', function() {
    addNote(titleInput.value, bodyInput.value);
    titleInput.value = '';
    bodyInput.value = '';
});

document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
});

clearFilterElement.addEventListener('click', function() {
    filterNotes('');
    noteManagerSection.style.display = 'block';
    noteFormSection.style.display = 'none';
});

dateFilterElement.addEventListener('change', function() {
    var dateString = dateFilterElement.value;
    if (dateString) {
        filterNotes(dateString);
        noteManagerSection.style.display = 'block';
        noteFormSection.style.display = 'none';
    } else {
        filterNotes('');
        noteManagerSection.style.display = 'block';
        noteFormSection.style.display = 'none';
    }
});

module.exports = {
    notes: notes,
    addNote: addNote,
    editNote: editNote,
    saveNote: saveNote,
    deleteNote: deleteNote,
    updateCount: updateCount,
    filterNotes: filterNotes,
    saveNotes: saveNotes,
    loadNotes: loadNotes
};

