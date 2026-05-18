var noteId = 0;
var notes = JSON.parse(localStorage.getItem('notes')) || [];
var dateFilter = '';

module.exports = {
    init: function() {
        document.addEventListener('DOMContentLoaded', function() {
            renderNotes();
            document.getElementById('add-note-form').addEventListener('submit', addNote);
            document.getElementById('clear-filter').addEventListener('click', clearFilter);
            document.getElementById('date-filter').addEventListener('change', filterNotes);
        });
    },
    renderNotes: function() {
        var notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';
        var filteredNotes = getFilteredNotes();
        filteredNotes.forEach(function(note) {
            var noteHTML = `
                <div class="note" data-id="${note.id}">
                    <div class="note-title">${note.title}</div>
                    <div class="note-body">${note.body}</div>
                    <div class="note-date">${note.date}</div>
                    <button class="edit-button">Edit</button>
                    <button class="delete-button">Delete</button>
                    <div class="edit-form">
                        <input type="text" value="${note.title}" class="edit-title">
                        <textarea>${note.body}</textarea>
                        <button class="save-button">Save</button>
                    </div>
                </div>
            `;
            notesList.insertAdjacentHTML('beforeend', noteHTML);
            var editButton = notesList.querySelector('.note[data-id="' + note.id + '"] .edit-button');
            var deleteButton = notesList.querySelector('.note[data-id="' + note.id + '"] .delete-button');
            var saveButton = notesList.querySelector('.note[data-id="' + note.id + '"] .save-button');
            editButton.addEventListener('click', editNote);
            deleteButton.addEventListener('click', deleteNote);
            saveButton.addEventListener('click', saveNote);
        });
        updateNoteCount();
    },
    addNote: function(e) {
        e.preventDefault();
        var title = document.getElementById('title').value;
        var body = document.getElementById('body').value;
        var note = {
            id: noteId++,
            title: title,
            body: body,
            date: new Date().toISOString().split('T')[0]
        };
        notes.push(note);
        localStorage.setItem('notes', JSON.stringify(notes));
        document.getElementById('title').value = '';
        document.getElementById('body').value = '';
        renderNotes();
    },
    editNote: function(e) {
        var noteId = e.target.parentNode.parentNode.dataset.id;
        var note = notes.find(function(note) {
            return note.id == noteId;
        });
        e.target.parentNode.parentNode.classList.add('editing');
        e.target.style.display = 'none';
        var editForm = e.target.parentNode.parentNode.querySelector('.edit-form');
        editForm.classList.add('show');
    },
    saveNote: function(e) {
        var noteId = e.target.parentNode.parentNode.dataset.id;
        var note = notes.find(function(note) {
            return note.id == noteId;
        });
        note.title = e.target.parentNode.parentNode.querySelector('.edit-title').value;
        note.body = e.target.parentNode.parentNode.querySelector('textarea').value;
        localStorage.setItem('notes', JSON.stringify(notes));
        e.target.parentNode.parentNode.classList.remove('editing');
        e.target.parentNode.parentNode.querySelector('.edit-form').classList.remove('show');
        e.target.parentNode.parentNode.querySelector('.edit-button').style.display = 'block';
        renderNotes();
    },
    deleteNote: function(e) {
        var noteId = e.target.parentNode.parentNode.dataset.id;
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(function(note) {
                return note.id != noteId;
            });
            localStorage.setItem('notes', JSON.stringify(notes));
            renderNotes();
        }
    },
    filterNotes: function(e) {
        dateFilter = e.target.value;
        renderNotes();
    },
    clearFilter: function(e) {
        dateFilter = '';
        document.getElementById('date-filter').value = '';
        renderNotes();
    },
    getFilteredNotes: function() {
        if (dateFilter) {
            return notes.filter(function(note) {
                return note.date == dateFilter;
            });
        } else {
            return notes;
        }
    },
    updateNoteCount: function() {
        var noteCount = document.getElementById('note-count');
        noteCount.innerHTML = 'Note count: ' + getFilteredNotes().length;
    }
};

module.exports.init();
