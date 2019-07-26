let global = {
    connection: null,
    users: {}
}
let username = ""; //Local username
let input = ""; //Local Input
let room = "";
let random = false;
let scene = 0;

let cursor = 0; //Cursor position
let messages = []; //A history of all messages sent ever

let backgroundImage = new Image();
backgroundImage.src = "Earth.jpg";

class Message {
    constructor(type, sender, message) {
        this.type = type;
        this.sender = sender;
        this.message = message;
    }
}

function addMessage(type, sender, message) {
    messages.push(new Message(type, sender, message));
}
let sounds = [];
sounds[0] = new Audio("Join_Sound.wav");
sounds[1] = new Audio("Leave_Sound.wav");
sounds[2] = new Audio("Notification_Sound.wav");

let c = document.createElement("canvas");
let ctx = c.getContext("2d");
c.width = window.innerWidth;
c.height = window.innerHeight;
c.style.background = "#d4e7fa";
document.body.appendChild(c);

let scroll = 0;
let select = 0;

document.onkeydown = e => {
    if (!(e.keyCode < 48 || (e.keyCode > 91 && e.keyCode < 186)) || e.keyCode == "32") {
        let startString = input.substring(0, cursor + 1);
        let endString = input.substring(cursor + 1, input.length);
        input = startString + e.key + endString;
        cursor++;
    }

    if (e.key == "Backspace") {
        if (cursor != -1) {
            let startString = input.substring(0, cursor);
            let endString = input.substring(cursor + 1, input.length);
            input = startString + endString;
            cursor--;
        }

    }
    if (e.key == "ArrowLeft") cursor--;
    if (e.key == "ArrowRight") cursor++;
    cursor = Math.min(Math.max(cursor, -1), input.length - 1);
    if (e.key == "Enter" && input.length > 0) {
        addMessage("message", username, input);
        let text = input;
        input = "";
        if (scene == 3)
            global.connection.send('msg', text);
        if (scene == 2) {
            room = text;
            scene = 3;
            addMessage("notice", "", "Joining room " + room);
            Authenticate();
        }
        if (scene == 1) {
            if (text == "Y") {
                random = true;
                scene = 3;
                addMessage("notice", "", "Creating a random room to join.");
                Authenticate();
            } else if (text == "N") {
                scene = 2;
                Authenticate();
            } else {
                addMessage("error", "", "\"" + text + "\" is not a valid input.");
            }
        }
        if (scene == 0) {
            if (text.length < 15) {
                scene = 1;
                username = text;
                addMessage("notice", "", "Generate a random room (Y) or input a room (N)?");
            } else {
                addMessage("error", "", "Name was too long, enter a name smaller than 15 characters");
            }

        }

        cursor = 0;
    }
}

function Authenticate() {
    PlayerIO.authenticate("test-game-ue9bkyltk6wozndkbdwa", "public", {
        userId: username
    }, {}, function (client) {

        if (random) {
            room = Math.floor(Math.random() * 10000) + "";
            client.multiplayer.listRooms("Chat", {}, 0, 0, (rooms) => {
                let len = rooms.length;

                for (let i = 0; i < len; i++) {
                    if (rooms[i].id == room) {
                        room = Math.floor(Math.random() * 10000) + "";
                    }
                }

            });
            let roomTextLength = ctx.measureText(room).width;
            ctx.fillText(room, c.width - roomTextLength - 10, 50);
        } else if (scene == 2) {
            addMessage("notice", "", "Rooms:");
            client.multiplayer.listRooms("Chat", {}, 0, 0, (rooms) => {
                let len = rooms.length;

                for (let i = 0; i < len; i++) {
                    addMessage("message", "", rooms[i].id);
                }
                addMessage("notice", "", "Input room ID:");
            });
        }

        if (room != "")
            client.multiplayer.createJoinRoom(room, 'Chat', true, null, {
                name: username
            }, function (connection) {
                global.connection = connection
                addMessage('notice', '', 'connected to room');
                connection.addMessageCallback("*", function (message) {

                    switch (message.type) {
                        case "join":
                            handleJoin(message);
                            break;
                        case "left":
                            handleLeft(message);
                            break;
                        case "msg":
                            handleMsg(message);
                            break;
                    }

                });
                //Setup a disconnect handler:
                connection.addDisconnectCallback(function () {
                    addMessage("error", "", "disconnected from room");
                });
            }, callbackError)
    }, callbackError)
}

function callbackError(error) {
    addMessage("error", '', "ERROR: " + error.code + ": " + error.message);

}

function handleJoin(message) {
    sounds[0].play();
    var user = {
        id: message.getInt(0),
        name: message.getString(1),
    }
    global.users[user.id] = user
    addMessage("notice", '', user.name + " joined");

}

function handleLeft(message) {
    sounds[1].play();
    var user = global.users[message.getInt(0)]
    if (user != null) {
        delete global.users[user.id]
        addMessage("notice", '', user.name + " left");
    }

}

function handleMsg(message) {
    sounds[2].play();
    var user = global.users[message.getInt(0)]
    if (user != null && user.name != username) {
        addMessage("message", user.name, message.getString(1));
    }

}
ctx.font = "20px Arial";
ctx.fillStyle = "black";
addMessage("notice", "", "Input username:");

function Update() {
    ctx.drawImage(backgroundImage, 0, 0, c.width, c.height);
    ctx.clearRect(10, 10, 710, 490);
    ctx.strokeRect(10, 10, 710, 490);
    ctx.clearRect(10, c.height - 55, 710, 45);
    ctx.strokeRect(10, c.height - 55, 710, 45);
    ctx.clearRect(c.width - 350, 10, 340, 490);
    ctx.strokeRect(c.width - 350, 10, 340, 490);
    let textRow = 0;
    for (let message = scroll; message < Math.min(scroll + 20, messages.length); message++) {

        let type = messages[message].type;
        let name = messages[message].sender;
        let text = messages[message].message;
        let length = ctx.measureText(text).width;
        let lines = Math.ceil(length / 700);
        let texts = [];
        let totalLength = 0;
        for (let i = 0; i < lines; i++) {
            texts[i] = "";
            for (let j = 0; j < text.length; j++) {
                totalLength += ctx.measureText(text[j]).width;
                texts[i] += text[j];
                if (totalLength > 700) {
                    totalLength = 0;
                    let texty = text.split("");
                    texty.splice(0, j - 1)
                    text = texty.join("");
                    break;
                }
            }
        }


        if (type == "error") {
            ctx.fillStyle = "red";
        } else {
            ctx.fillStyle = "black";
        }
        ctx.font = "bold 20px Arial";
        if (type == "notice") {
            ctx.font = "italic " + ctx.font;
        }
        let len = ctx.measureText(name ? name + ": " : "").width;
        ctx.fillText(name ? name + ": " : "", 20, 30 * textRow + 30);
        ctx.font = "20px Arial"
        if (type == "notice") {
            ctx.font = "italic " + ctx.font;
        }
        ctx.fillText(texts[0], len + 20, 30 * textRow + 30);
        textRow++;
        if (textRow > 15) {
            let diff = 15 - textRow
            textRow = 15;
            scroll -= diff;
        }
        if (texts.length > 1) {
            texts.shift();
            addChatLine(type, "", texts.join(""));
        }
    }
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(input, 20, c.height - 25);
    let len = input.substring(0, cursor + 1);
    let width = ctx.measureText(len).width;
    ctx.fillRect(width + 20, c.height - 42, 1, 20);
    let users = Object.keys(global.users);
    let index = 0;
    for (let userbleh in global.users) {
        index++;
        let size = ctx.measureText(global.users[userbleh].name).width;
        ctx.fillText(global.users[userbleh].name, c.width - size - 30, 30 * index + 40);
    }
    let roomLength = ctx.measureText(room).width
    ctx.fillText(room, c.width - roomLength - 30, 40);
    requestAnimationFrame(Update);
}
Authenticate();
Update();