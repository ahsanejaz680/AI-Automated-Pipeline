var notes = getNotesFromStorage();
var dateFilter = '';

module.exports = {
    init: function() {
        renderNotes();
        bindEvents();
    }
};

function getNotesFromStorage() {
    return JSON.parse(localStorage.getItem('notes')) || [];
}

function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function renderNotes() {
    var notesHtml = '';
    var filteredNotes = filterNotesByDate(dateFilter);
    var noteCount = filteredNotes.length;

    filteredNotes.forEach(function(note, index) {
        notesHtml += `
            <div class="note">
                <h2>${note.title}</h2>
                <p>${note.body}</p>
                <p>Created on: ${note.date}</p>
                <button class="edit-note" data-index="${index}">Edit</button>
                <button class="delete-note" data-index="${index}">Delete</button>
            </div>
        `;
    });

    document.getElementById('notes-container').innerHTML = notesHtml;
    document.getElementById('note-count').textContent = `Showing ${noteCount} notes`;
}

function filterNotesByDate(date) {
    if (date === '') {
        return notes;
    } else {
        return notes.filter(function(note) {
            return note.date === date;
        });
    }
}

function bindEvents() {
    document.getElementById('add-note').addEventListener('click', function(event) {
        event.preventDefault();
        var title = document.getElementById('title').value;
        var body = document.getElementById('body').value;
        var currentDate = new Date().toISOString().slice(0, 10);
        notes.push({ title: title, body: body, date: currentDate });
        saveNotesToStorage();
        renderNotes();
        document.getElementById('title').value = '';
        document.getElementById('body').value = '';
    });

    document.getElementById('notes-container').addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-note')) {
            var index = event.target.dataset.index;
            var note = notes[index];
            var titleInput = document.createElement('input');
            var bodyInput = document.createElement('textarea');
            titleInput.value = note.title;
            bodyInput.value = note.body;
            titleInput.classList.add('edit-input');
            bodyInput.classList.add('edit-input');
            var editContainer = event.target.parentNode;
            editContainer.innerHTML = '';
            editContainer.appendChild(titleInput);
            editContainer.appendChild(bodyInput);
            var saveButton = document.createElement('button');
            saveButton.textContent = 'Save';
            saveButton.classList.add('save-note');
            saveButton.dataset.index = index;
            editContainer.appendChild(saveButton);
        }

        if (event.target.classList.contains('delete-note')) {
            var index = event.target.dataset.index;
            if (confirm('Are you sure you want to delete this note?')) {
                notes.splice(index, 1);
                saveNotesToStorage();
                renderNotes();
            }
        }

        if (event.target.classList.contains('save-note')) {
            var index = event.target.dataset.index;
            var titleInput = event.target.parentNode.querySelector('.edit-input:first-child');
            var bodyInput = event.target.parentNode.querySelector('.edit-input:last-child');
            notes[index].title = titleInput.value;
            notes[index].body = bodyInput.value;
            saveNotesToStorage();
            renderNotes();
        }
    });

    document.getElementById('date-filter').addEventListener('change', function() {
        dateFilter = this.value;
        renderNotes();
    });

    document.getElementById('clear-filter').addEventListener('click', function() {
        dateFilter = '';
        renderNotes();
    });
}

module.exports.init();
