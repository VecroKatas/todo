document.addEventListener("DOMContentLoaded", loadTodos);

const textbox = document.getElementById('textbox');
const addButton = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const socket = new WebSocket('ws://localhost:3000');

textbox.addEventListener('keypress', e => {if (e.key === 'Enter') addTodo();});
addButton.addEventListener('click', addTodo);
todoList.addEventListener('dragstart', dragStart);
todoList.addEventListener('dragend', dragEnd);
todoList.addEventListener('dragover', dragOver);

function loadTodos() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos.forEach(todo => createTodoElement(todo));
}

function addTodo() {
    const text = textbox.value;
    if (text.trim() === "") return;

    const todoItem = {
        id: Date.now(),
        text: text
    };

    createTodoElement(todoItem);
    saveTodoLocalStorage(todoItem);

    socket.send(JSON.stringify({ action: 'add', todoItem }));
    textbox.value = '';
}

function createTodoElement(todoItem) {
    const li = document.createElement('li');
    li.setAttribute('data-id', todoItem.id);
    li.setAttribute('draggable', true);

    const text = document.createElement('div');
    text.textContent = todoItem.text;
    todoList.appendChild(li);
    li.appendChild(text);

    const done = document.createElement('button');
    done.textContent = '✓';
    li.appendChild(done);
    done.onclick = () => removeTodo(li);
}

function saveTodoLocalStorage(todoItem) {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos.push(todoItem);
    localStorage.setItem('todos', JSON.stringify(todos));
}

function removeTodoLocalStorage(id) {
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    todos = todos.filter(todo => todo.id !== parseInt(id));
    localStorage.setItem('todos', JSON.stringify(todos));
}

function removeTodo(li) {
    const id = li.getAttribute('data-id');
    li.remove();
    removeTodoLocalStorage(id);
    socket.send(JSON.stringify({ action: 'remove', id }));
}

function dragStart(e) {
    e.target.classList.add('dragging');
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    saveOrder();
}

function dragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(todoList, e.clientY);
    const dragging = document.querySelector('.dragging');
    const drid = dragging.getAttribute('data-id');
    const aeid = afterElement !== undefined ? afterElement.getAttribute('data-id') : null;
    insertDragging(drid, aeid);
    socket.send(JSON.stringify({ action: 'reorder', drid, aeid }));
}

function insertDragging(dragging, afterElement){
    if (afterElement == null) {
        todoList.appendChild(document.querySelector(`[data-id='${dragging}']`));
    } else {
        todoList.insertBefore(document.querySelector(`[data-id='${dragging}']`), document.querySelector(`[data-id='${afterElement}']`));
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveOrder() {
    const todos = [];
    todoList.querySelectorAll('li').forEach(item => {
        const id = parseInt(item.getAttribute('data-id'));
        const text = item.firstChild.textContent;
        todos.push({ id, text });
    });
    localStorage.setItem('todos', JSON.stringify(todos));
}

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.action === 'add') {
        createTodoElement(data.todoItem);
    } else if (data.action === 'remove') {
        const item = document.querySelector(`li[data-id='${data.id}']`);
        if (item) item.remove();
    } else if (data.action === 'reorder'){
        insertDragging(data.drid, data.aeid);
    }
};