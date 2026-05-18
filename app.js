const notes = JSON.parse(localStorage.getItem('notes')) || [];
const noteList = document.getElementById('note-list');
const addNoteForm = document.getElementById('add-note-form');
const addNoteBtn = document.getElementById('add-note-btn');
const dateFilterInput = document.getElementById('date-filter');
const clearFilterBtn = document.getElementById('clear-filter-btn');
const noteCountSpan = document.getElementById('note-count');

function createNoteElement(note) {
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    const noteTitleElement = document.createElement('h2');
    noteTitleElement.textContent = note.title;
    noteTitleElement.classList.add('note-title');
    const noteBodyElement = document.createElement('p');
    noteBodyElement.textContent = note.body;
    const noteDeleteBtn = document.createElement('button');
    noteDeleteBtn.textContent = 'Delete';
    noteDeleteBtn.addEventListener('click', () => deleteNote(note.id));

    const noteEditButton = document.createElement('button');
    noteEditButton.textContent = 'Edit';
    noteEditButton.addEventListener('click', () => editNote(note.id));

    const noteDateElement = document.createElement('p');
    noteDateElement.textContent = `Created: ${note.date}`;
    noteElement.appendChild(noteTitleElement);
    noteElement.appendChild(noteBodyElement);
    noteElement.appendChild(noteDateElement);
    noteElement.appendChild(noteDeleteBtn);
    noteElement.appendChild(noteEditButton);
    return noteElement;
}

function addNote() {
    const title = document.getElementById('note-title').value;
    const body = document.getElementById('note-body').value;
    const date = new Date().toISOString().split('T')[0];
    const note = { id: notes.length, title, body, date };
    notes.push(note);
    localStorage.setItem('notes', JSON.stringify(notes));
    const noteElement = createNoteElement(note);
    noteList.appendChild(noteElement);
    noteCountSpan.textContent = notes.length;
    document.getElementById('note-title').value = '';
    document.getElementById('note-body').value = '';
}

function editNote(id) {
    const note = notes.find(note => note.id === id);
    const titleInput = document.getElementById('note-title');
    const bodyInput = document.getElementById('note-body');
    titleInput.value = note.title;
    bodyInput.value = note.body;
    bodyInput.disabled = false;
    addNoteBtn.disabled = true;
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
        note.title = titleInput.value;
        note.body = bodyInput.value;
        localStorage.setItem('notes', JSON.stringify(notes));
        const noteElement = noteList.children[id];
        noteElement.querySelectorAll('h2, p')[0].textContent = note.title;
        noteElement.querySelectorAll('p')[1].textContent = note.body;
        addNoteBtn.disabled = false;
        saveBtn.remove();
        bodyInput.disabled = true;
    });
    bodyInput.parentNode.appendChild(saveBtn);
}

function deleteNote(id) {
    if (confirm('Are you sure?')) {
        notes.splice(id, 1);
        localStorage.setItem('notes', JSON.stringify(notes));
        const noteElement = noteList.children[id];
        noteElement.remove();
        noteCountSpan.textContent = notes.length;
    }
}

function filterNotes(date) {
    const filteredNotes = notes.filter(note => note.date === date);
    noteList.innerHTML = '';
    filteredNotes.forEach(note => {
        const noteElement = createNoteElement(note);
        noteList.appendChild(noteElement);
    });
    noteCountSpan.textContent = filteredNotes.length;
}

addNoteBtn.addEventListener('click', addNote);
addNoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addNote();
});
document.getElementById('add-note-form').getElementsByTagName('textarea')[0].disabled = true;

dateFilterInput.addEventListener('input', (e) => {
    const date = e.target.value;
    filterNotes(date);
});
clearFilterBtn.addEventListener('click', () => filterNotes(null));

function init() {
    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        noteList.appendChild(noteElement);
    });
    noteCountSpan.textContent = notes.length;
    addNoteBtn.disabled = false;
}
init();

module.exports = {
    addNote,
    editNote,
    deleteNote,
    filterNotes
};
