;
jQuery(function($){
    'use strict';


    var IO = {

        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },


        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('newGameCreated', IO.onNewGameCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
            IO.socket.on('beginNewGame', IO.beginNewGame );
            IO.socket.on('newTriviaData', IO.onNewTriviaData);
            IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error );
        },


        onConnected : function() {
            App.mySocketId = IO.socket.socket.sessionid;
        },


        onNewGameCreated : function(data) {
            App.Host.gameInit(data);
        },


        playerJoinedRoom : function(data) {
            App[App.myRole].updateWaitingScreen(data);
        },


        beginNewGame : function(data) {
            App[App.myRole].gameCountdown(data);
        },


        onNewTriviaData : function(data) {
            App.currentRound = data.round;

            App[App.myRole].newTrivia(data);
        },


        hostCheckAnswer : function(data) {
            if(App.myRole === 'Host') {
                App.Host.checkAnswer(data);
            }
        },

        gameOver : function(data) {
            App[App.myRole].endGame(data);
        },


        error : function(data) {
            alert(data.message);
        }

    };


    var App = {

        gameId: 0,
        myRole: '',
        mySocketId: '',
        currentRound: 0,


        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            FastClick.attach(document.body);
        },


        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$hostGame = $('#host-game-template').html();
        },


        bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);

            // Player
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStart',App.Player.onPlayerStartClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);
        },


        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },


        Host : {

            players : [],
            isNewGame : false,
            numPlayersInRoom: 0,
            currentCorrectAnswer: '',

            onCreateClick: function () {
                IO.socket.emit('hostCreateNewGame');
            },


            gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.myRole = 'Host';
                App.Host.numPlayersInRoom = 0;

                App.Host.displayNewGameScreen();

            },


            displayNewGameScreen : function() {
                App.$gameArea.html(App.$templateNewGame);


                $('#gameURL').text(window.location.href);
                App.doTextFit('#gameURL');


                $('#spanNewGameCode').text(App.gameId);
            },


            updateWaitingScreen: function(data) {

                if ( App.Host.isNewGame ) {
                    App.Host.displayNewGameScreen();
                }

                $('#playersWaiting')
                    .append('<p/>')
                    .text('Player ' + data.playerName + ' joined the game.');


                App.Host.players.push(data);


                App.Host.numPlayersInRoom += 1;


                if (App.Host.numPlayersInRoom === 2) {
                    IO.socket.emit('hostRoomFull',App.gameId);

                }
            },


            gameCountdown : function() {


                App.$gameArea.html(App.$hostGame);
                App.doTextFit('#hostTrivia');


                var $secondsLeft = $('#hostTrivia');
                App.countDown( $secondsLeft, 5, function(){
                    IO.socket.emit('hostCountdownFinished', App.gameId);
                });


                $('#player1Score')
                    .find('.playerName')
                    .html(App.Host.players[0].playerName);

                $('#player2Score')
                    .find('.playerName')
                    .html(App.Host.players[1].playerName);


                $('#player1Score').find('.score').attr('id',App.Host.players[0].mySocketId);
                $('#player2Score').find('.score').attr('id',App.Host.players[1].mySocketId);
            },


            newTrivia : function(data) {

                $('#hostTrivia').text(data.Trivia);
                App.doTextFit('#hostTrivia');


                App.Host.currentCorrectAnswer = data.answer;
                App.Host.currentRound = data.round;
            },


            checkAnswer : function(data) {
                if (data.round === App.currentRound){


                    var $pScore = $('#' + data.playerId);


                    if( App.Host.currentCorrectAnswer === data.answer ) {
                        $pScore.text( +$pScore.text() + 5 );


                        App.currentRound += 1;


                        var data = {
                            gameId : App.gameId,
                            round : App.currentRound
                        }


                        IO.socket.emit('hostNextRound',data);

                    } else {

                        $pScore.text( +$pScore.text() - 3 );
                    }
                }
            },


            endGame : function(data) {


                var $p1 = $('#player1Score');
                var p1Score = +$p1.find('.score').text();
                var p1Name = $p1.find('.playerName').text();


                var $p2 = $('#player2Score');
                var  p2Score = +$p2.find('.score').text();
                var  p2Name = $p2.find('.playerName').text();


                var winner = (p1Score < p2Score) ? p2Name : p1Name;
                var tie = (p1Score === p2Score);


                if(tie){
                    $('#hostTrivia').text("It's a Tie!");
                } else {
                    $('#hostTrivia').text( winner + ' Wins!!' );
                }
                App.doTextFit('#hostTrivia');


                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;


                var i = 100;
                var random = Math.floor(new Date().getTime() / 1000 + i);
                var k = 'Users/';

                firebase.database().ref(k).set({
                    p1n: p1Name,
                    p1s: p1Score,
                    p2n: p2Name,
                    p2s: p2Score
                });
                i++;


            },


            restartGame : function() {
                App.$gameArea.html(App.$templateNewGame);
                $('#spanNewGameCode').text(App.gameId);
            }
        },

        Player : {
            hostSocketId: '',
            myName: '',
            onJoinClick: function () {
                App.$gameArea.html(App.$templateJoinGame);
            },

            onPlayerStartClick: function() {
                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val() || 'anon'
                };

                IO.socket.emit('playerJoinGame', data);

                App.myRole = 'Player';
                App.Player.myName = data.playerName;
            },

            onPlayerAnswerClick: function() {

                var $btn = $(this);
                var answer = $btn.val();


                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: answer,
                    round: App.currentRound
                }
                IO.socket.emit('playerAnswer',data);
            },

            onPlayerRestart : function() {
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.myName
                }
                IO.socket.emit('playerRestart',data);
                App.currentRound = 0;
                $('#gameArea').html("<h3>Waiting on host to start new game.</h3>");
            },


            updateWaitingScreen : function(data) {

                if(IO.socket.socket.sessionid === data.mySocketId){
                    App.myRole = 'Player';
                    App.gameId = data.gameId;

                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text('Joined Game ' + data.gameId + '. Please wait for game to begin.');
                }

            },


            gameCountdown : function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;
                $('#gameArea')
                    .html('<div class="gameOver">Get Ready!</div>');
            },



            // newTrivia : function(data) {
            //
            //
            //     var $list = $('<ul/>').attr('id','ulAnswers');
            //
            //
            //
            //     $.each(data.list, function(){
            //         $list
            //             .append( $('<li/>')
            //                 .append( $('<button/>')
            //                     .addClass('btnAnswer')
            //                     .addClass('btn')
            //                     .val(this)
            //                     .html(this)
            //                 )
            //             )
            //
            //     });
            //
            //
            //     $('#gameArea').html("<h1 class='centerIt'>" + data.Trivia + "</h1>");
            //     $('#gameArea').append($list);
            //
            //
            //
            //
            // },



            newTrivia : function(data) {
                // Create an unordered list element
                var $list = $('<ul/>').attr('id','ulAnswers');

                // Insert a list item for each word in the word list
                // received from the server.
                $.each(data.list, function(){
                    $list                                //  <ul> </ul>
                        .append( $('<li/>')              //  <ul> <li> </li> </ul>
                            .append( $('<button/>')      //  <ul> <li> <button> </button> </li> </ul>
                                .addClass('btnAnswer')   //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .addClass('btn')         //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .val(this)               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                                .html(this)              //  <ul> <li> <button class='btnAnswer' value='word'>word</button> </li> </ul>
                            )
                        )
                });

                // Insert the list onto the screen.
                $('#gameArea').html($list);
            },



            endGame : function() {
                var arr = [];
                var p1n = "";
                var p1s = "";
                var p2n = "";
                var p2s = "";
                $('#gameArea')
                    .html('<div class="gameOver">Game Over!</div>');
                    // .append(

                    //     $('<button>Start Again</button>')
                    //         .attr('id','btnPlayerRestart')
                    //         .addClass('btn')
                    //         .addClass('btnGameOver')
                    // );


                setTimeout(function(){
                    location.reload();
                }, 6000);
                var queried = firebase.database().ref("Users/").orderByChild('count').limitToLast(10).on("value", function(snapshot){
                    snapshot.forEach(function (childSnapshot) {
                        arr.push(childSnapshot.val());

                    });



                });

                setTimeout(function () {
                    $('#gameArea').append("<h1 class='centerIt'>" + arr[4] +":" + arr[5] + " " + arr[6] + ":" + arr[7] + "</h1>");
                    console.log(arr);

                    if(arr[5] > arr[7]){
                        $('#gameArea').append("<h1 class='centerIt'>" + arr[4] + " Wins!" + "</h1>");
                    } else  if(arr[7] > arr[5]){
                        $('#gameArea').append("<h1 class='centerIt'>" + arr[6] + " Wins!" + "</h1>");
                    } else {
                        $('#gameArea').append("<h1 class='centerIt'>" + "TIE!" + "</h1>");
                    }
                }, 3000);
            }

        },


        countDown : function( $el, startTime, callback) {

            $el.text(startTime);
            App.doTextFit('#hostTrivia');

            var timer = setInterval(countItDown,1000);

            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#hostTrivia');

                if( startTime <= 0 ){

                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        }

    };


    IO.init();
    App.init();

}($));
