const NOTES_KEY = 'notes';
const DATE_FILTER_KEY = 'dateFilter';

let currentNoteId = 0;
let noteList = document.getElementById('note-list');
let noteCountElement = document.getElementById('note-count');
let dateFilterInput = document.getElementById('date-filter');
let noteForm = document.getElementById('note-form');
let noteTitleInput = document.getElementById('note-title');
let noteBodyInput = document.getElementById('note-body');
let noteListElement = document.getElementById('note-list');

function loadNotes() {
    const storedNotes = localStorage.getItem(NOTES_KEY);
    if (storedNotes) {
        JSON.parse(storedNotes).forEach(note => {
            addNoteToList(note);
        });
    } else {
        const notes = [];
        const date = new Date();
        const now = date.toISOString().split('T')[0];
        notes.push({ id: 0, title: '', body: '', date: now, edited: false });
        addNoteToList(notes[0]);
        localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    }
}

function addNote() {
    noteForm.style.display = 'block';
}

function saveNote() {
    const title = noteTitleInput.value;
    const body = noteBodyInput.value;
    const date = new Date().toISOString().split('T')[0];
    const note = { id: currentNoteId, title, body, date, edited: false };
    addNoteToList(note);
    noteForm.style.display = 'none';
    currentNoteId++;
    localStorage.setItem(NOTES_KEY, JSON.stringify(noteList.children));
    noteCountElement.textContent = `Notes: ${noteList.children.length}`;
}

function addNoteToList(note) {
    const noteElement = document.createElement('div');
    noteElement.id = note.id;
    noteElement.innerHTML = `
        <div>${note.title}</div>
        <div>${note.body}</div>
        <div> Created: ${note.date}</div>
        <button class='edit-button' onclick="editNote(${note.id})">Edit</button>
        <button class='delete-button' onclick="deleteNote(${note.id})">Delete</button>
    `;
    noteListElement.appendChild(noteElement);
    noteCountElement.textContent = `Notes: ${noteListElement.children.length}`;
}

function editNote(noteId) {
    const note = getNoteById(noteId);
    noteTitleInput.value = note.title;
    noteBodyInput.value = note.body;
    noteForm.style.display = 'block';
    saveNoteButton.onclick = function () {
        const newTitle = noteTitleInput.value;
        const newBody = noteBodyInput.value;
        note.title = newTitle;
        note.body = newBody;
        note.edited = true;
        noteList.children[noteId].children[0].textContent = note.title;
        noteList.children[noteId].children[1].textContent = note.body;
        noteList.children[noteId].lastElementChild.textContent = 'Updated';
        localStorage.setItem(NOTES_KEY, JSON.stringify(noteList.children));
        noteCountElement.textContent = `Notes: ${noteList.children.length}`;
        noteForm.style.display = 'none';
    };
}

function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        noteList.children[noteId].remove();
        localStorage.setItem(NOTES_KEY, JSON.stringify(noteList.children));
        noteCountElement.textContent = `Notes: ${noteList.children.length}`;
    }
}

function filterNotes(date) {
    if (date === '') {
        noteList.style.display = 'block';
    } else {
        noteList.style.display = 'none';
        noteList.children.forEach(note => {
            const noteDate = note.children[2].textContent;
            if (noteDate === date) {
                note.style.display = 'block';
            } else {
                note.style.display = 'none';
            }
        });
    }
    localStorage.setItem(DATE_FILTER_KEY, date);
}

function clearFilter() {
    filterNotes('');
    noteList.style.display = 'block';
    localStorage.removeItem(DATE_FILTER_KEY);
}

loadNotes();
filterNotes(localStorage.getItem(DATE_FILTER_KEY));

module.exports = {
    saveNote: saveNote,
    addNoteToList: addNoteToList,
    editNote: editNote,
    deleteNote: deleteNote,
    filterNotes: filterNotes,
    clearFilter: clearFilter
};
