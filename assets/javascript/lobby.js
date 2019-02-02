
class WordLinkStatusComponent extends React.Component {
    render() {
        if (this.props.good == null) {
            return <p className="message"></p>;
        }
        if (this.props.good == true) {
            return <p className="message good">That's it, let's go!</p>;
        }
        if (this.props.good == false) {
            return <p className="message bad">There was something wrong with your link :( Try again?</p>;
        }
    }
};


window.Lobby = React.createClass({
    propTypes: {
        gameSelected:   React.PropTypes.func,
        defaultGameID: React.PropTypes.string,
    },

    getInitialState: function() {
        return {
            newGameName: this.props.defaultGameID,
            selectedGame: null,
            newGameWordsLinkGood: null,
        };
    },

    newGameTextChange: function(e) {
        this.setState({newGameName: e.target.value});
    },

    newGameWordsLinkChange: function(e) {
        this.setState({newGameWordsLink: e.target.value});
    },

    handleNewGame: function(e) {
        e.preventDefault();
        if (!this.state.newGameName) {
            return;
        }

        this.setState({newGameWordsLinkGood: null});

        $.post(
            '/game/'+this.state.newGameName,
            {"newGameWordsLink": this.state.newGameWordsLink},
        ).done(function(game) {
            this.setState({
                newGameName: '',
                selectedGame: game,
                newGameWordsLinkGood: true,
                newGameWordsLink: '',
            });

            if (this.props.gameSelected) {
                this.props.gameSelected(game);
            }
        }.bind(this)).fail(function() {
            this.setState({newGameWordsLinkGood: false});
        }.bind(this));
    },

    render: function() {
        return (
            <div id="lobby">
                <div id="available-games">
                    <form id="new-game">
                        <p className="intro">
                           Play Trapwords online across multiple devices.
                           To create a new game or join an existing
                           game, enter a game identifier and click 'GO'.
                        </p>
                        <input type="text" id="game-name" autoFocus
                            onChange={this.newGameTextChange} value={this.state.newGameName} />
                        <button onClick={this.handleNewGame}>Go</button>
                        <p className ="intro">
                            You can use your own words using the field below. See <a href="https://github.com/banool/codenames-pictures#loading-up-words">the GitHub readme</a> for information about valid link options.
                        </p>
                        <input className="full" type="text" id="user-words" placeholder="Link to text file of words"
                            onChange={this.newGameWordsLinkChange} value={this.state.newGameWordsLink} />
                    </form>
                    <p>If you're joining a game that already exists, this field will be ignored. Have fun!!!</p>
                    <WordLinkStatusComponent good={this.state.newGameWordsLinkGood} />
                </div>
            </div>
        );
    }
});
