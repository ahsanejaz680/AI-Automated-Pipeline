const { JSDOM } = require('jsdom');
const { expect } = require('chai');
const app = require('./app');

jest.useFakeTimers();

describe('Notes App', function() {
    beforeEach(function() {
        // Create a mock DOM
        const dom = new JSDOM(`<!DOCTYPE html><html><body>
            <ul id="notes-list"></ul>
            <span id="note-count"></span>
            <input id="date-filter" type="date">
            <button id="clear-filter">Clear Filter</button>
            <form id="add-note-form">
                <input id="title" type="text">
                <textarea id="body"></textarea>
                <button id="add-note">Add Note</button>
            </form>
            <div id="note-manager"></div>
            <div id="note-form"></div>
        </body></html>`);
        global.document = dom.window.document;
        global.localStorage = {
            getItem: () => null,
            setItem: (key, value) => localStorage[key] = value,
            clear: () => localStorage = {},
        };
        global.console = { log: () => {} };
        global.window = dom.window;

        // Get DOM references
        global.noteList = document.getElementById('notes-list');
        global.noteCountElement = document.getElementById('note-count');
        global.dateFilterElement = document.getElementById('date-filter');
        global.clearFilterElement = document.getElementById('clear-filter');
        global.noteForm = document.getElementById('add-note-form');
        global.addNoteButton = document.getElementById('add-note');
        global.titleInput = document.getElementById('title');
        global.bodyInput = document.getElementById('body');
        global.noteManagerSection = document.getElementById('note-manager');
        global.noteFormSection = document.getElementById('note-form');
    });

    afterEach(function() {
        // Remove all notes from the list
        while (noteList.firstChild) {
            noteList.removeChild(noteList.firstChild);
        }
        // Clear the localStorage
        localStorage.clear();
    });

    describe('Adding notes', function() {
        it('adds a new note to the list', async function() {
            // Mock the addNote function to add a note
            const addNoteSpy = jest.spyOn(app, 'addNote').mockImplementation(() => {
                // Create a new note
                const note = { title: 'Test Note', body: 'Test Body', date: new Date().toLocaleDateString() };
                // Add the note to the list
                const li = document.createElement('LI');
                li.id = 'note-' + notes.length;
                li.innerHTML = `
                    <h3>${note.title}</h3>
                    <p>${note.body}</p>
                    <span class="date">${note.date}</span>
                `;
                noteList.appendChild(li);
                // Update the count
                noteCountElement.textContent = notes.length;
                // Save the notes
                localStorage.setItem('notes', JSON.stringify(notes));
            });

            // Simulate a click on the add note button
            addNoteButton.click();
            await jest.runTimersToTime(200);

            // Expect one note in the list
            expect(noteList.children.length).toBe(1);
        });

        it('adds a note to the list when submitting the form', async function() {
            // Fill in the form fields
            titleInput.value = 'Test Note';
            bodyInput.value = 'Test Body';

            // Simulate a submit on the form
            noteForm.dispatchEvent(new Event('submit'));

            await jest.runTimersToTime(200);

            // Expect one note in the list
            expect(noteList.children.length).toBe(1);
        });
    });

    describe('Editing notes', function() {
        it('sets the note to editing mode', async function() {
            // Add a note to the list
            const li = document.createElement('LI');
            li.id = 'note-0';
            li.innerHTML = `
                <h3>Test Note</h3>
                <p>Test Body</p>
                <span class="date">2024-02-28</span>
                <button class="edit" data-index="0">Edit</button>
                <button class="delete">Delete</button>
            `;
            noteList.appendChild(li);

            // Simulate a click on the edit button
            const editButton = li.querySelector('.edit');
            editButton.click();

            // Expect the form to be visible
            expect(noteFormSection.style.display).toBe('');

            // Simulate a keydown event on the title input
            const titleInput = document.getElementById('title');
            titleInput.value = 'Updated Note';
            titleInput.dispatchEvent(new Event('keydown'));

            // Expect the note title to be updated
            expect(li.querySelector('h3').textContent).toBe('Updated Note');
        });
    });

    describe('Deleting notes', function() {
        it('removes a note from the list', async function() {
            // Add a note to the list
            const li = document.createElement('LI');
            li.id = 'note-0';
            li.innerHTML = `
                <h3>Test Note</h3>
                <p>Test Body</p>
                <span class="date">2024-02-28</span>
                <button class="edit" data-index="0">Edit</button>
                <button class="delete" data-index="0">Delete</button>
            `;
            noteList.appendChild(li);

            // Simulate a click on the delete button
            const deleteButton = li.querySelector('.delete');
            deleteButton.click();

            // Expect the note to be removed from the list
            expect(noteList.children.length).toBe(0);
        });
    });

    describe('Date filter', function() {
        it('filters notes by date', async function() {
            // Add multiple notes to the list
            for (let i = 0; i < 3; i++) {
                const li = document.createElement('LI');
                li.id = 'note-' + i;
                li.innerHTML = `
                    <h3>Note ${i}</h3>
                    <p>Test Body</p>
                    <span class="date">${i === 0 ? '2024-02-27' : i === 1 ? '2024-02-28' : '2024-02-29'}</span>
                    <button class="edit" data-index="${i}">Edit</button>
                    <button class="delete" data-index="${i}">Delete</button>
                `;
                noteList.appendChild(li);
            }

            // Set the date filter
            dateFilterElement.value = '2024-02-28';
            dateFilterElement.dispatchEvent(new Event('input'));

            // Expect only the notes after the date to be visible
            expect(noteList.children.length).toBe(1);
        });
    });
});
