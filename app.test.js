const jest = require('jest');
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><button id="add-note-btn"></button><form id="add-note-form"><input id="note-title" type="text"/><input id="note-body" type="text"/><button form="add-note-form" id="add-note-form-btn"></button></form><button id="clear-filter-btn"></button><button id="date-filter"></button><div id="note-list"></div><span id="note-count">0 notes</span></body></html>');
global.document = dom.window.document;
global.window = dom.window;

const app = require('./app.js');

describe('notes functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render notes', async () => {
    const notes = [
      { id: 0, title: 'Note 1', body: 'Body 1', date: new Date().toISOString().split('T')[0] },
      { id: 1, title: 'Note 2', body: 'Body 2', date: new Date().toISOString().split('T')[0] },
    ];

    localStorage.setItem('notes', JSON.stringify(notes));

    const noteList = dom.window.document.getElementById('note-list');
    const noteCountSpan = dom.window.document.getElementById('note-count');
    noteCountSpan.textContent = '2 notes';

    const noteElements = document.querySelectorAll('.note');
    expect(noteElements.length).toBe(2);

    noteElements.forEach((note, index) => {
      expect(note.querySelector('h2').textContent).toBe(`Note ${index}`);
      expect(note.querySelector('p')).toHaveTextContent(notes[index].body);
      expect(note.querySelector('p:last-child')).toHaveTextContent(`Created: ${notes[index].date}`);
    });
  });

  it('should add note on form submission', async () => {
    const notes = [
      { id: 0, title: 'Note 1', body: 'Body 1', date: new Date().toISOString().split('T')[0] },
    ];

    localStorage.setItem('notes', JSON.stringify(notes));

    const addNoteBtn = dom.window.document.getElementById('add-note-btn');
    const noteTitleInput = dom.window.document.getElementById('note-title');
    const noteBodyInput = dom.window.document.getElementById('note-body');
    noteTitleInput.value = 'Note 2';
    noteBodyInput.value = 'Body 2';
    const form = dom.window.document.getElementById('add-note-form');

    await addEventListenersToForm(form);
    addNoteBtn.click();
    await waitForDomUpdates();

    const noteList = dom.window.document.getElementById('note-list');
    const noteCountSpan = dom.window.document.getElementById('note-count');
    expect(noteList.children.length).toBe(2);
    expect(noteCountSpan.textContent).toBe('3 notes');

    expect(noteList.children[1]).toMatchSnapshot();
  });

  it('should delete note after deleting button click', async () => {
    const notes = [
      { id: 0, title: 'Note 1', body: 'Body 1', date: new Date().toISOString().split('T')[0] },
    ];

    localStorage.setItem('notes', JSON.stringify(notes));

    const addNoteBtn = dom.window.document.getElementById('add-note-btn');
    const noteTitleInput = dom.window.document.getElementById('note-title');
    const noteBodyInput = dom.window.document.getElementById('note-body');
    noteTitleInput.value = 'Note 2';
    noteBodyInput.value = 'Body 2';
    const form = dom.window.document.getElementById('add-note-form');

    await addEventListenersToForm(form);
    addNoteBtn.click();
    await waitForDomUpdates();

    const secondNote = dom.window.document.querySelector('.note:nth-child(2)');
    const deleteBtn = secondNote.querySelector('button:last-child');
    deleteBtn.click();
    await waitForDomUpdates();

    expect(noteList.children.length).toBe(1);
  });

  it('should filter notes by date', async () => {
    const notes = [
      { id: 0, title: 'Note 1', body: 'Body 1', date: new Date('2024-01-01').toISOString().split('T')[0] },
      { id: 1, title: 'Note 2', body: 'Body 2', date: new Date('2024-01-02').toISOString().split('T')[0] },
      { id: 2, title: 'Note 3', body: 'Body 3', date: new Date('2024-01-03').toISOString().split('T')[0] },
    ];

    localStorage.setItem('notes', JSON.stringify(notes));

    const clearFilterBtn = dom.window.document.getElementById('clear-filter-btn');
    const dateFilterInput = dom.window.document.getElementById('date-filter');
    const filterDate = '2024-01-02';

    clearFilterBtn.click();
    await waitForDomUpdates();
    dateFilterInput.value = filterDate;

    await addEventListenersToForm(dom.window.document.querySelector('#filter-note-form'));
    dateFilterInput.dispatchEvent(new dom.window.Event('input'));

    await waitForDomUpdates();

    const filteredNoteList = dom.window.document.getElementById('note-list');
    const noteCountSpan = dom.window.document.getElementById('note-count');
    expect(filteredNoteList.children).toHaveLength(1);
    expect(noteCountSpan.textContent).toBe('1 note');
  });

  async function addEventListenersToForm(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleFormSubmit(e);
    });
  }

  async function handleFormSubmit(e) {
    const form = e.target;
    const noteTitle = form.elements.note_title.value;
    const noteBody = form.elements.note_body.value;

    localStorage.setItem('notes', JSON.stringify([
      ...JSON.parse(localStorage.getItem('notes')),
      { id: JSON.parse(localStorage.getItem('notes')).length, title: noteTitle, body: noteBody, date: new Date().toISOString().split('T')[0] },
    ]));

    await renderNoteList();
  }

  async function waitForDomUpdates() {
    await new Promise((res) => {
      setTimeout(() => {
        res();
      }, 0);
    });
  }

  async function renderNoteList() {
    // render the note list here
}
