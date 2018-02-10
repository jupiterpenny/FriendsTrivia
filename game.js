var io;
var gameSocket;


exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', { message: "You are connected!" });

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('hostNextRound', hostNextRound);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerRestart', playerRestart);
}


function hostCreateNewGame() {

    var thisGameId = ( Math.random() * 100000 ) | 0;

    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});


    this.join(thisGameId.toString());


};


function hostPrepareGame(gameId) {
    var sock = this;
    var data = {
        mySocketId : sock.id,
        gameId : gameId
    };
    io.sockets.in(data.gameId).emit('beginNewGame', data);
}


function hostStartGame(gameId) {
    console.log('Game Started.');
    sendTrivia(0,gameId);
};

function hostNextRound(data) {
    if(data.round < TriviaPool.length ){
        sendTrivia(data.round, data.gameId);
    } else {
        io.sockets.in(data.gameId).emit('gameOver',data);
    }
}

function playerJoinGame(data) {
    var sock = this;
    var room = gameSocket.manager.rooms["/" + data.gameId];

    // If the room exists...
    if( room != undefined ){
        data.mySocketId = sock.id;
        sock.join(data.gameId);
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {

        this.emit('error',{message: "This room does not exist."} );
    }
}


function playerAnswer(data) {

    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}


function playerRestart(data) {

    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
}

function sendTrivia(TriviaPoolIndex, gameId) {
    var data = getTriviaData(TriviaPoolIndex);
    io.sockets.in(data.gameId).emit('newTriviaData', data);
}


function getTriviaData(i){

    var question = shuffle(TriviaPool[i].question);

    var answer = shuffle(TriviaPool[i].answers);


    var decoys = shuffle(TriviaPool[i].decoys).slice(0,5);


    var rnd = Math.floor(Math.random() * 5);
    decoys.splice(rnd, 0, answer[0]);


    var TriviaData = {
        round: i,
        Trivia : question[0],
        answer : answer[0],
        list : decoys
    };

    return TriviaData;
}


function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;


    while (0 !== currentIndex) {


        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


var TriviaPool = [
    {
        "question"  : [ "How many doctors have there been in the tv series Dr Who?"],
        "answers" : ["thirteen" ],
        "decoys" : [ "one", "seven", "fifteen", "Dr....Who?" ]
    },

    {
        "question"  : [ "What are the names of Batman's parents?"],
        "answers" : ["Thomas and Martha" ],
        "decoys" : [ "Wayne and Linda","Jack and Sally","John and Candice", "Tom and Melinda" ]
    },

    {
        "question"  : [ "What was the inspiration for Teenage Mutant Ninja Turtles?" ],
        "answers" : ["Daredevil"],
        "decoys" : [ "Power Rangers","Adolescent Radioactive Black Belt Hamsters","Fantastic Four","Geriatric Gangrene Jujitsu Gerbils" ]
    },

    {
        "question"  : [ "What is the name of the famous tycoon who wintered in Ormond Beach?" ],
        "answers" : ["Rockefellar"],
        "decoys" : [ "Kennedy","Bush","Steward","Winfrey" ]
    },

    {
        "question"  : [ "Who was one of the founders of NASCAR Daytona?" ],
        "answers" : ["Bill France"],
        "decoys" : [ "Dale Earnhardt", "George W. Bush", "Harley J. Earl", "Bobby Allison" ]
    },

    {
        "question"  : [ "What is the name of the oldest Floridian city?" ],
        "answers" : ["St. Augustine"],
        "decoys" : [ "Daytona Beach","Jacksonville","St. Petersburg","Ormond Beach" ]
    },

    {
        "question"  : [ "Which movie was partially filmed in Daytona Beach?" ],
        "answers" : ["Waterboy"],
        "decoys" : [ "Caddyshack","Ace Ventura","2Fast 2Furious","Edward Scissorhands" ]
    },

    {
        "question"  : [ "What movie said: When you realize you want to spend the rest of your life with somebody, you want the rest of your life to start soon as possible." ],
        "answers" : ["When Harry Met Sally"],
        "decoys" : [ "Casablanca","Breakfast At Tiffany's","Gone With the Wind","Roman Holiday" ]
    },

    {
        "question"  : [ "What movie said: Chewie, we're home."],
        "answers" : ["Star Wars Episode VII" ],
        "decoys" : [ "Star Wars Episode V","Star Wars Episode I","Star Wars Episode II","Star Trek" ]
    },

    {
        "question"  : [ "What movie said: They call it a Royale with cheese." ],
        "answers" : ["Pulp Fiction"],
        "decoys" : [ "Kill Bill", "Django Unchained", "Reservoir Dogs", "The Hateful Eight" ]
    }
]